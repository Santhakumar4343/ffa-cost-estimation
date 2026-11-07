"""Versioned reference data for the MVP demo.

IMPORTANT: every hour figure, rate and policy percentage in this file is a DEMO PLACEHOLDER.
In the full build these live in versioned DB tables maintained by BA/Tech Lead (catalogue) and
Finance (rate card, policy), with source and effective date on every value (proposal §7.1, §7.3).
Benchmark figures are the ones published in the proposal (§4.2) and are labelled with their source.
"""

from decimal import Decimal as D

CATALOGUE_VERSION = "CAT-2026.11-demo"
RATE_CARD_VERSION = "RC-2026.11-demo"
POLICY_VERSION = "POL-2026.11-demo"
RULES_VERSION = "RULES-0.1"
MARKET_DATA_DATE = "2026-11-07"

# ---------------------------------------------------------------- categories
CATEGORIES = [
    {"key": "business", "name": "Business / Service", "icon": "briefcase",
     "description": "Business profile, services, enquiries, customer records, staff, reports."},
    {"key": "ecommerce", "name": "E-commerce", "icon": "shopping-cart",
     "description": "Product catalogue, cart, checkout, payments, orders, inventory, delivery."},
    {"key": "food", "name": "Food Delivery", "icon": "utensils",
     "description": "Restaurants, menus, ordering, delivery assignment, tracking, offers."},
    {"key": "education", "name": "Education", "icon": "graduation-cap",
     "description": "Courses, batches, learners, content, assessments, attendance, fees."},
    {"key": "booking", "name": "Booking / Appointment", "icon": "calendar-check",
     "description": "Providers, availability, slot booking, reschedule, reminders, staff calendar."},
]
CATEGORY_NAMES = {c["key"]: c["name"] for c in CATEGORIES}

# ---------------------------------------------------------------- workstreams & roles
WORKSTREAMS = {
    "discovery": "Discovery / BA",
    "design": "UX / UI design",
    "frontend": "Frontend (web)",
    "backend": "Backend / APIs",
    "mobile": "Mobile app",
    "integration": "Integrations",
    "qa": "QA / testing",
    "devops": "DevOps / cloud",
    "security": "Security",
    "pm": "Delivery management",
}
BUILD_WORKSTREAMS = ["design", "frontend", "backend", "mobile", "integration"]

ROLES = {
    "BA": "Business Analyst",
    "UX": "UI/UX Designer",
    "FE": "Frontend Developer",
    "BE": "Backend Developer",
    "MOB": "Mobile Developer",
    "QA": "QA Engineer",
    "DEVOPS": "DevOps Engineer",
    "TL": "Team Lead / PM",
}
WORKSTREAM_ROLE = {
    "discovery": "BA", "design": "UX", "frontend": "FE", "backend": "BE", "mobile": "MOB",
    "integration": "BE", "qa": "QA", "devops": "DEVOPS", "security": "BE", "pm": "TL",
}

# Internal cost rates — DEMO PLACEHOLDERS. Finance maintains fully-loaded MONTHLY cost per role
# (proposal §5.5 uses monthly-style figures, e.g. Developer ₹60,000); the engine converts to hourly
# using productive hours per month (blueprint M-1 / Q-6).
PRODUCTIVE_HOURS_PER_MONTH = D("160")
RATE_CARD_MONTHLY = {
    "BA": D("45000"), "UX": D("40000"), "FE": D("50000"), "BE": D("60000"),
    "MOB": D("60000"), "QA": D("35000"), "DEVOPS": D("55000"), "TL": D("90000"),
}
RATE_CARD = {k: (v / PRODUCTIVE_HOURS_PER_MONTH).quantize(D("1")) for k, v in RATE_CARD_MONTHLY.items()}

# ---------------------------------------------------------------- commercial policy (Finance)
POLICY = {
    "overhead_pct": D("0.10"),
    "commission_pct": D("0.10"),          # share of client price (basis to be confirmed: Q-1)
    "commission_basis": "Invoice value (to be confirmed by Finance)",
    "target_margin_pct": D("0.20"),
    "contingency": {"High": D("0.12"), "Medium": D("0.20"), "Low": D("0.30")},
    "gst_pct": D("0.18"),                 # shown separately, never inside the price (Q-8)
    "misc_expenses": D("5000"),
    "build_infra_per_month": D("3000"),
    "productive_hours_per_week": 30,
    "validity_days": 30,
    "client_rounding": D("1000"),
    "maintenance_pct_per_year": D("0.15"),
    "milestone_payments": [D("0.20"), D("0.30"), D("0.30"), D("0.20")],
    # cross-cutting effort rules
    "qa_pct_of_build": D("0.22"),
    "pm_pct_of_total": D("0.10"),
    "discovery_base_hours": D("16"),
    "discovery_hours_per_item": D("3"),
    "devops_base_hours": D("24"),
    "devops_hours_per_platform_group": D("12"),
    "security_base_hours": D("8"),
    "security_sensitive_hours": D("16"),
    "native_dual_platform_factor": D("1.8"),
    "multi_platform_design_factor": D("1.4"),
}

# ---------------------------------------------------------------- complexity model (proposal §5.4)
COMPLEXITY_FACTORS = [
    {"key": "user_roles", "name": "User roles"},
    {"key": "workflows", "name": "Workflows"},
    {"key": "integrations", "name": "Integrations"},
    {"key": "data_migration", "name": "Data migration"},
    {"key": "realtime", "name": "Real-time behaviour"},
    {"key": "security", "name": "Security"},
    {"key": "scale", "name": "Scale"},
    {"key": "compliance", "name": "Compliance"},
    {"key": "platforms", "name": "Platform count"},
    {"key": "legacy", "name": "Legacy constraints"},
]
COMPLEXITY_BANDS = [  # (max total score, band, effort multiplier) — reviewed table, applied ONCE
    (6, "Low", D("1.00")),
    (12, "Medium", D("1.10")),
    (18, "High", D("1.20")),
    (30, "Very High", D("1.35")),
]

# ---------------------------------------------------------------- input groups (proposal §3.1)
INPUT_GROUPS = [
    {"key": "business_context", "name": "Business context", "critical": True},
    {"key": "platform", "name": "Platform", "critical": True},
    {"key": "features", "name": "Features", "critical": True},
    {"key": "scale", "name": "Scale", "critical": True},
    {"key": "integrations", "name": "Integrations", "critical": True},
    {"key": "data_migration", "name": "Data & migration", "critical": False},
    {"key": "security_compliance", "name": "Security & compliance", "critical": False},
    {"key": "operations", "name": "Operations & hosting", "critical": False},
    {"key": "delivery_constraints", "name": "Delivery constraints", "critical": True},
]

QUESTION_BANK = {
    "business_context": "What business problem should the application solve, and how will you measure success?",
    "platform": "Which platforms are required — responsive web, Android, iOS, or a combination? Is an admin web portal needed?",
    "features": "Which key features must be available at launch, and which can wait for a later release?",
    "scale": "How many registered users and how many concurrent users do you expect in the first year?",
    "integrations": "Which third-party services must be integrated (payment gateway, SMS/WhatsApp, email, maps, ERP/CRM, accounting)?",
    "data_migration": "Is there existing data or a legacy system that must be migrated? Roughly how many records?",
    "security_compliance": "Will the system store personal or sensitive data? Are there audit, retention or industry compliance obligations?",
    "operations": "Do you have a hosting preference (AWS/Azure/GCP, region)? What uptime and support hours do you expect?",
    "delivery_constraints": "Is there a fixed launch date or budget? Who will provide content, test accounts and approvals?",
}

# ---------------------------------------------------------------- feature catalogue
def _h(**likely: float) -> dict:
    """Effort range per workstream from a 'likely' figure: low = 0.8x, high = 1.5x (demo rule)."""
    return {ws: [round(v * 0.8), round(v), round(v * 1.5)] for ws, v in likely.items()}


COMMON_FEATURES = [
    dict(code="AUTH", name="User registration & login (OTP / email)", module="Accounts", tier="essential",
         keywords=["login", "log in", "sign up", "signup", "register", "registration", "otp", "account"],
         hours=_h(design=6, frontend=16, backend=20, mobile=18)),
    dict(code="PROFILE", name="User profile management", module="Accounts", tier="essential",
         keywords=["profile", "my account"], hours=_h(design=4, frontend=10, backend=8, mobile=10)),
    dict(code="ADMIN", name="Admin dashboard (web)", module="Administration", tier="essential", admin=True,
         keywords=["admin", "dashboard", "back office", "backoffice", "manage"],
         hours=_h(design=10, frontend=40, backend=30)),
    dict(code="RBAC", name="Staff roles & permissions", module="Administration", tier="recommended", admin=True,
         keywords=["roles", "staff", "permission", "employees", "team members"],
         hours=_h(frontend=12, backend=20)),
    dict(code="NOTIF", name="Notifications (email / SMS / WhatsApp / push)", module="Engagement", tier="recommended",
         keywords=["notification", "notify", "sms", "email", "whatsapp", "push", "reminder", "alert"],
         hours=_h(frontend=6, backend=16, mobile=10, integration=12)),
    dict(code="PAY", name="Online payments (gateway integration)", module="Payments", tier="essential", sensitive=True,
         keywords=["payment", "pay online", "razorpay", "upi", "gateway", "card", "stripe", "payu", "fees"],
         hours=_h(frontend=10, backend=24, mobile=12, integration=24)),
    dict(code="REPORTS", name="Reports & analytics", module="Reporting", tier="recommended", admin=True,
         keywords=["report", "analytics", "insights", "export", "statistics"],
         hours=_h(design=6, frontend=20, backend=24)),
    dict(code="SEARCH", name="Search & filters", module="Discovery", tier="recommended",
         keywords=["search", "filter"], hours=_h(frontend=10, backend=12, mobile=10)),
    dict(code="CHAT", name="In-app chat / support messaging", module="Engagement", tier="advanced", realtime=True,
         keywords=["chat", "messaging", "live support"],
         hours=_h(design=6, frontend=20, backend=28, mobile=20, integration=8)),
    dict(code="MAPS", name="Maps & location", module="Location", tier="advanced",
         keywords=["map", "location", "gps", "nearby", "directions"],
         hours=_h(frontend=10, backend=10, mobile=14, integration=16)),
    dict(code="CMS", name="Content pages / CMS", module="Content", tier="essential",
         keywords=["about us", "content", "blog", "landing page", "cms", "website"],
         hours=_h(design=6, frontend=12, backend=8)),
    dict(code="REVIEWS", name="Ratings & reviews", module="Engagement", tier="advanced",
         keywords=["review", "rating", "feedback"], hours=_h(frontend=8, backend=10, mobile=8)),
    dict(code="I18N", name="Multi-language support", module="Platform", tier="advanced",
         keywords=["multi-language", "multilingual", "hindi", "tamil", "language"],
         hours=_h(frontend=14, backend=8, mobile=12)),
]

CATEGORY_FEATURES = {
    "business": [
        dict(code="BIZ_PROFILE", name="Business profile & branding pages", module="Business", tier="essential",
             keywords=["business profile", "company profile", "branding", "portfolio"],
             hours=_h(design=8, frontend=14, backend=6, mobile=8)),
        dict(code="SVC_CATALOG", name="Service catalogue", module="Business", tier="essential",
             keywords=["services", "service catalogue", "service list", "packages"],
             hours=_h(design=6, frontend=14, backend=14, mobile=12)),
        dict(code="LEAD_FORM", name="Enquiry / lead capture form", module="Sales", tier="essential",
             keywords=["enquiry", "inquiry", "lead", "contact form", "quote request"],
             hours=_h(frontend=8, backend=10, mobile=6)),
        dict(code="CRM_LITE", name="Customer records (CRM-lite)", module="Sales", tier="recommended", admin=True,
             keywords=["customer records", "crm", "customers list", "client records", "follow-up", "follow up"],
             hours=_h(design=4, frontend=18, backend=22)),
    ],
    "ecommerce": [
        dict(code="PRODUCTS", name="Product catalogue", module="Catalogue", tier="essential",
             keywords=["product", "catalogue", "catalog", "categories", "sku"],
             hours=_h(design=8, frontend=18, backend=20, mobile=16)),
        dict(code="CART", name="Shopping cart", module="Ordering", tier="essential",
             keywords=["cart", "basket", "add to cart"], hours=_h(frontend=10, backend=12, mobile=10)),
        dict(code="CHECKOUT", name="Checkout & address management", module="Ordering", tier="essential",
             keywords=["checkout", "check out", "address", "shipping"],
             hours=_h(design=4, frontend=14, backend=16, mobile=14)),
        dict(code="ORDERS", name="Order management", module="Ordering", tier="essential",
             keywords=["order", "orders", "order history", "returns", "refund"],
             hours=_h(frontend=16, backend=22, mobile=10)),
        dict(code="INVENTORY", name="Inventory management", module="Operations", tier="recommended", admin=True,
             keywords=["inventory", "stock", "warehouse"], hours=_h(frontend=12, backend=18)),
        dict(code="DELIVERY_STATUS", name="Delivery / shipment status", module="Operations", tier="recommended",
             keywords=["delivery status", "shipment", "courier", "track order", "tracking"],
             hours=_h(frontend=8, backend=12, mobile=8, integration=12)),
        dict(code="COUPONS", name="Coupons & discounts", module="Marketing", tier="advanced",
             keywords=["coupon", "discount", "promo", "offer"], hours=_h(frontend=8, backend=14, mobile=6)),
        dict(code="WISHLIST", name="Wishlist", module="Engagement", tier="advanced",
             keywords=["wishlist", "wish list", "favourite", "favorite"], hours=_h(frontend=6, backend=6, mobile=6)),
    ],
    "food": [
        dict(code="MERCHANT", name="Restaurant / merchant onboarding & panel", module="Merchants", tier="essential",
             keywords=["restaurant", "merchant", "vendor", "kitchen", "outlet"],
             hours=_h(design=8, frontend=24, backend=24)),
        dict(code="MENU", name="Menu management", module="Merchants", tier="essential",
             keywords=["menu", "dishes", "items", "food items"], hours=_h(design=4, frontend=12, backend=14, mobile=12)),
        dict(code="CART", name="Cart & ordering", module="Ordering", tier="essential",
             keywords=["cart", "order food", "place order"], hours=_h(frontend=10, backend=12, mobile=12)),
        dict(code="ORDER_FLOW", name="Order lifecycle (accept, prepare, dispatch, deliver)", module="Ordering",
             tier="essential", keywords=["order status", "order lifecycle", "accept order", "orders"],
             hours=_h(frontend=14, backend=26, mobile=14)),
        dict(code="RIDER_ASSIGN", name="Delivery partner assignment & rider app screens", module="Delivery",
             tier="recommended", keywords=["delivery partner", "delivery boy", "rider", "driver", "assign"],
             hours=_h(design=6, backend=24, mobile=24, integration=6)),
        dict(code="LIVE_TRACK", name="Live order tracking on map", module="Delivery", tier="advanced", realtime=True,
             keywords=["live tracking", "real-time tracking", "track rider", "live location"],
             hours=_h(frontend=8, backend=18, mobile=18, integration=16)),
        dict(code="OFFERS", name="Offers & promo codes", module="Marketing", tier="recommended",
             keywords=["offer", "coupon", "promo", "discount"], hours=_h(frontend=8, backend=14, mobile=6)),
    ],
    "education": [
        dict(code="COURSES", name="Course catalogue", module="Learning", tier="essential",
             keywords=["course", "courses", "programme", "program", "syllabus"],
             hours=_h(design=8, frontend=16, backend=16, mobile=14)),
        dict(code="BATCHES", name="Batches & schedules", module="Learning", tier="recommended",
             keywords=["batch", "batches", "schedule", "timetable"], hours=_h(frontend=12, backend=16, mobile=8)),
        dict(code="LEARNER", name="Learner profiles & enrolment", module="Learners", tier="essential",
             keywords=["student", "learner", "enrol", "enroll", "admission"],
             hours=_h(frontend=10, backend=14, mobile=10)),
        dict(code="CONTENT", name="Learning content (video / PDF)", module="Learning", tier="essential",
             keywords=["video", "lesson", "content", "materials", "pdf", "recorded"],
             hours=_h(design=4, frontend=14, backend=18, mobile=14, integration=10)),
        dict(code="ASSESS", name="Assessments & quizzes", module="Assessment", tier="recommended",
             keywords=["quiz", "test", "exam", "assessment", "mcq"],
             hours=_h(design=4, frontend=18, backend=22, mobile=16)),
        dict(code="ATTEND", name="Attendance tracking", module="Operations", tier="recommended",
             keywords=["attendance"], hours=_h(frontend=8, backend=10, mobile=8)),
        dict(code="PROGRESS", name="Progress tracking & certificates", module="Assessment", tier="advanced",
             keywords=["progress", "certificate", "completion"], hours=_h(frontend=10, backend=14, mobile=8)),
        dict(code="LIVE_CLASS", name="Live classes (Zoom / Meet integration)", module="Learning", tier="advanced",
             realtime=True, keywords=["live class", "live classes", "zoom", "google meet", "webinar"],
             hours=_h(frontend=8, backend=12, mobile=8, integration=20)),
    ],
    "booking": [
        dict(code="PROVIDERS", name="Service & provider listing", module="Catalogue", tier="essential",
             keywords=["provider", "doctor", "stylist", "therapist", "consultant", "service list", "services"],
             hours=_h(design=6, frontend=14, backend=14, mobile=12)),
        dict(code="AVAILABILITY", name="Availability & slot management", module="Scheduling", tier="essential",
             keywords=["availability", "slot", "slots", "working hours", "time slot"],
             hours=_h(frontend=14, backend=22, mobile=8)),
        dict(code="BOOKING", name="Slot booking", module="Scheduling", tier="essential",
             keywords=["book", "booking", "appointment", "reserve", "reservation"],
             hours=_h(design=6, frontend=12, backend=18, mobile=14)),
        dict(code="RESCHEDULE", name="Reschedule & cancellation", module="Scheduling", tier="recommended",
             keywords=["reschedule", "cancel", "cancellation"], hours=_h(frontend=8, backend=12, mobile=8)),
        dict(code="STAFF_CAL", name="Staff calendar", module="Scheduling", tier="recommended", admin=True,
             keywords=["calendar", "staff calendar", "roster"], hours=_h(design=4, frontend=16, backend=14)),
        dict(code="WAITLIST", name="Waitlist & auto-fill", module="Scheduling", tier="advanced",
             keywords=["waitlist", "waiting list"], hours=_h(frontend=6, backend=14, mobile=6)),
    ],
}

# Features assumed for a category when the brief doesn't mention them (become INFERRED items).
CATEGORY_DEFAULTS = {
    "business": ["AUTH", "ADMIN", "BIZ_PROFILE", "SVC_CATALOG", "LEAD_FORM", "CMS"],
    "ecommerce": ["AUTH", "PROFILE", "ADMIN", "PRODUCTS", "CART", "CHECKOUT", "ORDERS", "PAY"],
    "food": ["AUTH", "ADMIN", "MERCHANT", "MENU", "CART", "ORDER_FLOW", "PAY"],
    "education": ["AUTH", "ADMIN", "COURSES", "LEARNER", "CONTENT"],
    "booking": ["AUTH", "ADMIN", "PROVIDERS", "AVAILABILITY", "BOOKING", "NOTIF"],
}


def catalogue_for(category: str) -> list[dict]:
    """Category features first, then common ones (category-specific codes override common codes)."""
    specific = CATEGORY_FEATURES.get(category, [])
    codes = {f["code"] for f in specific}
    return [*specific, *[f for f in COMMON_FEATURES if f["code"] not in codes]]


def feature_index(category: str) -> dict[str, dict]:
    return {f["code"]: f for f in catalogue_for(category)}


# ---------------------------------------------------------------- recurring cost templates
CLOUD_TEMPLATES = {  # monthly INR, DEMO PLACEHOLDERS — to be priced with provider calculators (§4.1)
    "S": {"label": "Small (< 5,000 users)", "low": D("4000"), "high": D("8000")},
    "M": {"label": "Medium (5,000–50,000 users)", "low": D("12000"), "high": D("22000")},
    "L": {"label": "Large (> 50,000 users)", "low": D("35000"), "high": D("65000")},
}
THIRD_PARTY = {
    "NOTIF": "SMS / WhatsApp / email: usage-based, typically ₹0.15–₹0.80 per message depending on channel and provider",
    "PAY": "Payment gateway: ~2% per transaction, charged by the gateway (passed through)",
    "MAPS": "Maps API: usage-based (free tier, then per 1,000 requests)",
    "LIVE_TRACK": "Maps API: usage-based (live tracking increases request volume)",
    "LIVE_CLASS": "Video conferencing licence (e.g. Zoom/Meet) per host per month",
    "CONTENT": "Video hosting / streaming: usage-based storage and bandwidth",
}
FIXED_ANNUAL = [
    ("Domain & SSL", "₹1,500–₹3,000 per year"),
]
APP_STORE = [
    ("Apple Developer Program", "USD 99 per year (client account)"),
    ("Google Play Console", "USD 25 one-time (client account)"),
]

# ---------------------------------------------------------------- benchmarks (proposal §4.2 — published figures)
BENCHMARKS = [
    {"source": "Clutch — Custom Software Development Pricing (2026)", "url": "https://clutch.co/developers/pricing",
     "segment": "India agencies", "value": "USD 25–49 per hour", "captured": "2026-11-07",
     "use": "Agency-market comparison only; confirm current exchange rate and provider scope.", "reliability": "Medium"},
    {"source": "GUVI — How to Price Your Freelance Projects (2026)",
     "url": "https://www.guvi.in/blog/how-to-price-your-freelance-projects/", "segment": "Freelance projects",
     "value": "Full-stack web app ₹1.5–4 L (experienced); Flutter/RN app ₹2–5 L (experienced)",
     "captured": "2026-11-07", "use": "Directional; not apples-to-apples with a production platform.",
     "reliability": "Low–Medium"},
    {"source": "Rinto — Freelance Developer Rates in India (2026)",
     "url": "https://tryrinto.com/blog/freelance-developer-rates-india", "segment": "Freelance hourly",
     "value": "Junior ₹500–1,200/h · Mid ₹1,200–2,500/h · Senior ₹2,500–5,000+/h", "captured": "2026-11-07",
     "use": "Provisional bands; validate with local quotes.", "reliability": "Low–Medium"},
]
# Sanity band for the implied blended price per hour (junior–senior freelance band from §4.2).
BENCHMARK_HOURLY_BAND = (D("500"), D("5000"))

# ---------------------------------------------------------------- sample briefs for the demo
SAMPLE_BRIEFS = [
    {"title": "Salon booking app", "category": "booking", "platforms": ["web", "android", "ios"],
     "client_name": "Glow Studio Salons",
     "brief": ("We run 3 salons in Chennai and want customers to book appointments online. Customers should see "
               "our services and stylists, pick a free time slot and pay online with UPI or card. They must get "
               "WhatsApp reminders before the appointment and be able to reschedule or cancel. Our staff need a "
               "calendar to see their bookings for the day. The owner wants a dashboard with daily revenue reports. "
               "We would like to launch before the wedding season in about 3 months.")},
    {"title": "Online grocery store", "category": "ecommerce", "platforms": ["web", "android"],
     "client_name": "FreshCart Foods",
     "brief": ("We are a grocery shop in Coimbatore and want an online store. Customers can browse products by "
               "categories, search, add to cart and checkout with home delivery address. Payment through Razorpay "
               "and cash on delivery. We need inventory management for around 2,000 products and order tracking "
               "for customers. Admin should manage products, orders and see sales reports. We want discount "
               "coupons for festivals. We currently keep stock in Excel and need to migrate it.")},
    {"title": "Coaching institute portal", "category": "education", "platforms": ["web", "android", "ios"],
     "client_name": "Bright Minds Academy",
     "brief": ("Bright Minds is a coaching institute with about 1,500 students. We need a portal and mobile app "
               "where students enrol in courses and batches, watch recorded video lessons and take weekly MCQ "
               "tests. Teachers mark attendance. Parents should get SMS alerts for attendance and test results. "
               "Fees must be paid online. We also want live classes through Zoom.")},
    {"title": "Vague food delivery idea", "category": "food", "platforms": ["android"],
     "client_name": "",
     "brief": "I want an app like a food delivery app for my town. What will it cost?"},
]
