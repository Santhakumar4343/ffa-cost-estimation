import { Card } from "../../components/ui";
import { dateTime, inrShort } from "../../lib/format";
import type { Estimate } from "../../lib/types";
import { TraceList } from "./EstimateTab";

export default function HistoryTab({ est }: { est: Estimate }) {
  const r = est.result;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="space-y-5">
        <Card title="Versions" subtitle="Every change recomputes from versioned inputs; history is never overwritten" bodyClass="p-0">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-slate-50/60 text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <th className="px-5 py-2 font-semibold">Version</th><th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">By</th><th className="px-3 py-2 font-semibold">Reason</th>
                <th className="px-3 py-2 text-right font-semibold">Expected</th><th className="px-5 py-2 text-right font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {[...est.history].reverse().map((h) => (
                <tr key={h.version} className="border-b border-line last:border-0">
                  <td className="px-5 py-2 font-mono">v{h.version}</td>
                  <td className="px-3 py-2 text-ink-3">{dateTime(h.at)}</td>
                  <td className="px-3 py-2">{h.by}</td>
                  <td className="px-3 py-2 text-ink-2">{h.reason}</td>
                  <td className="num px-3 py-2 text-right font-medium">{inrShort(h.expected)}</td>
                  <td className="num px-5 py-2 text-right">{h.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Audit log" bodyClass="p-0">
          <ul>
            {[...est.audit].reverse().map((a, i) => (
              <li key={i} className="flex items-start gap-4 border-b border-line px-5 py-2.5 text-[13px] last:border-0">
                <span className="w-32 shrink-0 text-ink-3">{dateTime(a.at)}</span>
                <span className="w-28 shrink-0 font-medium">{a.by}</span>
                <span className="text-ink-2">{a.action}{a.detail && <span className="text-ink-3"> — {a.detail}</span>}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Reproducibility" subtitle="Recorded on this estimate version">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            {Object.entries(r.versions).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line py-1"><dt className="text-ink-3">{k.replace(/_/g, " ")}</dt><dd className="font-mono text-[12px]">{v}</dd></div>
            ))}
            <div className="flex justify-between border-b border-line py-1"><dt className="text-ink-3">extraction</dt><dd className="font-mono text-[12px]">{est.analysis.mode} · {est.analysis.prompt_version}</dd></div>
            {est.analysis.model && <div className="flex justify-between border-b border-line py-1"><dt className="text-ink-3">model</dt><dd className="font-mono text-[12px]">{est.analysis.model}</dd></div>}
            {est.analysis.usage && <div className="flex justify-between border-b border-line py-1"><dt className="text-ink-3">tokens in/out</dt><dd className="font-mono text-[12px]">{est.analysis.usage.input_tokens} / {est.analysis.usage.output_tokens}</dd></div>}
          </dl>
        </Card>
      </div>
      <Card title="Calculation trace" subtitle={est.permissions.internal ? "Complete trace" : "Internal cost lines hidden for your role"}>
        <TraceList entries={r.trace} />
      </Card>
    </div>
  );
}
