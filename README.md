# FFA Estimator — MVP demo

An AI-assisted project cost estimation platform for Failure Folks Academy. This MVP demonstrates the architecture in [docs/01-technical-blueprint.md](docs/01-technical-blueprint.md) end to end:

> **AI structures the brief. A deterministic engine calculates. People approve.**

| Part | Stack | Folder |
|---|---|---|
| API, estimation engine, AI extraction | Python 3.12, FastAPI, SQLAlchemy, Pydantic, Anthropic SDK | `backend/` |
| Web app | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query | `web/` |

## Pricing model: SMB, AI-accelerated

The app targets small businesses and startups (Andhra Pradesh and Telangana). The rules are:

- **Effort:** catalogue scope → traditional-equivalent hours → × AI productivity factor (0.016) = **AI-assisted delivery hours**.
- **Contingency:** added according to the confidence level (10 / 15 / 25%).
- **Price:** billable hours × **₹5,000 per AI-assisted hour**.
- **Limits:** kept inside **₹5,000 – ₹1,00,000** (a hard cap) and rounded to ₹500. Prices are whole rupees, with no decimals or lakh abbreviations.
- **Static website / landing page:** about 1 hour, so **₹5,000**. Typical apps fall between ₹25,000 and ₹1,00,000.
- **Timeline:** in working days. Payment is 50/50, or 40/30/30 from ₹50,000.
- **Finance view:** internal cost (₹1,200 per AI-assisted hour + ₹500 tooling), commission (10%) and margin. GST (18%) is always shown separately.

All values are in `backend/app/reference_data.py` (`POLICY`) and are placeholders until Finance confirms them. When the pricing rules change, existing estimates are re-priced automatically at container start, as a new, audited version.

## Run it

You need Python 3.12+, [uv](https://docs.astral.sh/uv/) and Node 18+.

**1. Backend (terminal 1)**

```bash
cd backend
uv sync
uv run python seed_demo.py              # loads 4 sample enquiries (resets the demo DB)
uv run uvicorn app.main:app --port 8000
```

**2. Frontend (terminal 2)**

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:5173**.

**AI mode.** Without an API key the app uses a built-in, offline rule-based extractor. That is good for a reliable demo.

To use Claude for requirement extraction:

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `ANTHROPIC_API_KEY`.
3. Restart the backend.

The chip in the top bar shows which mode is active. If a Claude call fails, the app falls back to the rule-based extractor and says so on screen.

**Tests:** run `cd backend && uv run pytest`. There are 19 tests, including:

- the proposal's worked example (₹2,10,000 cost → ₹3,00,000 price);
- property checks on the engine;
- a check that Sales never receives internal cost fields;
- the approval order;
- spoofed-file rejection;
- prompt-injection text treated as data.

## Run with Docker

```bash
cp .env.example .env        # set POSTGRES_PASSWORD
docker compose up -d --build
```

This starts the frontend on **http://localhost:5152**, the backend on **:8880**, and PostgreSQL. Jenkins CI/CD, database options and the production checklist are in [docs/02-deployment.md](docs/02-deployment.md).

## 10-minute demo script

1. **Dashboard (as Sales).** Walk through the four-step strip: brief → AI structures → engine calculates → people approve.
2. **New estimate.** Click *Try a sample brief → Salon booking app*, then **Analyse & estimate**.
3. **Requirements tab.** Each requirement is highlighted in the brief and marked *Explicit · verified* or *Inferred*. The confidence score is computed from evidence (4 components), not claimed by the AI. Point out the clarification questions.
4. **Answer a question** (e.g. scale: "about 3,000 customers"), then click *Save answers & re-estimate*. A new version is created and the confidence goes up.
5. **Estimate tab.** Click **Why this number?** to open the calculation trace. Sales sees a locked *Internal costing* panel.
6. **Switch persona to Finance** (top right). The same screen now shows the full cost breakdown: labour by role (hours × rate), contingency, overhead, commission, margin, GST shown separately, and the market benchmark check.
7. **Packages tab.** Basic / Standard / Premium differ by *features*, never by a price multiplier.
8. **Scope tab (as Tech Lead).** Override a complexity factor or untick a feature, then click *Recalculate*. A new version is created and approvals reset.
9. **Quote & approval tab.** Approve as Tech Lead, then as Finance. The watermark disappears and the quotation is ready to print.
10. **Vague food delivery idea** (seeded). Low confidence, many questions, everything inferred. The system says what it doesn't know.

Tip: you can open any page directly as a role with `?persona=finance` (or `sales`, `ba`, `techlead`, `admin`).

## What is demo-grade vs. production

| Area | In this MVP | Full build (blueprint) |
|---|---|---|
| Login | Persona switcher (`X-Demo-Role` header) | SSO or password + TOTP MFA, server-side sessions, CSRF |
| Database | SQLite, JSON columns | PostgreSQL + pgvector, normalized versioned tables, Alembic |
| Rates, catalogue, policy | Placeholder values in code (`backend/app/reference_data.py`) | Admin screens, versioned and audited, owned by Finance / BA / Tech Lead |
| AI pipeline | Synchronous request with an animated progress dialog | Background jobs + live progress events, token/cost metering, eval gates |
| Documents | PDF/DOCX/TXT text extraction, type & size checks | + malware scanning, S3 storage, OCR, retention |
| Catalogue matching | Keywords (rules mode) / model choice from the catalogue list (Claude mode) | Hybrid vector + keyword retrieval over the catalogue |
| PDF | Browser print of the quote preview | Server-rendered branded PDF + internal XLSX cost sheet |
| Deploy | Local | AWS Mumbai: ECS Fargate, RDS, S3, CloudFront/WAF, CI/CD |

**All rates, hours and percentages are placeholders.** Finance and the delivery leads must replace them before any client-facing use (blueprint §6.4).
