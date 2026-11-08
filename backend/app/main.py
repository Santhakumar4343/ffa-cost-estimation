"""FastAPI application — REST API for the MVP demo (blueprint §13)."""

from __future__ import annotations

import io
from contextlib import asynccontextmanager
import logging
from datetime import date
from typing import Literal

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select

from . import reference_data as ref
from . import service
from .config import settings
from .db import EstimateRecord, Session, get_session, init_db

logging.basicConfig(level=logging.INFO)
@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="FFA Estimator API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"],
                   allow_headers=["Content-Type", "X-Demo-Role"])


def current_role(x_demo_role: str = Header(default="sales")) -> str:
    """DEMO ONLY: persona comes from a header. The full build uses authenticated sessions + MFA (§14)."""
    service.role_or_403(x_demo_role)
    return x_demo_role


def load(db: Session, estimate_id: int) -> EstimateRecord:
    rec = db.get(EstimateRecord, estimate_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Estimate not found")
    return rec


# ---------------------------------------------------------------- schemas
Platform = Literal["web", "android", "ios"]


class IntakeIn(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    client_name: str | None = Field(default=None, max_length=200)
    channel: str | None = Field(default=None, max_length=60)
    category: Literal["business", "ecommerce", "food", "education", "booking"]
    platforms: list[Platform] = Field(min_length=1)
    mobile_approach: Literal["cross_platform", "native"] = "cross_platform"
    expected_users: int | None = Field(default=None, ge=1, le=100_000_000)
    budget_max: int | None = Field(default=None, ge=1000, le=1_000_000_000)
    target_launch: date | None = None
    geography: str | None = Field(default=None, max_length=120)
    brief: str = Field(min_length=10, max_length=60_000)

    @field_validator("platforms")
    @classmethod
    def unique(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(v))


class CustomModuleIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    hours: float = Field(gt=0, le=2000)


class ScopeIn(BaseModel):
    feature_codes: list[str]
    addon_codes: list[str] = []
    custom_modules: list[CustomModuleIn] = []
    complexity_overrides: dict[str, int] = {}
    mobile_approach: Literal["cross_platform", "native"] | None = None
    reason: str | None = Field(default=None, max_length=300)


class AnswersIn(BaseModel):
    answers: dict[str, str]


class ApprovalIn(BaseModel):
    type: Literal["technical", "commercial"]
    decision: Literal["approve", "request_changes"]
    comment: str = Field(default="", max_length=500)


# ---------------------------------------------------------------- reference endpoints
@app.get("/api/health")
def health():
    return {"status": "ok", "ai_mode": settings.ai_mode,
            "model": settings.llm_model if settings.ai_mode == "claude" else None}


@app.get("/api/meta")
def meta():
    return {
        "categories": ref.CATEGORIES, "input_groups": ref.INPUT_GROUPS,
        "complexity_factors": ref.COMPLEXITY_FACTORS, "workstreams": ref.WORKSTREAMS,
        "roles": {k: v["name"] for k, v in service.ROLES.items()},
        "sample_briefs": ref.SAMPLE_BRIEFS,
        "versions": {"catalogue": ref.CATALOGUE_VERSION, "policy": ref.POLICY_VERSION},
        "ai_mode": settings.ai_mode,
    }


@app.get("/api/catalogue/{category}")
def catalogue(category: str):
    if category not in ref.CATEGORY_NAMES:
        raise HTTPException(status_code=404, detail="Unknown category")
    return [{k: v for k, v in f.items() if k != "keywords"} for f in ref.catalogue_for(category)]


@app.get("/api/pricing")
def pricing(role: str = Depends(current_role)):
    internal = service.ROLES[role]["internal"]
    p = ref.POLICY
    # Client-facing pricing rules are visible to every role; internal economics to Finance only.
    out = {"benchmarks": ref.BENCHMARKS, "versions": {"policy": ref.POLICY_VERSION}, "visible": internal,
           "rules": service.jsonable({k: p[k] for k in (
               "pricing_model", "price_per_ai_hour", "min_project_price", "max_project_price", "price_rounding",
               "gst_pct", "validity_days", "maintenance_pct_per_year", "staged_payment_threshold")}),
           "hosting": service.jsonable(ref.CLOUD_TEMPLATES)}
    if internal:
        out["policy"] = service.jsonable({k: p[k] for k in (
            "ai_productivity_factor", "internal_cost_per_ai_hour", "ai_tooling_per_project", "ai_hours_per_day",
            "commission_pct", "commission_basis", "contingency")})
    return out


# ---------------------------------------------------------------- documents
@app.post("/api/documents/extract")
async def extract_document(file: UploadFile = File(...), role: str = Depends(current_role)):
    """Validate an uploaded requirement document and return page-tagged text.
    Demo controls: extension allowlist + magic bytes + size limit. Full build adds ClamAV and S3 (§14.5)."""
    name = (file.filename or "").lower()
    data = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_mb} MB")
    pages: list[str] = []
    try:
        if name.endswith(".pdf"):
            if not data.startswith(b"%PDF"):
                raise HTTPException(status_code=415, detail="File content is not a PDF")
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            if len(reader.pages) > 300:
                raise HTTPException(status_code=413, detail="PDF exceeds 300 pages")
            pages = [(p.extract_text() or "") for p in reader.pages]
        elif name.endswith(".docx"):
            if not data.startswith(b"PK\x03\x04"):
                raise HTTPException(status_code=415, detail="File content is not a DOCX")
            import docx
            d = docx.Document(io.BytesIO(data))
            pages = ["\n".join(p.text for p in d.paragraphs)]
        elif name.endswith((".txt", ".md")):
            pages = [data.decode("utf-8")]
        else:
            raise HTTPException(status_code=415, detail="Allowed types: PDF, DOCX, TXT, MD")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=422, detail="The document could not be read")
    text_chars = sum(len(p.strip()) for p in pages)
    scanned = name.endswith(".pdf") and text_chars < 20 * max(1, len(pages))
    if len(pages) > 1:
        text = "\n\n".join(f"[Page {i}]\n{p.strip()}" for i, p in enumerate(pages, 1))
    else:
        text = pages[0].strip() if pages else ""
    return {"filename": file.filename, "pages": len(pages), "characters": len(text),
            "scanned_suspected": scanned, "text": service.parse_page_text(text)[:60_000]}


# ---------------------------------------------------------------- estimates
@app.post("/api/estimates", status_code=201)
def create_estimate(body: IntakeIn, role: str = Depends(current_role), db: Session = Depends(get_session)):
    intake = body.model_dump(mode="json")
    rec = service.create(db, intake, role)
    return service.view(rec, role)


@app.get("/api/estimates")
def list_estimates(role: str = Depends(current_role), db: Session = Depends(get_session)):
    rows = db.scalars(select(EstimateRecord).order_by(EstimateRecord.updated_at.desc())).all()
    return [service.summary(r) for r in rows]


@app.get("/api/estimates/{estimate_id}")
def get_estimate(estimate_id: int, role: str = Depends(current_role), db: Session = Depends(get_session)):
    return service.view(load(db, estimate_id), role)


@app.put("/api/estimates/{estimate_id}/scope")
def put_scope(estimate_id: int, body: ScopeIn, role: str = Depends(current_role),
              db: Session = Depends(get_session)):
    rec = service.update_scope(db, load(db, estimate_id), role, body.model_dump())
    return service.view(rec, role)


@app.post("/api/estimates/{estimate_id}/answers")
def post_answers(estimate_id: int, body: AnswersIn, role: str = Depends(current_role),
                 db: Session = Depends(get_session)):
    rec = service.answer_questions(db, load(db, estimate_id), role, body.answers)
    return service.view(rec, role)


@app.post("/api/estimates/{estimate_id}/approvals")
def post_approval(estimate_id: int, body: ApprovalIn, role: str = Depends(current_role),
                  db: Session = Depends(get_session)):
    rec = service.approve(db, load(db, estimate_id), role, body.model_dump())
    return service.view(rec, role)


@app.delete("/api/estimates/{estimate_id}", status_code=204)
def delete_estimate(estimate_id: int, role: str = Depends(current_role), db: Session = Depends(get_session)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can delete estimates")
    db.delete(load(db, estimate_id))
    db.commit()

