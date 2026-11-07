import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "../components/Layout";
import { Alert, Badge, Card, Locked, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { inr, pct } from "../lib/format";

export default function Pricing() {
  const { data, isLoading } = useQuery({ queryKey: ["pricing"], queryFn: api.pricing });
  if (isLoading || !data) return <Skeleton className="h-96" />;
  const p = data.policy;
  return (
    <>
      <PageHeader title="Rates & benchmarks" subtitle={`${data.versions.rate_card} · ${data.versions.policy} · owned by Finance, reviewed quarterly`} />
      <Alert tone="warning" className="mb-5" title="Demo placeholder values">
        Rates and policy percentages are placeholders within the proposal's published bands. Finance confirms the real values (commission basis, margin, overhead, GST) before pilot.
      </Alert>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Internal cost rate card" bodyClass={data.visible ? "p-0" : undefined}
          subtitle={data.visible ? `Fully-loaded monthly cost ÷ ${data.productive_hours_per_month} productive hours = hourly rate used by the engine` : "Cost per delivery role"}>
          {data.visible ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-slate-50/60 text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <th className="px-5 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 text-right font-semibold">Monthly cost</th>
                  <th className="px-5 py-2 text-right font-semibold">Hourly rate</th>
                </tr>
              </thead>
              <tbody>
                {data.rate_card.map((r: { role: string; name: string; monthly: string; rate: string }) => (
                  <tr key={r.role} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5">{r.name}</td>
                    <td className="num px-3 py-2.5 text-right text-ink-2">{inr(r.monthly)}</td>
                    <td className="num px-5 py-2.5 text-right font-medium">{inr(r.rate)} / h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Locked title="Visible to Finance only">Sales and delivery roles do not see salary-derived or confidential rates (proposal §7.2).</Locked>}
        </Card>
        <Card title="Commercial policy">
          {data.visible ? (
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                ["Target gross margin", pct(p.target_margin_pct)],
                ["Acquisition commission", `${pct(p.commission_pct)} of price`],
                ["Allocated overhead", pct(p.overhead_pct)],
                ["GST (separate line)", pct(p.gst_pct)],
                ["Contingency — High / Med / Low confidence", `${pct(p.contingency.High)} / ${pct(p.contingency.Medium)} / ${pct(p.contingency.Low)}`],
                ["Quote validity", `${p.validity_days} days`],
                ["Annual maintenance", `${pct(p.maintenance_pct_per_year)} of development`],
                ["Productive hours / week", `${p.productive_hours_per_week} h`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <dt className="text-[11.5px] text-ink-3">{k}</dt>
                  <dd className="num mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-lg border border-line px-3 py-2.5 font-mono text-[12px] text-brand-800">
                price = (internal cost + contingency + overhead) ÷ (1 − commission − margin)
                <div className="mt-1 font-sans text-[11.5px] text-ink-3">Commission basis: {p.commission_basis}</div>
              </div>
            </dl>
          ) : <Locked title="Visible to Finance only">Margin, commission and overhead are confidential.</Locked>}
        </Card>
      </div>
      <Card className="mt-5" title="Benchmark register" subtitle="Published market indications from the proposal (§4.2). Benchmarks inform; they never set the price." bodyClass="p-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-slate-50/60 text-left text-[11.5px] uppercase tracking-wider text-ink-3">
              <th className="px-5 py-2.5 font-semibold">Source</th><th className="px-3 py-2.5 font-semibold">Segment</th>
              <th className="px-3 py-2.5 font-semibold">Published indication</th><th className="px-3 py-2.5 font-semibold">Reliability</th>
              <th className="px-5 py-2.5 font-semibold">Captured</th>
            </tr>
          </thead>
          <tbody>
            {data.benchmarks.map((b: any) => (
              <tr key={b.source} className="border-b border-line align-top last:border-0">
                <td className="px-5 py-3">
                  <a href={b.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                    {b.source}<ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="mt-0.5 text-[12px] text-ink-3">{b.use}</div>
                </td>
                <td className="px-3 py-3 text-ink-2">{b.segment}</td>
                <td className="px-3 py-3">{b.value}</td>
                <td className="px-3 py-3"><Badge tone="amber">{b.reliability}</Badge></td>
                <td className="px-5 py-3 text-ink-3">{b.captured}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
