"""Application services: orchestrate intelligence + engine, versioning, approvals and role views."""

from __future__ import annotations

import math
import re
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException

from . import engine as eng
from . import intelligence as ai
from . import reference_data as ref
from .db import EstimateRecord, Session, utcnow

# ---------------------------------------------------------------- demo personas & permissions
ROLES = {
    "sales": {"name": "Sales", "internal": False, "edit_scope": False, "approve": None},
    "ba": {"name": "Business Analyst", "internal": False, "edit_scope": True, "approve": None},
    "techlead": {"name": "Tech Lead", "internal": False, "edit_scope": True, "approve": "technical"},
    "finance": {"name": "Finance", "internal": True, "edit_scope": True, "approve": "commercial"},
    "admin": {"name": "Administrator", "internal": False, "edit_scope": False, "approve": None},
}


def role_or_403(role: str) -> dict:
    if role not in ROLES:
        raise HTTPException(status_code=403, detail="Unknown role")
    return ROLES[role]


def jsonable(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, dict):
        return {k: jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [jsonable(v) for v in obj]
    return obj


# ---------------------------------------------------------------- compute
def _compute(rec: EstimateRecord) -> None:
    intake = dict(rec.intake)
    analysis = rec.analysis
    answers = rec.answers or {}
    scope = rec.scope
    ev = ai.evaluate_inputs(intake, analysis, answers)       # may fill expected_users from answers
    scores, unknown = ai.suggest_complexity(scope["feature_codes"], intake, ev["input_groups"],
                                            analysis["items"], rec.category, answers)
    overrides = scope.get("complexity_overrides") or {}
    scores.update({k: int(v) for k, v in overrides.items()})
    unknown = [u for u in unknown if u not in overrides]
    inp = eng.EstimationInput(
        category=rec.category,
        platforms=intake["platforms"],
        mobile_approach=intake.get("mobile_approach") or "cross_platform",
        feature_codes=scope["feature_codes"],
        addon_codes=scope.get("addon_codes", []),
        custom_modules=[eng.CustomModule(m["name"], Decimal(str(m["hours"]))) for m in scope.get("custom_modules", [])],
        complexity=scores,
        unknown_factors=unknown,
        input_groups={k: v["status"] for k, v in ev["input_groups"].items()},
        verification_ratio=analysis.get("verification_ratio"),
        expected_users=intake.get("expected_users"),
    )
    result = eng.estimate(inp, computed_at=utcnow().isoformat())
    # A static website only needs to know what the business is and which pages it wants;
    # scale, integrations, deadlines etc. become optional questions rather than blockers.
    static_only = set(scope["feature_codes"]) <= {"STATIC_SITE"} and not scope.get("custom_modules")
    critical_keys = ({"business_context", "platform", "features"} if static_only
                     else {g["key"] for g in ref.INPUT_GROUPS if g["critical"]})
    for q in ev["questions"]:
        q["critical"] = q["critical"] and q["group"] in critical_keys
    result["input_groups"] = ev["input_groups"]
    result["questions"] = ev["questions"]
    result["complexity"]["overridden"] = list(overrides.keys())
    result["commercial_flags"] = _commercial_flags(intake, result)
    result["assumptions"] = _assumptions(intake, analysis, result, scope)
    result["exclusions"] = [
        "GST and other applicable taxes (shown separately)",
        "Third-party usage fees (payment gateway, SMS/WhatsApp, maps, hosting) — billed at actuals",
        "App store developer accounts and fees (client-owned accounts)",
        "Content creation, copywriting, photography and data entry",
        "Data migration beyond the scope listed above",
        "Support and maintenance after the warranty period (quoted separately)",
    ]
    rec.intake = intake
    rec.result = jsonable(result)
    # Proceed-with-assumptions is allowed; only block when evidence is genuinely thin.
    critical_missing = [k for k in critical_keys if result["input_groups"][k]["status"] == "MISSING"]
    thin = result["confidence"]["band"] == "Low" or len(critical_missing) >= 2
    rec.status = "NEEDS_CLARIFICATION" if thin else "ESTIMATED"


def _working_days_until(target: str | None) -> float | None:
    if not target:
        return None
    try:
        d = date.fromisoformat(target)
    except ValueError:
        return None
    return (d - datetime.now(timezone.utc).date()).days * 5 / 7


def _commercial_flags(intake: dict, result: dict) -> list[dict]:
    flags = []
    days = result["timeline"]["days"]["expected"]
    available = _working_days_until(intake.get("target_launch"))
    source = "requested launch date"
    if available is None:
        m = ai.TIME_RE.search(intake["brief"])
        if m:
            n = int(m.group(1))
            available = n * (22 if m.group(2).lower().startswith("month") else 5)
            source = f"“{m.group(0)}” in the brief"
    if available is not None and days > available:
        flags.append({"kind": "timeline", "severity": "critical",
                      "description": f"Delivery needs about {days} working days (expected), but the {source} allows "
                                     f"about {math.floor(available)}. Consider launching the Basic package first."})
    if result["band"]["capped"]:
        flags.append({"kind": "cap", "severity": "warning",
                      "description": f"The full scope prices above the ₹1,00,000 SMB limit "
                                     f"({eng.fmt_inr(Decimal(str(result['band']['uncapped'])))} before the cap). "
                                     f"The quote is held at ₹1,00,000 — consider a phased launch or trimming scope."})
    budget = intake.get("budget_max")
    low = Decimal(str(result["client_range"]["low"]))
    if budget and Decimal(str(budget)) < low:
        flags.append({"kind": "budget", "severity": "critical",
                      "description": f"Client budget {eng.fmt_inr(Decimal(str(budget)))} is below the low end of the "
                                     f"estimate ({eng.fmt_inr(low)}). Review scope or offer the Basic package."})
    return flags


def _assumptions(intake: dict, analysis: dict, result: dict, scope: dict) -> list[dict]:
    out = []
    for it in analysis["items"]:
        if it["basis"] == "INFERRED" and it["feature_code"] in scope["feature_codes"]:
            out.append({"text": f"{it['statement']} is included ({it['inference_reason']})", "source": "inferred"})
    g = result["input_groups"]
    if g["scale"]["status"] != "PROVIDED":
        out.append({"text": "Scale assumed small (under 5,000 users) for hosting", "source": "default"})
    if g["operations"]["status"] != "PROVIDED":
        out.append({"text": "Hosted on affordable cloud / shared hosting set up by FFA in the client's account",
                    "source": "default"})
    if g["data_migration"]["status"] != "PROVIDED":
        out.append({"text": "No data migration from existing systems", "source": "default"})
    if g["security_compliance"]["status"] != "PROVIDED":
        out.append({"text": "Standard security practices; no industry-specific compliance certification",
                    "source": "default"})
    mobile = [p for p in intake["platforms"] if p in ("android", "ios")]
    if mobile:
        approach = intake.get("mobile_approach") or "cross_platform"
        out.append({"text": ("A single cross-platform codebase (Flutter / React Native) for "
                             if approach == "cross_platform" else "Separate native apps for ")
                            + " and ".join(p.capitalize() if p == "android" else "iOS" for p in mobile),
                    "source": "default"})
    out.append({"text": "Client provides content, test accounts and timely approvals (within 3 working days)",
                "source": "default"})
    return out


def _snapshot(rec: EstimateRecord, by: str, reason: str) -> None:
    r = rec.result
    rec.history = [*(rec.history or []), {
        "version": rec.version, "at": utcnow().isoformat(), "by": by, "reason": reason,
        "expected": r["client_range"]["expected"], "low": r["client_range"]["low"], "high": r["client_range"]["high"],
        "confidence": r["confidence"]["score"],
    }]


def _audit(rec: EstimateRecord, by: str, action: str, detail: str = "") -> None:
    rec.audit = [*(rec.audit or []), {"at": utcnow().isoformat(), "by": by, "action": action, "detail": detail}]


# ---------------------------------------------------------------- use cases
def create(db: Session, intake: dict, role: str) -> EstimateRecord:
    analysis = ai.analyze(intake)
    if not intake.get("expected_users") and analysis.get("detected_users"):
        intake["expected_users"] = analysis["detected_users"]
    title = intake.get("title") or f"{ref.CATEGORY_NAMES[intake['category']]} estimate"
    rec = EstimateRecord(
        title=title, client_name=intake.get("client_name") or "", category=intake["category"], status="DRAFT",
        version=1, created_by=role, intake=intake, analysis=analysis, answers={},
        scope={"feature_codes": analysis["feature_codes"], "addon_codes": analysis["addon_codes"],
               "custom_modules": [], "complexity_overrides": {}},
        result={}, approvals=[], history=[], audit=[],
    )
    _compute(rec)
    _snapshot(rec, role, "Initial estimate")
    _audit(rec, role, "created", f"AI mode: {analysis['mode']}")
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def _revise(db: Session, rec: EstimateRecord, role: str, reason: str) -> EstimateRecord:
    had_approvals = bool(rec.approvals)
    rec.version += 1
    rec.approvals = []
    _compute(rec)
    _snapshot(rec, role, reason)
    _audit(rec, role, "revised", reason + (" · approvals reset" if had_approvals else ""))
    db.commit()
    db.refresh(rec)
    return rec


def update_scope(db: Session, rec: EstimateRecord, role: str, body: dict) -> EstimateRecord:
    if not ROLES[role]["edit_scope"]:
        raise HTTPException(status_code=403, detail="Your role cannot edit scope")
    idx = ref.feature_index(rec.category)
    codes = [c for c in body.get("feature_codes", []) if c in idx]
    if not codes and not body.get("custom_modules"):
        raise HTTPException(status_code=422, detail="Scope must contain at least one feature or custom module")
    overrides = body.get("complexity_overrides") or {}
    valid_factors = {f["key"] for f in ref.COMPLEXITY_FACTORS}
    if any(k not in valid_factors or not 0 <= int(v) <= 3 for k, v in overrides.items()):
        raise HTTPException(status_code=422, detail="Complexity overrides must be known factors scored 0–3")
    if overrides and role not in ("techlead", "finance"):
        raise HTTPException(status_code=403, detail="Only the Tech Lead can override complexity")
    rec.scope = {
        "feature_codes": codes,
        "addon_codes": [c for c in body.get("addon_codes", rec.scope.get("addon_codes", [])) if c in idx],
        "custom_modules": [{"name": m["name"].strip()[:80], "hours": float(m["hours"])}
                           for m in body.get("custom_modules", []) if m.get("name") and 0 < float(m["hours"]) <= 2000],
        "complexity_overrides": {k: int(v) for k, v in overrides.items()},
    }
    if body.get("mobile_approach") in ("cross_platform", "native"):
        rec.intake = {**rec.intake, "mobile_approach": body["mobile_approach"]}
    return _revise(db, rec, role, body.get("reason") or "Scope updated")


def upgrade_legacy_estimates() -> int:
    """Re-price estimates created under an older pricing model as a NEW version (audited; approvals reset).

    Run once at start-up, before the web workers start (see docker-entrypoint.sh) — never per request.
    """
    from sqlalchemy import select

    from .db import SessionLocal

    n = 0
    with SessionLocal() as db:
        for rec in db.scalars(select(EstimateRecord)).all():
            if (rec.result or {}).get("versions", {}).get("rules") == ref.RULES_VERSION:
                continue
            # Re-run extraction rules too, so e.g. static-site detection applies to old briefs.
            rec.analysis = ai.analyze(dict(rec.intake))
            rec.scope = {**rec.scope, "feature_codes": rec.analysis["feature_codes"],
                         "addon_codes": rec.analysis["addon_codes"]}
            _revise(db, rec, "system", f"Re-priced with the {ref.POLICY['pricing_model']} model ({ref.RULES_VERSION})")
            n += 1
    return n


def answer_questions(db: Session, rec: EstimateRecord, role: str, answers: dict) -> EstimateRecord:
    clean = {k: v.strip()[:1000] for k, v in answers.items() if isinstance(v, str) and v.strip()}
    rec.answers = {**(rec.answers or {}), **clean}
    return _revise(db, rec, role, f"{len(clean)} clarification answer(s) recorded")


def approve(db: Session, rec: EstimateRecord, role: str, body: dict) -> EstimateRecord:
    kind = ROLES[role]["approve"]
    if kind is None or body.get("type") != kind:
        raise HTTPException(status_code=403, detail="Your role cannot give this approval")
    decision = body.get("decision")
    if decision not in ("approve", "request_changes"):
        raise HTTPException(status_code=422, detail="decision must be approve or request_changes")
    if kind == "commercial" and not any(a["type"] == "technical" and a["decision"] == "approve" for a in rec.approvals):
        raise HTTPException(status_code=409, detail="Technical approval is required first")
    entry = {"type": kind, "decision": decision, "by": ROLES[role]["name"], "comment": body.get("comment", "")[:500],
             "at": utcnow().isoformat(), "version": rec.version}
    if decision == "request_changes":
        rec.approvals = []
        rec.status = "CHANGES_REQUESTED"
    else:
        rec.approvals = [*[a for a in rec.approvals if a["type"] != kind], entry]
        rec.status = "APPROVED" if kind == "commercial" else "TECH_APPROVED"
    _audit(rec, role, f"{kind} {decision}", entry["comment"])
    db.commit()
    db.refresh(rec)
    return rec


# ---------------------------------------------------------------- role-shaped views (field-level security)
def view(rec: EstimateRecord, role: str) -> dict:
    internal = ROLES[role]["internal"]
    r = dict(rec.result)
    if not internal:
        r.pop("cost", None)
        r["band"] = {k: v for k, v in r.get("band", {}).items() if k != "uncapped"}
        r["trace"] = [t for t in r.get("trace", []) if not t["internal"]]
        r["confidence"] = {k: v for k, v in r["confidence"].items() if k != "contingency_pct"}
    analysis = dict(rec.analysis)
    if role != "finance" and role != "admin":
        analysis.pop("usage", None)
    return {
        "id": rec.id, "ref": f"EST-{rec.id:04d}", "title": rec.title, "client_name": rec.client_name,
        "category": rec.category, "category_name": ref.CATEGORY_NAMES[rec.category], "status": rec.status,
        "version": rec.version, "created_by": ROLES.get(rec.created_by, {}).get("name", rec.created_by),
        "created_at": rec.created_at.isoformat(), "updated_at": rec.updated_at.isoformat(),
        "intake": rec.intake, "analysis": analysis, "answers": rec.answers, "scope": rec.scope, "result": r,
        "approvals": rec.approvals, "history": rec.history, "audit": rec.audit,
        "validity_days": ref.POLICY["validity_days"], "view": "internal" if internal else "client",
        "permissions": {"edit_scope": ROLES[role]["edit_scope"], "approve": ROLES[role]["approve"],
                        "internal": internal},
    }


def summary(rec: EstimateRecord) -> dict:
    r = rec.result
    return {"id": rec.id, "ref": f"EST-{rec.id:04d}", "title": rec.title, "client_name": rec.client_name,
            "category": rec.category, "category_name": ref.CATEGORY_NAMES[rec.category], "status": rec.status,
            "version": rec.version, "updated_at": rec.updated_at.isoformat(),
            "client_range": r["client_range"], "confidence": r["confidence"]["score"],
            "confidence_band": r["confidence"]["band"], "days": r["timeline"]["days"]["expected"],
            "ai_mode": rec.analysis.get("mode")}


def parse_page_text(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text).strip()
