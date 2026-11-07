from decimal import Decimal as D

import pytest

from app import engine as eng
from app import reference_data as ref


def _policy(**over):
    p = dict(ref.POLICY)
    p.update(over)
    return p


def test_proposal_worked_example_golden():
    """Proposal §5.5: cost ₹2,10,000, commission 10% of invoice, margin 20% -> invoice ₹3,00,000."""
    inp = eng.EstimationInput(category="business", platforms=["web"],
                              rates={**ref.RATE_CARD, "BA": D("1000")},
                              policy=_policy(misc_expenses=D("0"), build_infra_per_month=D("0"),
                                             overhead_pct=D("0")))
    c = eng._cost({"BA": D("210")}, weeks=8, contingency_pct=D("0"), inp=inp)
    assert c["internal_cost"] == D("210000")
    assert c["price_before_tax"] == D("300000")
    assert c["commission"] == D("30000")
    assert c["margin"] == D("60000")


def test_policy_guard_commission_plus_margin():
    inp = eng.EstimationInput(category="business", platforms=["web"],
                              policy=_policy(commission_pct=D("0.5"), target_margin_pct=D("0.5")))
    with pytest.raises(ValueError):
        eng._cost({"BA": D("10")}, 4, D("0"), inp)


def _run(**kw):
    base = dict(category="booking", platforms=["web", "android"],
                feature_codes=["AUTH", "ADMIN", "PROVIDERS", "AVAILABILITY", "BOOKING", "NOTIF", "PAY"],
                input_groups={g["key"]: "PROVIDED" for g in ref.INPUT_GROUPS}, verification_ratio=1.0,
                expected_users=2000)
    base.update(kw)
    return eng.estimate(eng.EstimationInput(**base), computed_at="2026-11-07T00:00:00Z")


def test_ranges_are_ordered():
    r = _run()
    cr = r["client_range"]
    assert cr["low"] <= cr["expected"] <= cr["high"]
    t = r["effort"]["totals"]
    assert t["low"] <= t["expected"] <= t["high"]
    for w in r["effort"]["workstreams"]:
        assert w["low"] <= w["expected"] <= w["high"]


def test_more_scope_never_cheaper():
    small = _run(feature_codes=["AUTH", "BOOKING"])
    large = _run(feature_codes=["AUTH", "BOOKING", "PAY", "NOTIF", "REPORTS"])
    assert large["client_range"]["expected"] > small["client_range"]["expected"]


def test_tiers_nested_and_monotonic():
    r = _run(addon_codes=["WAITLIST", "CHAT"])
    prices = {t["key"]: t["price"]["expected"] for t in r["tiers"]}
    assert prices["basic"] <= prices["standard"] <= prices["premium"]


def test_complexity_multiplier_applied_once_and_increases_price():
    low = _run(complexity={})
    high = _run(complexity={f["key"]: 3 for f in ref.COMPLEXITY_FACTORS})
    assert high["complexity"]["band"] == "Very High"
    assert high["client_range"]["expected"] > low["client_range"]["expected"]


def test_low_confidence_raises_contingency():
    firm = _run()
    vague = _run(input_groups={}, verification_ratio=0.0, unknown_factors=["scale", "compliance", "legacy"])
    assert firm["confidence"]["band"] == "High"
    assert vague["confidence"]["band"] == "Low"
    assert vague["confidence"]["contingency_pct"] > firm["confidence"]["contingency_pct"]


def test_recurring_costs_do_not_change_one_time_price():
    a = _run(expected_users=1000)
    b = _run(expected_users=900_000)
    assert a["recurring"]["cloud"]["size"] == "S" and b["recurring"]["cloud"]["size"] == "L"
    assert a["cost"]["expected"]["price_before_tax"] == b["cost"]["expected"]["price_before_tax"]


def test_admin_features_have_no_mobile_hours_on_mobile_only_projects():
    r = _run(platforms=["android"])
    admin_lines = [l for l in r["effort"]["lines"] if l["code"] == "ADMIN"]
    assert admin_lines and all(l["workstream"] != "mobile" for l in admin_lines)


def test_deterministic_replay():
    assert _run()["client_range"] == _run()["client_range"]


def test_inr_formatting():
    assert eng.fmt_inr(D("210000")) == "₹2,10,000"
    assert eng.fmt_inr(D("12345678")) == "₹1,23,45,678"
    assert eng.fmt_inr(D("999")) == "₹999"
