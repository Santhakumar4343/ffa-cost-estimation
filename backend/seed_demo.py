"""Load the four sample enquiries (one fully approved) for the demo.

Usage (backend folder):
  uv run python seed_demo.py             # RESET the database, then seed
  uv run python seed_demo.py --if-empty  # seed only when no estimates exist (safe for container start-up)

Runs in-process against the configured DATABASE_URL; the API server does not need to be running.
"""

import sys

from sqlalchemy import func, select

from app import reference_data as ref
from app import service
from app.db import Base, EstimateRecord, SessionLocal, engine


def main() -> None:
    if_empty = "--if-empty" in sys.argv
    if if_empty:
        Base.metadata.create_all(engine)
        with SessionLocal() as db:
            if db.scalar(select(func.count()).select_from(EstimateRecord)):
                print("Database already has estimates; skipping demo seed.")
                return
    else:
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
    with SessionLocal() as db:
        recs = []
        for s in ref.SAMPLE_BRIEFS:
            intake = {"title": s["title"], "client_name": s["client_name"] or None, "category": s["category"],
                      "platforms": s["platforms"], "mobile_approach": "cross_platform", "expected_users": None,
                      "budget_max": None, "target_launch": None, "brief": s["brief"]}
            recs.append(service.create(db, intake, "sales"))
        grocery = recs[1]
        service.approve(db, grocery, "techlead", {"type": "technical", "decision": "approve",
                                                  "comment": "Architecture and effort reviewed."})
        service.approve(db, grocery, "finance", {"type": "commercial", "decision": "approve",
                                                 "comment": "Margin within policy."})
        for r in recs:
            cr = r.result["client_range"]
            print(f"EST-{r.id:04d}  {r.title:<28} {r.status:<20} INR {int(cr['low']):>9,} - {int(cr['high']):>9,}"
                  f"  conf {r.result['confidence']['score']:>3} {r.result['confidence']['band']}")


if __name__ == "__main__":
    main()
