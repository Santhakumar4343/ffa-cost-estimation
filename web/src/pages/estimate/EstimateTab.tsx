import clsx from "clsx";
import { Calculator, Clock, Gauge, Info, Layers, Scale } from "lucide-react";
import { useState } from "react";
import { Alert, Badge, Button, Card, Drawer, Locked, Stat } from "../../components/ui";
import { hrs, inr, inrShort, num, pct, toNum } from "../../lib/format";
import type { Estimate, TraceEntry, Workstream } from "../../lib/types";

const ROLE_NAMES: Record<string, string> = {
  BA: "Business Analyst", UX: "UI/UX Designer", FE: "Frontend Dev", BE: "Backend Dev", MOB: "Mobile Dev",
  QA: "QA Engineer", DEVOPS: "DevOps", TL: "Team Lead / PM",
};

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
            <span className="num text-right text-[12.5px] font-medium">{num(exp)} h</span>
            {on && (
              <div className="pointer-events-none absolute left-[160px] top-full z-10 mt-1 w-64 rounded-lg border border-line bg-surface p-3 text-[12px] shadow-pop">
                <div className="font-semibold text-ink">{r.label}</div>
                <div className="text-ink-3">{ROLE_NAMES[r.role]} · {((exp / total) * 100).toFixed(0)}% of effort</div>
                <div className="num mt-2 grid grid-cols-4 gap-1 text-center">
                  {([["Low", r.low], ["Likely", r.likely], ["High", r.high], ["Expected", r.expected]] as const).map(([k, v]) => (
                    <div key={k}><div className="text-[10.5px] text-ink-3">{k}</div><div className="font-medium">{num(v)}</div></div>
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

function CostWaterfall({ est }: { est: Estimate }) {
  const c = est.result.cost!.expected;
  const rows: { label: string; value: string; note?: string; strong?: boolean; sub?: boolean }[] = [
    { label: "Direct labour", value: c.direct_labour, note: "Σ hours × approved role rate" },
    { label: "Project expenses", value: c.expenses, note: `Misc ${inr(c.misc_expenses)} + build infra ${inr(c.build_infra)} (${c.build_months} mo)` },
    { label: "Internal project cost", value: c.internal_cost, strong: true },
    { label: `Contingency (${pct(c.contingency_pct)})`, value: c.contingency, note: `Confidence ${est.result.confidence.band}`, sub: true },
    { label: `Allocated overhead (${pct(c.overhead_pct)})`, value: c.overhead, sub: true },
    { label: `Acquisition commission (${pct(c.commission_pct)} of price)`, value: c.commission, sub: true },
    { label: `Gross margin (target ${pct(c.margin_pct)})`, value: c.margin, sub: true },
    { label: "Client price before tax", value: c.price_before_tax, strong: true, note: "(cost + contingency + overhead) ÷ (1 − c − m)" },
    { label: `GST (${pct(c.gst_pct)}) — shown separately`, value: c.gst, sub: true },
    { label: "Total incl. GST", value: c.price_with_tax, strong: true },
  ];
  return (
    <table className="w-full text-[13px]">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={clsx("border-b border-line-soft last:border-0", r.strong && "bg-brand-50/60", r.label === "Client price before tax" && "!bg-navy-900 text-white [&_div]:!text-navy-200 [&_td]:!text-white")}>
            <td className={clsx("py-2 pl-3 pr-3", r.sub && "pl-6 text-ink-2", r.strong && "font-semibold")}>
              {r.label}{r.note && <div className="text-[11.5px] font-normal text-ink-3">{r.note}</div>}
            </td>
            <td className={clsx("num py-2 pr-3 text-right", r.strong ? "font-semibold" : "text-ink-2")}>{inr(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
        <Stat tone="brand" label="Total effort" value={hrs(r.effort.totals.expected)} sub={`Range ${num(r.effort.totals.low)}–${num(r.effort.totals.high)} h`} icon={<Clock className="h-4 w-4" />} />
        <Stat tone="teal" label="Duration" value={`${r.timeline.weeks.expected} weeks`} sub={`${r.timeline.weeks.low}–${r.timeline.weeks.high} weeks · ${r.timeline.team.devs} developers`} icon={<Layers className="h-4 w-4" />} />
        <Stat tone="violet" label="Complexity" value={r.complexity.band} sub={`Score ${r.complexity.total}/${r.complexity.max} · ×${r.complexity.multiplier} effort`} icon={<Gauge className="h-4 w-4" />} />
        <Stat tone="amber" label="Client range" value={`${inrShort(r.client_range.low)} – ${inrShort(r.client_range.high)}`} sub={`Expected ${inrShort(r.client_range.expected)} · excl. GST`} icon={<Scale className="h-4 w-4" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card title="Effort by workstream" subtitle="Expected hours after platform and complexity adjustments"
          actions={<Button variant="secondary" size="sm" icon={<Calculator className="h-4 w-4" />} onClick={() => setTrace(true)}>Why this number?</Button>}>
          <EffortBars rows={r.effort.workstreams} />
          {r.complexity.reasons.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-[12px] text-ink-3">
              Complexity drivers: {r.complexity.reasons.map((x) => <Badge key={x} tone="neutral">{x}</Badge>)}
            </div>
          )}
        </Card>

        <Card title="Internal costing" subtitle={internal ? `Expected scenario · ${r.versions.rate_card} · ${r.versions.policy}` : undefined}>
          {internal && exp ? <CostWaterfall est={est} /> : (
            <Locked title="Visible to Finance only">
              Internal rates, overhead, commission and margin are confidential. You see the client-facing range. Switch persona to Finance to view.
            </Locked>
          )}
        </Card>
      </div>

      {internal && exp && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card title="Labour by role" subtitle="Every labour rupee traces to hours × approved rate" bodyClass="p-0">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-slate-50/60 text-[11.5px] uppercase tracking-wider text-ink-3">
                  <th className="px-5 py-2 text-left font-semibold">Role</th>
                  <th className="px-3 py-2 text-right font-semibold">Hours</th>
                  <th className="px-3 py-2 text-right font-semibold">Rate / h</th>
                  <th className="px-5 py-2 text-right font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {exp.labour_lines.map((l) => (
                  <tr key={l.role} className="border-b border-line last:border-0">
                    <td className="px-5 py-2">{l.role_name}</td>
                    <td className="num px-3 py-2 text-right">{num(l.hours)}</td>
                    <td className="num px-3 py-2 text-right text-ink-2">{inr(l.rate)}</td>
                    <td className="num px-5 py-2 text-right font-medium">{inr(l.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {r.benchmark && (
            <Card title="Market benchmark check" subtitle="Benchmarks inform pricing; they never set it">
              <div className="num text-[22px] font-semibold">{inr(r.benchmark.implied_hourly)}<span className="text-[13px] font-normal text-ink-3"> / hour implied</span></div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className="relative h-2">
                  {(() => {
                    const lo = toNum(r.benchmark!.band_low), hi = toNum(r.benchmark!.band_high), v = toNum(r.benchmark!.implied_hourly);
                    const scale = hi * 1.2;
                    return <>
                      <div className="absolute h-2 rounded-full bg-brand-100" style={{ left: `${(lo / scale) * 100}%`, width: `${((hi - lo) / scale) * 100}%` }} />
                      <div className="absolute -top-1 h-4 w-1 rounded bg-brand-700" style={{ left: `${Math.min(v / scale, 1) * 100}%` }} />
                    </>;
                  })()}
                </div>
              </div>
              <div className="mt-2 flex justify-between text-[11.5px] text-ink-3"><span>Band {inr(r.benchmark.band_low)}–{inr(r.benchmark.band_high)}</span>
                <Badge tone={r.benchmark.status === "within" ? "green" : "amber"}>{r.benchmark.status} band</Badge></div>
              <p className="mt-2 text-[11.5px] text-ink-3">{r.benchmark.source}</p>
            </Card>
          )}
        </div>
      )}

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
            <div className="num whitespace-nowrap text-[14px] font-semibold">{inrShort(rec.maintenance.annual_low)}–{inrShort(rec.maintenance.annual_high)}<span className="text-[11.5px] font-normal text-ink-3">/yr</span></div>
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
