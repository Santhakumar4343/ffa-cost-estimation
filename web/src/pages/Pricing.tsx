import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Sparkles } from "lucide-react";
import { PageHeader } from "../components/Layout";
import { Alert, Badge, Card, Locked, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { inr, pct, toNum } from "../lib/format";

const EXAMPLES = [
  { scope: "Static website / landing page", hours: "≈ 1 h", price: "₹5,000" },
  { scope: "Small business website + enquiry form", hours: "2–3 h", price: "₹10,000 – ₹15,000" },
  { scope: "Business app: login, admin, catalogue, leads", hours: "5–7 h", price: "₹25,000 – ₹40,000" },
  { scope: "Booking / e-commerce app (web + mobile)", hours: "12–18 h", price: "₹60,000 – ₹1,00,000" },
];

export default function Pricing() {
  const { data, isLoading } = useQuery({ queryKey: ["pricing"], queryFn: api.pricing });
  if (isLoading || !data) return <Skeleton className="h-96" />;
  const r = data.rules;
  const p = data.policy;
  return (
    <>
      <PageHeader title="Pricing rules" subtitle={`${r.pricing_model} · ${data.versions.policy} · owned by Finance`} />
      <Alert tone="warning" className="mb-5" title="Demo placeholder values">
        The ₹5,000 – ₹1,00,000 band and ₹5,000 per AI-assisted hour follow the sales team's guidance for small businesses and
        startups in Andhra Pradesh and Telangana. Finance confirms the internal cost, commission basis and GST treatment before pilot.
      </Alert>

      <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-7 py-6 text-white shadow-glow">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-navy-500/30 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-4">
          {[
            ["Minimum project", inr(r.min_project_price), "Static page or a tiny job"],
            ["Maximum project", inr(r.max_project_price), "Hard cap — never quoted above"],
            ["Per AI-assisted hour", inr(r.price_per_ai_hour), "Build time with AI tools"],
            ["Rounding", `nearest ${inr(r.price_rounding)}`, "Whole rupees, no decimals"],
          ].map(([k, v, sub]) => (
            <div key={k}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-200">{k}</div>
              <div className="num mt-1 text-[26px] font-bold text-gold-400">{v}</div>
              <div className="text-[12px] text-navy-200">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Typical quotes" subtitle="What the rules produce for common requests (excl. GST)" bodyClass="p-0">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-slate-50/60 text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <th className="px-5 py-2 font-semibold">Scope</th>
                <th className="px-3 py-2 text-right font-semibold">AI-assisted hours</th>
                <th className="px-5 py-2 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLES.map((e) => (
                <tr key={e.scope} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5">{e.scope}</td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">{e.hours}</td>
                  <td className="num whitespace-nowrap px-5 py-2.5 text-right font-semibold">{e.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line px-5 py-3 text-[12px] text-ink-3">
            GST {pct(r.gst_pct)} is added separately · quotes valid {r.validity_days} days · annual maintenance {pct(r.maintenance_pct_per_year)} of project price ·
            payment 50/50, or 40/30/30 from {inr(r.staged_payment_threshold)}.
          </div>
        </Card>

        <Card title="Internal economics" subtitle="How AI-assisted delivery is costed">
          {data.visible ? (
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                ["AI productivity factor", `${p.ai_productivity_factor} × traditional hours`],
                ["Internal cost per AI-assisted hour", inr(p.internal_cost_per_ai_hour)],
                ["AI tooling per project", inr(p.ai_tooling_per_project)],
                ["Focused build hours per day", `${p.ai_hours_per_day} h`],
                ["Acquisition commission", `${pct(p.commission_pct)} of price`],
                ["Contingency — High / Med / Low", `${pct(p.contingency.High)} / ${pct(p.contingency.Medium)} / ${pct(p.contingency.Low)}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <dt className="text-[11.5px] text-ink-3">{k}</dt>
                  <dd className="num mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-lg border border-line px-3 py-2.5 font-mono text-[12px] text-brand-700">
                price = clamp(billable AI hours × {inr(r.price_per_ai_hour)}, {inr(r.min_project_price)}, {inr(r.max_project_price)})
                <div className="mt-1 font-sans text-[11.5px] text-ink-3">Commission basis: {p.commission_basis}</div>
              </div>
            </dl>
          ) : <Locked title="Visible to Finance only">Internal cost per hour, commission and contingency are confidential.</Locked>}
        </Card>
      </div>

      <Card className="mt-5" title="Hosting (monthly, separate from project price)" subtitle="Indicative for small businesses" bodyClass="p-0">
        <table className="w-full text-[13px]">
          <tbody>
            {Object.entries(data.hosting as Record<string, { label: string; low: string; high: string }>).map(([k, h]) => (
              <tr key={k} className="border-b border-line last:border-0">
                <td className="px-5 py-2.5"><Badge tone="neutral">{k}</Badge> <span className="ml-2">{h.label}</span></td>
                <td className="num whitespace-nowrap px-5 py-2.5 text-right font-medium">
                  {toNum(h.low) === 0 ? "Free" : inr(h.low)} – {inr(h.high)} / month
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-5" title="Market references" subtitle="Published indications (proposal §4.2) — for context only; the SMB band sets the price" bodyClass="p-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-slate-50/60 text-left text-[11.5px] uppercase tracking-wider text-ink-3">
              <th className="px-5 py-2.5 font-semibold">Source</th><th className="px-3 py-2.5 font-semibold">Segment</th>
              <th className="px-3 py-2.5 font-semibold">Published indication</th><th className="px-5 py-2.5 font-semibold">Reliability</th>
            </tr>
          </thead>
          <tbody>
            {data.benchmarks.map((b: any) => (
              <tr key={b.source} className="border-b border-line align-top last:border-0">
                <td className="px-5 py-3">
                  <a href={b.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                    {b.source}<ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="px-3 py-3 text-ink-2">{b.segment}</td>
                <td className="px-3 py-3">{b.value}</td>
                <td className="px-5 py-3"><Badge tone="amber">{b.reliability}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-3">
        <Sparkles className="h-3.5 w-3.5" /> AI-accelerated delivery lets FFA quote below traditional agency rates while keeping a healthy margin.
      </p>
    </>
  );
}
