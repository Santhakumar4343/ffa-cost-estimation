"""Engine tests for the SMB · AI-accelerated pricing model (₹5,000 – ₹1,00,000 band)."""

import itertools
from decimal import Decimal as D

from app import engine as eng
from app import reference_data as ref

MIN, MAX, STEP = ref.POLICY["min_project_price"], ref.POLICY["max_project_price"], ref.POLICY["price_rounding"]


def _run(**kw):
    base = dict(category="booking", platforms=["web", "android"],
                feature_codes=["AUTH", "ADMIN", "PROVIDERS", "AVAILABILITY", "BOOKING", "NOTIF", "PAY"],
                input_groups={g["key"]: "PROVIDED" for g in ref.INPUT_GROUPS}, verification_ratio=1.0,
                expected_users=2000)
    base.update(kw)
    return eng.estimate(eng.EstimationInput(**base), computed_at="2026-11-08T00:00:00Z")


def _prices(r):
    yield from r["client_range"].values()
    for t in r["tiers"]:
        yield from t["price"].values()


def test_static_page_is_5000():
    r = _run(category="business", platforms=["web"], feature_codes=["STATIC_SITE"])
    assert r["client_range"]["expected"] == D("5000")
    assert r["timeline"]["days"]["expected"] <= 5


def test_every_price_is_whole_rupees_inside_band():
    feats = [f["code"] for f in ref.catalogue_for("ecommerce")]
    for n, plats, approach in itertools.product((1, 3, 6, 10, len(feats)),
                                               (["web"], ["android"], ["web", "android", "ios"]),
                                               ("cross_platform", "native")):
        r = _run(category="ecommerce", platforms=plats, mobile_approach=approach, feature_codes=feats[:n])
        for price in _prices(r):
            assert MIN <= price <= MAX
            assert price % STEP == 0 and price == price.to_integral_value()


def test_large_scope_is_capped_at_one_lakh_and_flagged():
    feats = [f["code"] for f in ref.catalogue_for("food")]
    r = _run(category="food", platforms=["web", "android", "ios"], mobile_approach="native", feature_codes=feats,
             input_groups={}, verification_ratio=0.0)
    assert r["client_range"]["high"] == MAX
    assert r["cost"]["high"]["capped"] and r["cost"]["high"]["uncapped_price"] > MAX


def test_ranges_are_ordered():
    r = _run()
    cr = r["client_range"]
    assert cr["low"] <= cr["expected"] <= cr["high"]
    t = r["effort"]["totals"]
    assert t["low"] <= t["expected"] <= t["high"]


def test_more_scope_never_cheaper():
    small = _run(feature_codes=["AUTH", "BOOKING"])
    large = _run(feature_codes=["AUTH", "BOOKING", "PAY", "NOTIF", "REPORTS"])
    assert large["client_range"]["expected"] > small["client_range"]["expected"]


def test_tiers_nested_and_monotonic():
    r = _run(addon_codes=["WAITLIST", "CHAT"])
    prices = {t["key"]: t["price"]["expected"] for t in r["tiers"]}
    assert prices["basic"] <= prices["standard"] <= prices["premium"]


def test_low_confidence_adds_contingency():
    firm = _run()
    vague = _run(input_groups={}, verification_ratio=0.0, unknown_factors=["scale", "compliance", "legacy"])
    assert vague["confidence"]["contingency_pct"] > firm["confidence"]["contingency_pct"]
    assert vague["client_range"]["expected"] >= firm["client_range"]["expected"]


def test_margin_reconciles():
    for s in ("low", "expected", "high"):
        c = _run()["cost"][s]
        assert c["price_before_tax"] - c["internal_cost"] - c["commission"] == c["margin"]
        assert c["gst"] == (c["price_before_tax"] * D("0.18")).quantize(D("1"))


def test_payment_plan_sums_to_100_percent():
    for codes in (["STATIC_SITE"], ["AUTH", "ADMIN", "PROVIDERS", "AVAILABILITY", "BOOKING", "NOTIF", "PAY",
                                    "RESCHEDULE", "STAFF_CAL", "REPORTS"]):
        r = _run(feature_codes=codes)
        assert sum(m["payment_pct"] for m in r["timeline"]["milestones"]) == 1


def test_recurring_costs_do_not_change_one_time_price():
    a = _run(expected_users=1000)
    b = _run(expected_users=900_000)
    assert a["recurring"]["cloud"]["size"] == "S" and b["recurring"]["cloud"]["size"] == "L"
    assert a["client_range"] == b["client_range"]


def test_admin_features_have_no_mobile_hours_on_mobile_only_projects():
    r = _run(platforms=["android"])
    sub = eng.EstimationInput(category="booking", platforms=["android"], feature_codes=["ADMIN"])
    lines = eng._feature_lines([ref.feature_index("booking")["ADMIN"]], sub)
    assert lines and all(l["workstream"] != "mobile" for l in lines)
    assert r["effort"]["totals"]["expected"] > 0


def test_deterministic_replay():
    assert _run()["client_range"] == _run()["client_range"]


def test_inr_formatting():
    assert eng.fmt_inr(D("210000")) == "₹2,10,000"
    assert eng.fmt_inr(D("100000")) == "₹1,00,000"
    assert eng.fmt_inr(D("5000")) == "₹5,000"
