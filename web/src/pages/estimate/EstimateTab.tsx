import clsx from "clsx";
import { Calculator, Clock, Gauge, Info, Layers, Scale } from "lucide-react";
import { useState } from "react";
import { Alert, Badge, Button, Card, Drawer, Locked, Stat } from "../../components/ui";
import { hrs1, inr, num, pct, toNum } from "../../lib/format";
import type { Estimate, TraceEntry, Workstream } from "../../lib/types";

/** Single-series horizontal bars: expected hours with a low–high range whisker. One hue, no legend. */
function EffortBars({ rows }: { rows: Workstream[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...rows.map((r) => toNum(r.high)), 1);
  const total = rows.reduce((s, r) => s + toNum(r.expected), 0);
  return (
    <div className="space-y-1" role="list" aria-label="Expected hours by workstream">
      {rows.map((r) => {
        const exp = toNum(r.expected), lo = toNum(r.low), hi = toNum(r.high);
        const on = hover === r.workstream;
        return (
          <div key={r.workstream} role="listitem" tabIndex={0}
            onMouseEnter={() => setHover(r.workstream)} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(r.workstream)} onBlur={() => setHover(null)}
            className={clsx("relative grid grid-cols-[150px_1fr_88px] items-center gap-3 rounded-md px-2 py-1.5", on && "bg-slate-50")}>
            <span className="truncate text-[12.5px] text-ink-2">{r.label}</span>
            <div className="relative h-5">
              <div className="absolute inset-0 my-auto h-3.5 rounded-r-[4px] bg-slate-100/80" />
              <div className={clsx("absolute inset-y-0 left-0 my-auto h-3.5 rounded-r-[4px] transition-colors", on ? "bg-brand-600" : "bg-brand-500")} style={{ width: `${(exp / max) * 100}%` }} />
              {/* range whisker */}
              <div className="absolute top-1/2 h-px bg-brand-900/50" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />
              <div className="absolute top-[5px] h-2.5 w-px bg-brand-900/50" style={{ left: `${(lo / max) * 100}%` }} />
              <div className="absolute top-[5px] h-2.5 w-px bg-brand-900/50" style={{ left: `${(hi / max) * 100}%` }} />
            </div>
            <span className="num text-right text-[12.5px] font-medium">{hrs1(exp)}</span>
            {on && (
              <div className="pointer-events-none absolute left-[160px] top-full z-10 mt-1 w-64 rounded-lg border border-line bg-surface p-3 text-[12px] shadow-pop">
                <div className="font-semibold text-ink">{r.label}</div>
                <div className="text-ink-3">{((exp / total) * 100).toFixed(0)}% of effort · ≈ {num(r.traditional)} h traditional</div>
                <div className="num mt-2 grid grid-cols-4 gap-1 text-center">
                  {([["Low", r.low], ["Likely", r.likely], ["High", r.high], ["Expected", r.expected]] as const).map(([k, v]) => (
                    <div key={k}><div className="text-[10.5px] text-ink-3">{k}</div><div className="font-medium">{toNum(v).toFixed(1)}</div></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-2 pt-2 text-[11.5px] text-ink-3">
        <span className="inline-block h-px w-5 bg-ink-3" /> range low–high · bar = expected (PERT)
      </div>
    </div>
  );
}

type Row = { label: string; value: string; note?: string; strong?: boolean; sub?: boolean; hero?: boolean };

function RowsTable({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full text-[13px]">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={clsx("border-b border-line-soft last:border-0", r.strong && "bg-brand-50/60",
            r.hero && "!bg-navy-900 text-white [&_div]:!text-navy-200 [&_td]:!text-white")}>
            <td className={clsx("py-2 pl-3 pr-3", r.sub && "pl-6 text-ink-2", (r.strong || r.hero) && "font-semibold")}>
              {r.label}{r.note && <div className="text-[11.5px] font-normal text-ink-3">{r.note}</div>}
            </td>
            <td className={clsx("num whitespace-nowrap py-2 pr-3 text-right", r.strong || r.hero ? "font-semibold" : "text-ink-2")}>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Client-safe: how the quoted price is derived (visible to every role). */
function PriceBuildUp({ est }: { est: Estimate }) {
  const r = est.result;
  const b = r.band;
  const ai = r.effort.totals.expected, bill = r.effort.billable.expected;
  const raw = toNum(bill) * toNum(b.price_per_ai_hour);
  const rule = b.capped ? "Held at the ₹1,00,000 SMB limit" : b.floored ? "Raised to the ₹5,000 minimum"
    : `Rounded to the nearest ${inr(b.rounding)}`;
  const gst = Math.round(toNum(r.client_range.expected) * 0.18);
  const rows: Row[] = [
    { label: "AI-assisted delivery hours", value: hrs1(ai), note: `≈ ${num(r.effort.traditional.expected)} h of traditional effort` },
    { label: "Billable hours (incl. contingency)", value: hrs1(bill), note: `Contingency for ${r.confidence.band.toLowerCase()} confidence`, sub: true },
    { label: `× ${inr(b.price_per_ai_hour)} per AI-assisted hour`, value: inr(Math.round(raw)), sub: true },
    { label: "Client price (expected)", value: inr(r.client_range.expected), note: rule, hero: true },
    { label: "GST 18% — shown separately", value: inr(gst), sub: true },
    { label: "Total incl. GST", value: inr(toNum(r.client_range.expected) + gst), strong: true },
  ];
  return <RowsTable rows={rows} />;
}

/** Finance only: delivery cost, commission and margin. */
function InternalEconomics({ est }: { est: Estimate }) {
  const c = est.result.cost!.expected;
  const rows: Row[] = [
    { label: "Client price before tax", value: inr(c.price_before_tax), strong: true },
    { label: "Delivery cost", value: inr(c.delivery_cost), note: `${hrs1(c.billable_hours)} × ${inr(c.internal_cost_per_ai_hour)} per hour`, sub: true },
    { label: "AI tooling & preview hosting", value: inr(c.ai_tooling), sub: true },
    { label: `Acquisition commission (${pct(c.commission_pct)} of price)`, value: inr(c.commission), sub: true },
    { label: `Gross margin (${pct(c.margin_pct)})`, value: inr(c.margin), hero: true, note: "price − delivery cost − tooling − commission" },
  ];
  return <RowsTable rows={rows} />;
}

/** Where this quote sits in the ₹5,000 – ₹1,00,000 SMB band. */
function BandMeter({ est }: { est: Estimate }) {
  const b = est.result.band;
  const cr = est.result.client_range;
  const min = toNum(b.min), max = toNum(b.max);
  const pos = (v: string) => `${Math.min(100, Math.max(0, ((toNum(v) - min) / (max - min)) * 100))}%`;
  return (
    <div>
      <div className="relative mt-2 h-3 rounded-full bg-gradient-to-r from-emerald-100 via-gold-100 to-accent-100">
        <div className="absolute inset-y-0 rounded-full bg-brand-500/25 ring-1 ring-inset ring-brand-500/40"
          style={{ left: pos(cr.low), right: `calc(100% - ${pos(cr.high)})` }} />
        <div className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-navy-800 ring-2 ring-surface" style={{ left: pos(cr.expected) }} />
      </div>
      <div className="num mt-2 flex justify-between text-[11.5px] text-ink-3">
        <span>{inr(b.min)}</span><span>{inr(Math.round((min + max) / 2))}</span><span>{inr(b.max)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="font-semibold">Quote: {inr(cr.low)} – {inr(cr.high)}</span>
        {b.capped ? <Badge tone="amber">Held at ₹1,00,000 limit</Badge>
          : b.floored ? <Badge tone="brand">Minimum ₹5,000 applies</Badge>
          : <Badge tone="green">Within SMB band</Badge>}
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">{b.note}. Every client price is a whole rupee amount, rounded to {inr(b.rounding)}.</p>
    </div>
  );
}

export function TraceList({ entries }: { entries: TraceEntry[] }) {
  const groups = [...new Set(entries.map((e) => e.group))];
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g}>
          <div className="label mb-2">{g}</div>
          <ul className="space-y-2">
            {entries.filter((e) => e.group === g).map((e) => (
              <li key={e.id} className="rounded-lg border border-line px-3.5 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium">{e.label}</span>
                  <span className="num whitespace-nowrap text-[13px] font-semibold">{e.value}</span>
                </div>
                <div className="mt-1 font-mono text-[11.5px] text-brand-700">{e.formula}</div>
                {e.detail && <div className="mt-0.5 text-[12px] text-ink-3">{e.detail}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function EstimateTab({ est }: { est: Estimate }) {
  const r = est.result;
  const [trace, setTrace] = useState(false);
  const internal = !!r.cost;
  const exp = r.cost?.expected;
  const rec = r.recurring;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="brand" label="Delivery effort" value={hrs1(r.effort.billable.expected)} sub={`AI-assisted · ≈ ${num(r.effort.traditional.expected)} h traditional`} icon={<Clock className="h-4 w-4" />} />
        <Stat tone="teal" label="Delivery time" value={`${r.timeline.days.expected} working days`} sub={`${r.timeline.days.low}–${r.timeline.days.high} days incl. client review`} icon={<Layers className="h-4 w-4" />} />
        <Stat tone="violet" label="Complexity" value={r.complexity.band} sub={`Score ${r.complexity.total}/${r.complexity.max} · ×${r.complexity.multiplier} effort`} icon={<Gauge className="h-4 w-4" />} />
        <Stat tone="amber" label="Client price" value={inr(r.client_range.expected)} sub={`Range ${inr(r.client_range.low)} – ${inr(r.client_range.high)} · excl. GST`} icon={<Scale className="h-4 w-4" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card title="AI-assisted hours by workstream" subtitle={`Traditional-equivalent effort × AI productivity factor (${r.effort.ai_factor})`}
          actions={<Button variant="secondary" size="sm" icon={<Calculator className="h-4 w-4" />} onClick={() => setTrace(true)}>Why this number?</Button>}>
          <EffortBars rows={r.effort.workstreams} />
          {r.complexity.reasons.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-[12px] text-ink-3">
              Complexity drivers: {r.complexity.reasons.map((x) => <Badge key={x} tone="neutral">{x}</Badge>)}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="How the price is built" subtitle={r.pricing_model}>
            <PriceBuildUp est={est} />
          </Card>
          <Card title="SMB price band" subtitle="Small businesses & startups · AP / Telangana">
            <BandMeter est={est} />
          </Card>
        </div>
      </div>

      <Card title="Internal economics" subtitle={internal ? `Expected scenario · ${r.versions.policy}` : undefined}>
        {internal && exp ? <InternalEconomics est={est} /> : (
          <Locked title="Visible to Finance only">
            Delivery cost, commission and margin are confidential. You see the client price and how it is built. Switch persona to Finance to view.
          </Locked>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Recurring & running costs" subtitle="Always separate from the one-time development price">
          <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-3.5 py-3">
            <div>
              <div className="text-[13px] font-medium">Cloud hosting · {rec.cloud.label}</div>
              <div className="text-[11.5px] text-ink-3">{rec.cloud.assumed ? "Size assumed — scale not stated. " : ""}{rec.cloud.note}</div>
            </div>
            <div className="num whitespace-nowrap text-[14px] font-semibold">{inr(rec.cloud.monthly_low)}–{inr(rec.cloud.monthly_high)}<span className="text-[11.5px] font-normal text-ink-3">/mo</span></div>
          </div>
          <div className="mt-2 flex items-baseline justify-between rounded-lg bg-slate-50 px-3.5 py-3">
            <div>
              <div className="text-[13px] font-medium">Annual maintenance & support</div>
              <div className="text-[11.5px] text-ink-3">{pct(rec.maintenance.pct)} of development per year · {rec.maintenance.note}</div>
            </div>
            <div className="num whitespace-nowrap text-[14px] font-semibold">{inr(rec.maintenance.annual_low)}–{inr(rec.maintenance.annual_high)}<span className="text-[11.5px] font-normal text-ink-3">/yr</span></div>
          </div>
          <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink-2">
            {[...rec.third_party, ...rec.fixed].map((t) => (
              <li key={t.item} className="flex gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-4" />{t.description.includes(":") ? t.description : `${t.item}: ${t.description}`}</li>
            ))}
          </ul>
        </Card>
        <Card title="Assumptions & exclusions" subtitle="Printed on the quotation — never disguised as confirmed scope">
          <div className="label mb-1.5">Assumptions</div>
          <ul className="mb-4 space-y-1.5 text-[12.5px] text-ink-2">
            {r.assumptions.map((a) => (
              <li key={a.text} className="flex gap-2">
                <Badge tone={a.source === "inferred" ? "amber" : "neutral"} className="mt-px">{a.source}</Badge><span>{a.text}</span>
              </li>
            ))}
          </ul>
          <div className="label mb-1.5">Exclusions</div>
          <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-ink-2">{r.exclusions.map((x) => <li key={x}>{x}</li>)}</ul>
        </Card>
      </div>

      {!internal && <Alert tone="info">Numbers are calculated by the deterministic engine from catalogue hours, the approved rate card and the commercial policy — the AI never supplies a figure.</Alert>}

      <Drawer open={trace} onClose={() => setTrace(false)} title="Why this number?"
        subtitle={`Calculation trace · v${est.version} · ${r.versions.catalogue} · ${r.versions.rules}${internal ? "" : " · internal lines hidden for your role"}`}>
        <TraceList entries={r.trace} />
      </Drawer>
    </div>
  );
}
