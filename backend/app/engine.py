"""Deterministic estimation engine (blueprint §11) — SMB · AI-accelerated pricing model.

Pure functions only: no I/O, no AI, no clock reads except the caller-supplied timestamp.
All money is Decimal. The LLM never supplies a number to this module.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from . import reference_data as ref

D = Decimal
ZERO = D("0")
SCENARIOS = ("low", "expected", "high")


def rupees(x: Decimal) -> Decimal:
    return x.quantize(D("1"), rounding=ROUND_HALF_UP)


def hours(x: Decimal) -> Decimal:
    return x.quantize(D("0.1"), rounding=ROUND_HALF_UP)


def round_to(x: Decimal, step: Decimal) -> Decimal:
    return (x / step).quantize(D("1"), rounding=ROUND_HALF_UP) * step


def fmt_inr(x: Decimal) -> str:
    """Indian digit grouping: 210000 -> ₹2,10,000."""
    n = int(rupees(x))
    sign = "-" if n < 0 else ""
    s = str(abs(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        s = ",".join(groups) + "," + tail
    return f"{sign}₹{s}"


# ---------------------------------------------------------------- inputs
@dataclass
class CustomModule:
    name: str
    hours: Decimal  # likely total hours entered by BA/TL


@dataclass
class EstimationInput:
    category: str
    platforms: list[str]                       # subset of web, android, ios
    mobile_approach: str = "cross_platform"    # cross_platform | native
    feature_codes: list[str] = field(default_factory=list)
    addon_codes: list[str] = field(default_factory=list)   # Premium-only suggestions
    custom_modules: list[CustomModule] = field(default_factory=list)
    complexity: dict[str, int] = field(default_factory=dict)       # factor -> 0..3
    unknown_factors: list[str] = field(default_factory=list)
    input_groups: dict[str, str] = field(default_factory=dict)      # group -> PROVIDED|PARTIAL|MISSING
    verification_ratio: float | None = None                         # verified explicit / explicit
    expected_users: int | None = None
    policy: dict = field(default_factory=lambda: dict(ref.POLICY))


# ---------------------------------------------------------------- effort
def _platform_factor(feature: dict, ws: str, platforms: list[str], approach: str, policy: dict) -> Decimal:
    has_web = "web" in platforms
    mobile_count = sum(1 for p in ("android", "ios") if p in platforms)
    is_admin = bool(feature.get("admin"))
    if ws == "frontend":
        return D(1) if (has_web or is_admin) else ZERO
    if ws == "mobile":
        if is_admin or mobile_count == 0:
            return ZERO
        if approach == "native" and mobile_count == 2:
            return policy["native_dual_platform_factor"]
        return D(1)
    if ws == "design" and has_web and mobile_count and not is_admin:
        return policy["multi_platform_design_factor"]
    return D(1)


def _feature_lines(features: list[dict], inp: EstimationInput) -> list[dict]:
    lines = []
    for f in features:
        for ws, (lo, li, hi) in f["hours"].items():
            k = _platform_factor(f, ws, inp.platforms, inp.mobile_approach, inp.policy)
            if k == 0:
                continue
            low, likely, high = D(lo) * k, D(li) * k, D(hi) * k
            lines.append({
                "source": "catalogue", "code": f["code"], "name": f["name"], "module": f["module"],
                "workstream": ws, "low": low, "likely": likely, "high": high,
            })
    has_web = "web" in inp.platforms
    has_mobile = any(p in inp.platforms for p in ("android", "ios"))
    for m in inp.custom_modules:
        split = {"design": D("0.10"), "backend": D("0.45")}
        if has_web:
            split["frontend"] = D("0.45")
        if has_mobile:
            split["mobile"] = D("0.45")
        for ws, share in split.items():
            li = m.hours * share
            lines.append({
                "source": "custom", "code": f"CUSTOM:{m.name}", "name": m.name, "module": "Custom",
                "workstream": ws, "low": li * D("0.8"), "likely": li, "high": li * D("1.6"),
            })
    return lines


def assess_complexity(inp: EstimationInput) -> dict:
    total = sum(max(0, min(3, int(inp.complexity.get(f["key"], 0)))) for f in ref.COMPLEXITY_FACTORS)
    for max_score, band, mult in ref.COMPLEXITY_BANDS:
        if total <= max_score:
            break
    reasons = [
        f"{f['name']}: {inp.complexity.get(f['key'], 0)}/3"
        for f in ref.COMPLEXITY_FACTORS if inp.complexity.get(f["key"], 0) >= 2
    ]
    return {
        "factors": [
            {"key": f["key"], "name": f["name"], "score": int(inp.complexity.get(f["key"], 0)),
             "unknown": f["key"] in inp.unknown_factors}
            for f in ref.COMPLEXITY_FACTORS
        ],
        "total": total, "max": 30, "band": band, "multiplier": mult, "reasons": reasons,
    }


def assess_confidence(inp: EstimationInput, catalogue_share: Decimal) -> dict:
    critical = [g for g in ref.INPUT_GROUPS if g["critical"]]
    score_map = {"PROVIDED": 1.0, "PARTIAL": 0.5, "MISSING": 0.0}
    completeness = sum(score_map.get(inp.input_groups.get(g["key"], "MISSING"), 0) for g in critical) / len(critical)
    # No explicit, verifiable requirement at all means no evidence: score 0, not "neutral".
    verification = inp.verification_ratio if inp.verification_ratio is not None else 0.0
    certainty = 1 - len(inp.unknown_factors) / len(ref.COMPLEXITY_FACTORS)
    comps = [
        {"key": "completeness", "label": "Input completeness", "weight": 40, "value": completeness,
         "detail": f"{sum(1 for g in critical if inp.input_groups.get(g['key']) == 'PROVIDED')} of {len(critical)} critical input groups provided"},
        {"key": "coverage", "label": "Catalogue coverage", "weight": 25, "value": float(catalogue_share),
         "detail": f"{float(catalogue_share) * 100:.0f}% of build hours from reviewed catalogue features"},
        {"key": "verification", "label": "Source verification", "weight": 15, "value": verification,
         "detail": "Share of explicit requirements whose quote was found in the source"},
        {"key": "certainty", "label": "Complexity certainty", "weight": 20, "value": certainty,
         "detail": f"{len(inp.unknown_factors)} of {len(ref.COMPLEXITY_FACTORS)} complexity factors unknown"},
    ]
    score = round(sum(c["weight"] * c["value"] for c in comps))
    band = "High" if score >= 75 else "Medium" if score >= 50 else "Low"
    return {"score": score, "band": band, "components": comps}


def _workstream_totals(lines: list[dict], multiplier: Decimal, inp: EstimationInput, item_count: int) -> dict:
    """Return {scenario: {workstream: hours}} for low/likely/high, before PERT."""
    p = inp.policy
    has_sensitive = any(ref.feature_index(inp.category).get(c, {}).get("sensitive") for c in inp.feature_codes)
    groups = int("web" in inp.platforms) + int(any(x in inp.platforms for x in ("android", "ios")))
    out = {}
    for sc, k in (("low", D("0.8")), ("likely", D("1")), ("high", D("1.3"))):
        key = "likely" if sc == "likely" else sc
        ws = {w: ZERO for w in ref.WORKSTREAMS}
        for ln in lines:
            ws[ln["workstream"]] += ln[key]
        for w in ref.BUILD_WORKSTREAMS:
            ws[w] *= multiplier
        build = ws["frontend"] + ws["backend"] + ws["mobile"] + ws["integration"]
        ws["discovery"] = (p["discovery_base_hours"] + p["discovery_hours_per_item"] * item_count) * k
        ws["qa"] = build * p["qa_pct_of_build"]
        ws["devops"] = (p["devops_base_hours"] + p["devops_hours_per_platform_group"] * groups) * k
        ws["security"] = (p["security_base_hours"] + (p["security_sensitive_hours"] if has_sensitive else ZERO)) * k
        ws["pm"] = sum(v for w, v in ws.items() if w != "pm") * p["pm_pct_of_total"]
        out[sc] = ws
    return out


def _pert(lo: Decimal, li: Decimal, hi: Decimal) -> Decimal:
    return (lo + 4 * li + hi) / 6

# ---------------------------------------------------------------- SMB · AI-accelerated pricing
def _ai_hours(traditional: Decimal, p: dict) -> Decimal:
    return traditional * p["ai_productivity_factor"]


def _smb_price(billable_hours: Decimal, p: dict) -> tuple[Decimal, Decimal, bool]:
    """Return (client price, uncapped price, capped?) — whole rupees, rounded, inside the SMB band."""
    uncapped = billable_hours * p["price_per_ai_hour"]
    clamped = min(max(uncapped, p["min_project_price"]), p["max_project_price"])
    price = round_to(clamped, p["price_rounding"])
    price = min(max(price, p["min_project_price"]), p["max_project_price"])
    return price, rupees(uncapped), uncapped > p["max_project_price"]


def _cost(ai_hours: Decimal, contingency_pct: Decimal, inp: EstimationInput) -> dict:
    p = inp.policy
    contingency_hours = ai_hours * contingency_pct
    billable = ai_hours + contingency_hours
    price, uncapped, capped = _smb_price(billable, p)
    internal = rupees(billable * p["internal_cost_per_ai_hour"]) + p["ai_tooling_per_project"]
    commission = rupees(price * p["commission_pct"])
    margin = price - internal - commission
    gst = rupees(price * p["gst_pct"])
    return {
        "ai_hours": hours(ai_hours), "contingency_pct": contingency_pct, "contingency_hours": hours(contingency_hours),
        "billable_hours": hours(billable), "price_per_ai_hour": p["price_per_ai_hour"],
        "uncapped_price": uncapped, "capped": capped, "floored": uncapped < p["min_project_price"],
        "delivery_cost": rupees(billable * p["internal_cost_per_ai_hour"]),
        "internal_cost_per_ai_hour": p["internal_cost_per_ai_hour"], "ai_tooling": p["ai_tooling_per_project"],
        "internal_cost": internal, "commission_pct": p["commission_pct"], "commission": commission,
        "margin": margin, "margin_pct": (margin / price).quantize(D("0.001")) if price else ZERO,
        "price_before_tax": price, "gst_pct": p["gst_pct"], "gst": gst, "price_with_tax": price + gst,
    }


def _timeline(billable: Decimal, p: dict) -> dict:
    """Working days for AI-accelerated delivery (client review time included)."""
    build = max(1, math.ceil(billable / p["ai_hours_per_day"]))
    discovery = 1
    review = 1 if billable <= 5 else 2
    launch = 1
    return {"discovery": discovery, "build": build, "review": review, "launch": launch,
            "total": discovery + build + review + launch}


def _core(features: list[dict], custom: list[CustomModule], inp: EstimationInput, multiplier: Decimal,
          contingency_pct: Decimal) -> dict:
    p = inp.policy
    sub = EstimationInput(**{**inp.__dict__, "custom_modules": custom,
                             "feature_codes": [f["code"] for f in features]})
    lines = _feature_lines(features, sub)
    sc = _workstream_totals(lines, multiplier, sub, len(features) + len(custom))
    ws_rows = []
    for w, label in ref.WORKSTREAMS.items():
        lo, li, hi = sc["low"][w], sc["likely"][w], sc["high"][w]
        if lo == li == hi == 0:
            continue
        exp = _pert(lo, li, hi)
        ws_rows.append({"workstream": w, "label": label, "role": ref.WORKSTREAM_ROLE[w],
                        "traditional": hours(exp),
                        "low": hours(_ai_hours(lo, p)), "likely": hours(_ai_hours(li, p)),
                        "high": hours(_ai_hours(hi, p)), "expected": hours(_ai_hours(exp, p))})
    traditional = {
        "low": sum((sc["low"][w] for w in ref.WORKSTREAMS), ZERO),
        "expected": sum((_pert(sc["low"][w], sc["likely"][w], sc["high"][w]) for w in ref.WORKSTREAMS), ZERO),
        "high": sum((sc["high"][w] for w in ref.WORKSTREAMS), ZERO),
    }
    result = {"lines": lines, "workstreams": ws_rows, "traditional": {s: hours(v) for s, v in traditional.items()},
              "hours": {}, "timeline": {}, "cost": {}}
    for s in SCENARIOS:
        ai = _ai_hours(traditional[s], p)
        cost = _cost(ai, contingency_pct, inp)
        result["hours"][s] = hours(ai)
        result["cost"][s] = cost
        result["timeline"][s] = _timeline(cost["billable_hours"], p)
    return result


def _payment_plan(price: Decimal, days: dict, p: dict) -> list[dict]:
    end = days["total"]
    if price >= p["staged_payment_threshold"]:
        return [
            {"name": "Advance — project kick-off", "day": 0, "payment_pct": D("0.40")},
            {"name": "Working demo for review", "day": days["discovery"] + days["build"], "payment_pct": D("0.30")},
            {"name": "Go-live & handover", "day": end, "payment_pct": D("0.30")},
        ]
    return [
        {"name": "Advance — project kick-off", "day": 0, "payment_pct": D("0.50")},
        {"name": "Go-live & handover", "day": end, "payment_pct": D("0.50")},
    ]


# ---------------------------------------------------------------- public API
def estimate(inp: EstimationInput, computed_at: str) -> dict:
    if not inp.platforms:
        raise ValueError("At least one platform is required")
    idx = ref.feature_index(inp.category)
    features = [idx[c] for c in inp.feature_codes if c in idx]
    addons = [idx[c] for c in inp.addon_codes if c in idx and c not in inp.feature_codes]
    p = inp.policy

    complexity = assess_complexity(inp)
    mult = complexity["multiplier"]

    raw_lines = _feature_lines(features, inp)
    cat_hours = sum((l["likely"] for l in raw_lines if l["source"] == "catalogue"), ZERO)
    all_hours = cat_hours + sum((l["likely"] for l in raw_lines if l["source"] == "custom"), ZERO)
    catalogue_share = (cat_hours / all_hours) if all_hours else D(1)
    confidence = assess_confidence(inp, catalogue_share)
    contingency_pct = p["contingency"][confidence["band"]]

    main = _core(features, inp.custom_modules, inp, mult, contingency_pct)
    client_range = {s: main["cost"][s]["price_before_tax"] for s in SCENARIOS}

    # Tiers differ by SCOPE only (BR-10): each tier is a separate engine run, inside the same SMB band.
    tier_defs = [
        ("basic", "Basic", [f for f in features if f["tier"] == "essential"], [],
         "Essential features only — fastest, lowest cost launch."),
        ("standard", "Standard", features, inp.custom_modules, "Everything requested in the brief. Recommended."),
        ("premium", "Premium", features + addons, inp.custom_modules,
         "Standard plus suggested advanced features."),
    ]
    tiers = []
    for key, name, feats, custom, blurb in tier_defs:
        if not feats and not custom:
            continue
        if key == "premium" and not addons:
            continue
        if key == "basic" and len(feats) == len(features) and not inp.custom_modules:
            continue  # Basic would be identical to Standard
        r = main if key == "standard" else _core(feats, custom, inp, mult, contingency_pct)
        tiers.append({
            "key": key, "name": name, "description": blurb, "recommended": key == "standard",
            "features": [{"code": f["code"], "name": f["name"], "tier": f["tier"],
                          "addon": f in addons} for f in feats] + [{"code": f"CUSTOM:{m.name}", "name": m.name,
                                                                   "tier": "custom", "addon": False} for m in custom],
            "hours_expected": r["cost"]["expected"]["billable_hours"],
            "days": r["timeline"]["expected"]["total"],
            "capped": r["cost"]["expected"]["capped"],
            "price": {s: r["cost"][s]["price_before_tax"] for s in SCENARIOS},
        })

    # Recurring & maintenance (BR-9: always separate from one-time price)
    users = inp.expected_users
    static_only = bool(features) and all(f["code"] in ("STATIC_SITE", "CMS") for f in features) and not inp.custom_modules
    size = "XS" if static_only else "S" if users is None or users < 5000 else "M" if users < 50000 else "L"
    cloud = ref.CLOUD_TEMPLATES[size]
    third_party = [{"item": code, "description": desc} for code, desc in ref.THIRD_PARTY.items()
                   if code in inp.feature_codes]
    maint_pct = p["maintenance_pct_per_year"]
    step = p["price_rounding"]
    recurring = {
        "cloud": {"size": size, "label": cloud["label"], "assumed": users is None and not static_only,
                  "monthly_low": cloud["low"], "monthly_high": cloud["high"],
                  "note": "Indicative hosting for small businesses; confirmed at quote time."},
        "third_party": third_party,
        "fixed": [{"item": i, "description": d} for i, d in ref.FIXED_ANNUAL]
                 + ([{"item": i, "description": d} for i, d in ref.APP_STORE]
                    if any(x in inp.platforms for x in ("android", "ios")) else []),
        "maintenance": {"pct": maint_pct, "annual_low": round_to(client_range["low"] * maint_pct, step),
                        "annual_high": round_to(client_range["high"] * maint_pct, step),
                        "note": "Annual maintenance & support (bug fixes, minor updates, monitoring)."},
    }

    # Timeline (working days) & payment plan
    tl = main["timeline"]["expected"]
    d_end = tl["discovery"]
    b_end = d_end + tl["build"]
    r_end = b_end + tl["review"]
    end = r_end + tl["launch"]
    timeline = {
        "unit": "days",
        "days": {s: main["timeline"][s]["total"] for s in SCENARIOS},
        "team": {"ai_hours_per_day": p["ai_hours_per_day"]},
        "phases": [
            {"name": "Requirements & design", "start": 0, "end": d_end},
            {"name": "AI-assisted build", "start": d_end, "end": b_end},
            {"name": "Client review & fixes", "start": b_end, "end": r_end},
            {"name": "Launch & handover", "start": r_end, "end": end},
        ],
        "milestones": _payment_plan(client_range["expected"], tl, p),
        "client_dependencies": [
            "Quick feedback on the demo (within 1–2 working days)",
            "Logo, photos, text and product/service details supplied by the client",
            "Domain, hosting and third-party accounts (payment gateway, WhatsApp, app stores) in the client's name",
            "One named decision maker for approvals",
        ],
    }

    e = main["cost"]["expected"]
    band = {
        "min": p["min_project_price"], "max": p["max_project_price"], "price": e["price_before_tax"],
        "price_per_ai_hour": p["price_per_ai_hour"], "rounding": p["price_rounding"],
        "uncapped": e["uncapped_price"], "capped": e["capped"], "floored": e["floored"],
        "position": float((e["price_before_tax"] - p["min_project_price"])
                          / (p["max_project_price"] - p["min_project_price"])),
        "note": "SMB & startup band (AP / Telangana market): ₹5,000 – ₹1,00,000",
    }

    trace = _trace(main, complexity, confidence, contingency_pct, client_range, inp)

    return {
        "computed_at": computed_at,
        "pricing_model": p["pricing_model"],
        "versions": {"catalogue": ref.CATALOGUE_VERSION, "policy": ref.POLICY_VERSION, "rules": ref.RULES_VERSION,
                     "market_data_date": ref.MARKET_DATA_DATE},
        "complexity": complexity,
        "confidence": {**confidence, "contingency_pct": contingency_pct},
        "effort": {
            "unit": "ai_hours",
            "ai_factor": p["ai_productivity_factor"],
            "workstreams": main["workstreams"],
            "totals": main["hours"],
            "billable": {s: main["cost"][s]["billable_hours"] for s in SCENARIOS},
            "traditional": main["traditional"],
        },
        "cost": main["cost"],
        "client_range": client_range,
        "band": band,
        "tiers": tiers,
        "recurring": recurring,
        "timeline": timeline,
        "trace": trace,
    }


def _trace(main: dict, complexity: dict, confidence: dict, cpct: Decimal, client_range: dict,
           inp: EstimationInput) -> list[dict]:
    p = inp.policy
    e = main["cost"]["expected"]
    t = [
        {"id": "hours.traditional", "group": "Effort", "internal": False, "label": "Traditional-equivalent effort",
         "formula": "Σ catalogue hours per workstream (PERT), after platform & complexity adjustments",
         "value": f"{main['traditional']['expected']} h",
         "detail": f"low {main['traditional']['low']} · high {main['traditional']['high']}"},
        {"id": "complexity", "group": "Effort", "internal": False, "label": "Complexity multiplier",
         "formula": "Σ factor scores → band → multiplier (applied once to build workstreams)",
         "value": f"× {complexity['multiplier']}", "detail": f"score {complexity['total']}/30 → {complexity['band']}"},
        {"id": "hours.ai", "group": "Effort", "internal": False, "label": "AI-assisted delivery hours",
         "formula": "traditional hours × AI productivity factor",
         "value": f"{e['ai_hours']} h", "detail": f"factor {p['ai_productivity_factor']} · {p['pricing_model']}"},
        {"id": "hours.billable", "group": "Effort", "internal": False, "label": "Billable hours",
         "formula": "AI-assisted hours × (1 + contingency %)",
         "value": f"{e['billable_hours']} h",
         "detail": f"{float(cpct) * 100:.0f}% contingency because confidence is {confidence['band']} ({confidence['score']}/100)"},
        {"id": "price.raw", "group": "Price", "internal": False, "label": "Price before band rules",
         "formula": "billable hours × price per AI-assisted hour",
         "value": fmt_inr(e["uncapped_price"]), "detail": f"{e['billable_hours']} h × {fmt_inr(p['price_per_ai_hour'])}"},
        {"id": "price.band", "group": "Price", "internal": False, "label": "Client price (expected)",
         "formula": f"keep within {fmt_inr(p['min_project_price'])} – {fmt_inr(p['max_project_price'])}, round to {fmt_inr(p['price_rounding'])}",
         "value": fmt_inr(e["price_before_tax"]),
         "detail": ("capped at the ₹1,00,000 SMB limit — consider a phased launch" if e["capped"]
                    else "raised to the ₹5,000 minimum" if e["floored"] else "within the SMB band")},
        {"id": "client.range", "group": "Price", "internal": False, "label": "Client-facing range",
         "formula": "low / expected / high hours priced with the same rules",
         "value": f"{fmt_inr(client_range['low'])} – {fmt_inr(client_range['high'])}",
         "detail": f"expected {fmt_inr(client_range['expected'])}"},
        {"id": "cost.delivery", "group": "Internal", "internal": True, "label": "Delivery cost",
         "formula": "billable hours × internal cost per AI-assisted hour + AI tooling",
         "value": fmt_inr(e["internal_cost"]),
         "detail": f"{e['billable_hours']} h × {fmt_inr(e['internal_cost_per_ai_hour'])} + {fmt_inr(e['ai_tooling'])}"},
        {"id": "cost.commission", "group": "Internal", "internal": True, "label": "Acquisition commission",
         "formula": "price × commission %", "value": fmt_inr(e["commission"]),
         "detail": f"{float(e['commission_pct']) * 100:.0f}% · basis: {p['commission_basis']}"},
        {"id": "cost.margin", "group": "Internal", "internal": True, "label": "Gross margin",
         "formula": "price − delivery cost − commission", "value": fmt_inr(e["margin"]),
         "detail": f"{float(e['margin_pct']) * 100:.0f}% of price"},
        {"id": "cost.gst", "group": "Internal", "internal": True, "label": "GST (shown separately)",
         "formula": "price × GST %", "value": fmt_inr(e["gst"]), "detail": f"{float(e['gst_pct']) * 100:.0f}%"},
    ]
    return t
