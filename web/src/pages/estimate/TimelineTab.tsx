import { Flag, Handshake } from "lucide-react";
import { Card } from "../../components/ui";
import { pct } from "../../lib/format";
import type { Estimate } from "../../lib/types";

export default function TimelineTab({ est }: { est: Estimate }) {
  const t = est.result.timeline;
  const total = Math.max(...t.phases.map((p) => p.end), 1);
  const weeks = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card title="Delivery plan" subtitle={`Expected ${t.days.expected} working days (range ${t.days.low}–${t.days.high}) · AI-assisted build at about ${t.team.ai_hours_per_day} focused hours per day`}>
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="ml-[170px] grid border-b border-line pb-1 text-center text-[10.5px] text-ink-4" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
              {weeks.map((w) => <span key={w}>D{w}</span>)}
            </div>
            {t.phases.map((p, i) => (
              <div key={p.name} className="flex items-center py-2">
                <span className="w-[170px] shrink-0 pr-3 text-[13px] font-medium">{p.name}</span>
                <div className="relative h-8 flex-1 rounded-md bg-slate-100/70">
                  <div className="absolute inset-y-1 flex items-center rounded-[5px] px-2.5 text-[11.5px] font-medium text-white shadow-sm"
                    style={{ left: `${(p.start / total) * 100}%`, width: `${((p.end - p.start) / total) * 100}%`,
                      background: ["#013876", "#0d3d9c", "#1f5fe0", "#f98f03"][i % 4] }}>
                    <span className="num truncate">{p.end - p.start} d</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="relative ml-[170px] mt-1 h-8">
              {t.milestones.map((m) => (
                <div key={m.name} className="absolute -translate-x-1/2 text-center" style={{ left: `${(m.day / total) * 100}%` }} title={m.name}>
                  <Flag className="mx-auto h-4 w-4 fill-gold-400 text-gold-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      <div className="space-y-5">
        <Card title="Milestones & payments" subtitle="Payment split is a Finance placeholder">
          <ol className="space-y-3">
            {t.milestones.map((m, i) => (
              <li key={m.name} className="flex items-start gap-3">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">{i + 1}</span>
                <div className="flex-1 text-[13px]">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-[12px] text-ink-3">{m.day === 0 ? "On confirmation" : `Day ${m.day}`}</div>
                </div>
                <span className="num text-[13px] font-semibold">{pct(m.payment_pct)}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Client responsibilities" subtitle="Dependencies that protect the timeline">
          <ul className="space-y-2 text-[13px] text-ink-2">
            {t.client_dependencies.map((d) => <li key={d} className="flex gap-2"><Handshake className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />{d}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
