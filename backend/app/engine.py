"""Deterministic estimation engine (blueprint §11).

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
    rates: dict[str, Decimal] = field(default_factory=lambda: dict(ref.RATE_CARD))
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


def _timeline(ws: dict, inp: EstimationInput) -> dict:
    per_week = inp.policy["productive_hours_per_week"]
    both = "web" in inp.platforms and any(p in inp.platforms for p in ("android", "ios"))
    devs = 3 if both else 2
    discovery = max(1, math.ceil(float(ws["discovery"] + ws["design"] * D("0.6")) / (2 * per_week)))
    build = max(2, math.ceil(float(ws["frontend"] + ws["backend"] + ws["mobile"] + ws["integration"]) / (devs * per_week)))
    stabilise = max(1, math.ceil(float(ws["qa"] * D("0.35")) / per_week))
    release = 1
    return {"discovery": discovery, "build": build, "stabilise": stabilise, "release": release,
            "total": discovery + build + stabilise + release, "devs": devs}


def _cost(role_hours: dict[str, Decimal], weeks: int, contingency_pct: Decimal, inp: EstimationInput) -> dict:
    p = inp.policy
    c, m = p["commission_pct"], p["target_margin_pct"]
    if c + m >= 1:
        raise ValueError("Policy invalid: commission + margin must be below 100%")
    labour_lines = []
    for role, h in role_hours.items():
        if h <= 0:
            continue
        rate = inp.rates[role]
        labour_lines.append({"role": role, "role_name": ref.ROLES[role], "hours": hours(h), "rate": rate,
                             "cost": rupees(h * rate)})
    labour = sum((l["cost"] for l in labour_lines), ZERO)
    months = max(1, math.ceil(weeks / 4.33))
    build_infra = p["build_infra_per_month"] * months
    expenses = p["misc_expenses"] + build_infra
    internal = labour + expenses
    contingency = rupees(internal * contingency_pct)
    overhead = rupees(internal * p["overhead_pct"])
    base = internal + contingency + overhead
    price = rupees(base / (1 - c - m))
    commission = rupees(price * c)
    margin = price - base - commission
    gst = rupees(price * p["gst_pct"])
    return {
        "labour_lines": labour_lines, "direct_labour": labour, "misc_expenses": p["misc_expenses"],
        "build_infra": build_infra, "build_months": months, "expenses": expenses, "internal_cost": internal,
        "contingency_pct": contingency_pct, "contingency": contingency, "overhead_pct": p["overhead_pct"],
        "overhead": overhead, "base": base, "commission_pct": c, "commission": commission,
        "margin_pct": m, "margin": margin, "price_before_tax": price, "gst_pct": p["gst_pct"], "gst": gst,
        "price_with_tax": price + gst,
    }


def _core(features: list[dict], custom: list[CustomModule], inp: EstimationInput, multiplier: Decimal,
          contingency_pct: Decimal) -> dict:
    sub = EstimationInput(**{**inp.__dict__, "custom_modules": custom,
                             "feature_codes": [f["code"] for f in features]})
    lines = _feature_lines(features, sub)
    sc = _workstream_totals(lines, multiplier, sub, len(features) + len(custom))
    ws_rows = []
    for w, label in ref.WORKSTREAMS.items():
        lo, li, hi = sc["low"][w], sc["likely"][w], sc["high"][w]
        if lo == li == hi == 0:
            continue
        ws_rows.append({"workstream": w, "label": label, "role": ref.WORKSTREAM_ROLE[w],
                        "low": hours(lo), "likely": hours(li), "high": hours(hi), "expected": hours(_pert(lo, li, hi))})
    scen_ws = {
        "low": {r["workstream"]: r["low"] for r in ws_rows},
        "expected": {r["workstream"]: r["expected"] for r in ws_rows},
        "high": {r["workstream"]: r["high"] for r in ws_rows},
    }
    result = {"lines": lines, "workstreams": ws_rows, "hours": {}, "timeline": {}, "cost": {}}
    for s in SCENARIOS:
        ws = {w: scen_ws[s].get(w, ZERO) for w in ref.WORKSTREAMS}
        role_hours: dict[str, Decimal] = {r: ZERO for r in ref.ROLES}
        for w, h in ws.items():
            role_hours[ref.WORKSTREAM_ROLE[w]] += h
        tl = _timeline(ws, inp)
        result["hours"][s] = hours(sum(ws.values(), ZERO))
        result["timeline"][s] = tl
        result["cost"][s] = _cost(role_hours, tl["total"], contingency_pct, inp)
    return result


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

    # Catalogue share needs raw lines (before contingency) — compute once.
    raw_lines = _feature_lines(features, inp)
    cat_hours = sum((l["likely"] for l in raw_lines if l["source"] == "catalogue"), ZERO)
    all_hours = cat_hours + sum((l["likely"] for l in raw_lines if l["source"] == "custom"), ZERO)
    catalogue_share = (cat_hours / all_hours) if all_hours else D(1)
    confidence = assess_confidence(inp, catalogue_share)
    contingency_pct = p["contingency"][confidence["band"]]

    main = _core(features, inp.custom_modules, inp, mult, contingency_pct)
    step = p["client_rounding"]
    client_range = {s: round_to(main["cost"][s]["price_before_tax"], step) for s in SCENARIOS}

    # Tiers differ by SCOPE only (BR-10): each tier is a separate engine run.
    tier_defs = [
        ("basic", "Basic", [f for f in features if f["tier"] == "essential"], [],
         "Essential features only — fastest launch."),
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
        r = main if key == "standard" else _core(feats, custom, inp, mult, contingency_pct)
        tiers.append({
            "key": key, "name": name, "description": blurb, "recommended": key == "standard",
            "features": [{"code": f["code"], "name": f["name"], "tier": f["tier"],
                          "addon": f in addons} for f in feats] + [{"code": f"CUSTOM:{m.name}", "name": m.name,
                                                                   "tier": "custom", "addon": False} for m in custom],
            "hours_expected": r["hours"]["expected"],
            "weeks": r["timeline"]["expected"]["total"],
            "price": {s: round_to(r["cost"][s]["price_before_tax"], step) for s in SCENARIOS},
        })

    # Recurring & maintenance (BR-9: always separate from one-time price)
    users = inp.expected_users
    size = "M" if users is None else "S" if users < 5000 else "M" if users < 50000 else "L"
    cloud = ref.CLOUD_TEMPLATES[size]
    third_party = [{"item": code, "description": desc} for code, desc in ref.THIRD_PARTY.items()
                   if code in inp.feature_codes]
    maint_pct = p["maintenance_pct_per_year"]
    recurring = {
        "cloud": {"size": size, "label": cloud["label"], "assumed": users is None,
                  "monthly_low": cloud["low"], "monthly_high": cloud["high"],
                  "note": "Indicative; to be priced with the AWS/Azure/GCP calculator at quote time."},
        "third_party": third_party,
        "fixed": [{"item": i, "description": d} for i, d in ref.FIXED_ANNUAL]
                 + ([{"item": i, "description": d} for i, d in ref.APP_STORE]
                    if any(x in inp.platforms for x in ("android", "ios")) else []),
        "maintenance": {"pct": maint_pct, "annual_low": round_to(client_range["low"] * maint_pct, step),
                        "annual_high": round_to(client_range["high"] * maint_pct, step),
                        "note": "Annual maintenance & support (bug fixes, minor updates, monitoring)."},
    }

    # Timeline & milestones (expected scenario)
    tl = main["timeline"]["expected"]
    d_end = tl["discovery"]
    b_end = d_end + tl["build"]
    s_end = b_end + tl["stabilise"]
    end = s_end + tl["release"]
    pays = p["milestone_payments"]
    milestones = [
        {"name": "Requirements & design sign-off", "week": d_end, "payment_pct": pays[0]},
        {"name": "Mid-build demo", "week": d_end + max(1, tl["build"] // 2), "payment_pct": pays[1]},
        {"name": "UAT ready", "week": b_end, "payment_pct": pays[2]},
        {"name": "Go-live & handover", "week": end, "payment_pct": pays[3]},
    ]
    timeline = {
        "weeks": {s: main["timeline"][s]["total"] for s in SCENARIOS},
        "team": {"devs": tl["devs"], "hours_per_week": p["productive_hours_per_week"]},
        "phases": [
            {"name": "Discovery & design", "start": 0, "end": d_end},
            {"name": "Build", "start": d_end, "end": b_end},
            {"name": "QA & UAT", "start": b_end, "end": s_end},
            {"name": "Release & handover", "start": s_end, "end": end},
        ],
        "milestones": milestones,
        "client_dependencies": [
            "Timely feedback and sign-off at each milestone (within 3 working days)",
            "Content, logos, product/service data supplied by the client",
            "Third-party accounts (payment gateway, SMS/WhatsApp, app stores) opened in the client's name",
            "Test accounts and a named decision maker for UAT",
        ],
    }

    # Benchmark sanity check (C-10): benchmarks inform, never set the price.
    exp_cost = main["cost"]["expected"]
    implied = rupees(exp_cost["price_before_tax"] / main["hours"]["expected"]) if main["hours"]["expected"] else ZERO
    lo_b, hi_b = ref.BENCHMARK_HOURLY_BAND
    bench = {"implied_hourly": implied, "band_low": lo_b, "band_high": hi_b,
             "status": "within" if lo_b <= implied <= hi_b else "below" if implied < lo_b else "above",
             "source": "India freelance rate guide (2026), junior–senior band — proposal §4.2"}

    trace = _trace(main, complexity, confidence, contingency_pct, client_range, inp)

    return {
        "computed_at": computed_at,
        "versions": {"catalogue": ref.CATALOGUE_VERSION, "rate_card": ref.RATE_CARD_VERSION,
                     "policy": ref.POLICY_VERSION, "rules": ref.RULES_VERSION,
                     "market_data_date": ref.MARKET_DATA_DATE},
        "complexity": complexity,
        "confidence": {**confidence, "contingency_pct": contingency_pct},
        "effort": {
            "workstreams": main["workstreams"],
            "lines": [{**l, "low": hours(l["low"] * (mult if l["workstream"] in ref.BUILD_WORKSTREAMS else 1)),
                       "likely": hours(l["likely"] * (mult if l["workstream"] in ref.BUILD_WORKSTREAMS else 1)),
                       "high": hours(l["high"] * (mult if l["workstream"] in ref.BUILD_WORKSTREAMS else 1))}
                      for l in main["lines"]],
            "totals": main["hours"],
        },
        "cost": main["cost"],
        "client_range": client_range,
        "tiers": tiers,
        "recurring": recurring,
        "timeline": timeline,
        "benchmark": bench,
        "trace": trace,
    }


def _trace(main: dict, complexity: dict, confidence: dict, cpct: Decimal, client_range: dict,
           inp: EstimationInput) -> list[dict]:
    e = main["cost"]["expected"]
    t = []
    for w in main["workstreams"]:
        t.append({"id": f"hours.{w['workstream']}", "group": "Effort", "internal": False,
                  "label": f"{w['label']} hours (expected)",
                  "formula": "PERT: (low + 4 × likely + high) ÷ 6",
                  "value": f"{w['expected']} h",
                  "detail": f"low {w['low']} · likely {w['likely']} · high {w['high']}"})
    t.append({"id": "complexity", "group": "Effort", "internal": False,
              "label": "Complexity multiplier",
              "formula": "Σ factor scores → band → multiplier (applied once to build workstreams)",
              "value": f"× {complexity['multiplier']}",
              "detail": f"score {complexity['total']}/30 → {complexity['band']}"})
    for l in e["labour_lines"]:
        t.append({"id": f"labour.{l['role']}", "group": "Cost", "internal": True,
                  "label": f"{l['role_name']} cost", "formula": "hours × approved hourly rate",
                  "value": fmt_inr(l["cost"]),
                  "detail": f"{l['hours']} h × {fmt_inr(l['rate'])}/h · {ref.RATE_CARD_VERSION}"})
    rows = [
        ("labour", "Direct labour", "Σ (hours × rate) per role", e["direct_labour"], ""),
        ("expenses", "Project expenses", "misc + build infrastructure × months", e["expenses"],
         f"{fmt_inr(e['misc_expenses'])} + {fmt_inr(e['build_infra'])} ({e['build_months']} months)"),
        ("internal", "Internal project cost", "labour + expenses", e["internal_cost"], ""),
        ("contingency", "Contingency", "internal cost × contingency %", e["contingency"],
         f"{float(cpct) * 100:.0f}% because confidence is {confidence['band']} ({confidence['score']}/100)"),
        ("overhead", "Allocated overhead", "internal cost × overhead %", e["overhead"],
         f"{float(e['overhead_pct']) * 100:.0f}% · {ref.POLICY_VERSION}"),
        ("price", "Client price before tax", "(internal + contingency + overhead) ÷ (1 − commission − margin)",
         e["price_before_tax"],
         f"{fmt_inr(e['base'])} ÷ (1 − {e['commission_pct']} − {e['margin_pct']})"),
        ("commission", "Acquisition commission", "price × commission %", e["commission"],
         f"{float(e['commission_pct']) * 100:.0f}% of price · basis: {inp.policy['commission_basis']}"),
        ("margin", "Gross margin", "price − base − commission", e["margin"],
         f"target {float(e['margin_pct']) * 100:.0f}%"),
        ("gst", "GST (shown separately)", "price × GST %", e["gst"], f"{float(e['gst_pct']) * 100:.0f}%"),
    ]
    for key, label, formula, value, detail in rows:
        t.append({"id": f"cost.{key}", "group": "Cost", "internal": True, "label": label,
                  "formula": formula, "value": fmt_inr(value), "detail": detail})
    t.append({"id": "client.range", "group": "Client", "internal": False, "label": "Client-facing range",
              "formula": f"low / expected / high price rounded to nearest {fmt_inr(inp.policy['client_rounding'])}",
              "value": f"{fmt_inr(client_range['low'])} – {fmt_inr(client_range['high'])}",
              "detail": f"expected {fmt_inr(client_range['expected'])}"})
    return t
