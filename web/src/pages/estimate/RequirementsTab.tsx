import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import {
  AlertTriangle, CheckCircle2, CircleDashed, HelpCircle, Lightbulb, Quote, ShieldCheck, XCircle,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Alert, Badge, Button, Card } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import type { Estimate, ExtractedItem } from "../../lib/types";

const KIND_LABEL: Record<string, string> = {
  FEATURE: "Features", ACTOR: "Actors & roles", INTEGRATION: "Integrations", DATA_MIGRATION: "Data & migration",
  REPORT: "Reports", NFR: "Scale & non-functional", CONSTRAINT: "Constraints", WORKFLOW: "Workflows",
  EXTERNAL_DEPENDENCY: "External dependencies",
};
const KIND_ORDER = ["FEATURE", "WORKFLOW", "ACTOR", "INTEGRATION", "REPORT", "DATA_MIGRATION", "NFR", "CONSTRAINT", "EXTERNAL_DEPENDENCY"];

function Provenance({ item }: { item: ExtractedItem }) {
  if (item.basis === "INFERRED") return <Badge tone="amber" icon={<Lightbulb className="h-3 w-3" />}>Inferred</Badge>;
  if (item.verification === "VERIFIED") return <Badge tone="green" icon={<CheckCircle2 className="h-3 w-3" />}>Explicit · verified</Badge>;
  if (item.verification === "FUZZY") return <Badge tone="teal" icon={<CheckCircle2 className="h-3 w-3" />}>Explicit · near match</Badge>;
  return <Badge tone="red" icon={<AlertTriangle className="h-3 w-3" />}>Unverified</Badge>;
}

/** Brief with non-overlapping highlights for every verified quote. */
function HighlightedBrief({ text, items, active, onPick }: {
  text: string; items: ExtractedItem[]; active: string | null; onPick: (id: string) => void;
}) {
  const spans = useMemo(() => {
    const sorted = items.filter((i) => i.start != null && i.end != null).sort((a, b) => a.start! - b.start!);
    const out: { start: number; end: number; ids: string[] }[] = [];
    for (const it of sorted) {
      const last = out[out.length - 1];
      if (last && it.start! < last.end) {
        last.end = Math.max(last.end, it.end!);
        last.ids.push(it.id);
      } else out.push({ start: it.start!, end: it.end!, ids: [it.id] });
    }
    return out;
  }, [items]);
  const parts: JSX.Element[] = [];
  let cursor = 0;
  spans.forEach((s, i) => {
    if (s.start > cursor) parts.push(<Fragment key={`t${i}`}>{text.slice(cursor, s.start)}</Fragment>);
    const isActive = active != null && s.ids.includes(active);
    parts.push(
      <mark key={`m${i}`} data-ids={s.ids.join(" ")} onClick={() => onPick(s.ids[0])}
        className={clsx("hl text-ink", isActive && "hl-active")}>{text.slice(s.start, s.end)}</mark>,
    );
    cursor = s.end;
  });
  if (cursor < text.length) parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  return <div className="whitespace-pre-wrap text-[14px] leading-7 text-ink-2">{parts}</div>;
}

function ConfidencePanel({ est }: { est: Estimate }) {
  const c = est.result.confidence;
  const band = c.band;
  const color = band === "High" ? "bg-emerald-600" : band === "Medium" ? "bg-amber-500" : "bg-red-600";
  return (
    <Card title="Estimate confidence" subtitle="Computed from evidence — not self-reported by the AI">
      <div className="flex items-end justify-between">
        <div className="num text-[34px] font-semibold leading-none tracking-tight">{c.score}<span className="text-[16px] text-ink-4">/100</span></div>
        <Badge tone={band === "High" ? "green" : band === "Medium" ? "amber" : "red"}
          icon={band === "High" ? <CheckCircle2 className="h-3 w-3" /> : band === "Medium" ? <CircleDashed className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}>
          {band}
        </Badge>
      </div>
      {/* Meter with band thresholds at 50 and 75 */}
      <div className="relative mt-3 h-2 rounded-full bg-slate-100" role="meter" aria-valuenow={c.score} aria-valuemin={0} aria-valuemax={100} aria-label="Confidence score">
        <div className={clsx("h-2 rounded-full", color)} style={{ width: `${c.score}%` }} />
        <span className="absolute top-[-3px] h-3.5 w-px bg-slate-400" style={{ left: "50%" }} />
        <span className="absolute top-[-3px] h-3.5 w-px bg-slate-400" style={{ left: "75%" }} />
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] text-ink-4"><span>Low</span><span className="pl-6">Medium</span><span>High</span></div>
      <ul className="mt-4 space-y-3">
        {c.components.map((k) => (
          <li key={k.key}>
            <div className="flex items-baseline justify-between text-[12.5px]">
              <span className="font-medium text-ink-2">{k.label} <span className="text-ink-4">· {k.weight}%</span></span>
              <span className="num text-ink-3">{Math.round(k.value * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${k.value * 100}%` }} /></div>
            <div className="mt-0.5 text-[11.5px] text-ink-3">{k.detail}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Coverage({ est }: { est: Estimate }) {
  const groups = est.result.input_groups;
  return (
    <Card title="Input coverage" subtitle="The nine information groups an estimate needs">
      <ul className="space-y-2">
        {Object.entries(groups).map(([k, g]) => (
          <li key={k} className="flex items-start gap-2.5 text-[13px]">
            {g.status === "PROVIDED" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Provided" />
              : g.status === "PARTIAL" ? <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="Partial" />
              : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-label="Missing" />}
            <span>
              <span className="font-medium text-ink-2">{k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}</span>
              <span className="block text-[12px] text-ink-3">{g.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Questions({ est, onUpdated }: { est: Estimate; onUpdated: (e: Estimate) => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const save = useMutation({ mutationFn: () => api.answer(est.id, draft), onSuccess: (e) => { setDraft({}); onUpdated(e); } });
  const qs = est.result.questions;
  const dirty = Object.values(draft).some((v) => v.trim());
  return (
    <Card title="Clarification questions" subtitle="Ask the client; answers re-run the estimate as a new version"
      actions={<Badge tone={qs.some((q) => q.critical && !q.answer) ? "amber" : "green"}>{qs.filter((q) => !q.answer).length} open</Badge>}>
      {qs.length === 0 ? <p className="text-[13px] text-ink-3">No open questions — inputs are sufficient for a firm estimate.</p> : (
        <div className="space-y-4">
          {qs.map((q) => (
            <div key={q.id}>
              <div className="flex items-start gap-2">
                <HelpCircle className={clsx("mt-0.5 h-4 w-4 shrink-0", q.answer ? "text-emerald-600" : q.critical ? "text-amber-600" : "text-ink-4")} />
                <div className="text-[13px] leading-snug">
                  <span className="font-medium text-ink">{q.text}</span>
                  <div className="mt-0.5 flex gap-1.5">
                    <Badge tone="neutral">{q.group_name}</Badge>
                    {q.critical && <Badge tone="amber">Critical</Badge>}
                  </div>
                </div>
              </div>
              {q.answer ? (
                <div className="ml-6 mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-900">
                  <span className="font-semibold">Client answer: </span>{q.answer}
                </div>
              ) : (
                <textarea className="input ml-6 mt-2 min-h-[38px] w-[calc(100%-1.5rem)] text-[13px]" rows={1} placeholder="Record the client's answer…"
                  value={draft[q.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))} />
              )}
            </div>
          ))}
          {save.isError && <Alert tone="critical">{(save.error as ApiError).message}</Alert>}
          <Button className="w-full" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save answers & re-estimate</Button>
        </div>
      )}
    </Card>
  );
}

export default function RequirementsTab({ est, onUpdated }: { est: Estimate; onUpdated: (e: Estimate) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const a = est.analysis;
  const grouped = useMemo(() => {
    const m: Record<string, ExtractedItem[]> = {};
    a.items.forEach((i) => (m[i.kind] ??= []).push(i));
    return KIND_ORDER.filter((k) => m[k]).map((k) => [k, m[k]] as const);
  }, [a.items]);
  const explicit = a.items.filter((i) => i.basis === "EXPLICIT").length;

  const pick = (id: string) => {
    setActive(id);
    document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  const pickItem = (it: ExtractedItem) => {
    setActive(it.id);
    if (it.start != null) document.querySelector(`mark[data-ids~="${it.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        {a.warnings.map((w) => <Alert key={w} tone="warning">{w}</Alert>)}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Client brief" subtitle="Highlights show the exact text each requirement was taken from"
            actions={a.redactions > 0 ? <Badge tone="teal" icon={<ShieldCheck className="h-3 w-3" />}>{a.redactions} PII redacted for AI</Badge> : undefined}>
            {a.summary && (
              <div className="mb-4 rounded-lg border border-line bg-slate-50 px-3.5 py-3 text-[13px] text-ink-2">
                <div className="label mb-1">Normalised summary</div>{a.summary}
              </div>
            )}
            <div className="max-h-[560px] overflow-y-auto pr-1">
              <HighlightedBrief text={est.intake.brief} items={a.items} active={active} onPick={pick} />
            </div>
          </Card>

          <Card title="Extracted requirements" bodyClass="p-0"
            subtitle={`${explicit} explicit · ${a.items.length - explicit} inferred · ${Math.round((a.verification_ratio ?? 0) * 100)}% of explicit quotes verified`}>
            <div className="max-h-[680px] overflow-y-auto">
              {grouped.map(([kind, items]) => (
                <div key={kind}>
                  <div className="sticky top-0 z-[1] border-b border-line bg-white/95 px-5 py-2 backdrop-blur">
                    <span className="label">{KIND_LABEL[kind] ?? kind}</span> <span className="num text-[11.5px] text-ink-4">{items.length}</span>
                  </div>
                  <ul>
                    {items.map((it) => (
                      <li key={it.id} id={`item-${it.id}`}>
                        <button onClick={() => pickItem(it)}
                          className={clsx("w-full border-b border-line px-5 py-3 text-left transition hover:bg-slate-50",
                            active === it.id && "bg-amber-50/70")}>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[13.5px] font-medium text-ink">{it.statement}</span>
                            <Provenance item={it} />
                          </div>
                          {it.quote && (
                            <div className="mt-1.5 flex gap-1.5 text-[12.5px] italic text-ink-3">
                              <Quote className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="line-clamp-2">{it.quote}{it.page ? ` (p. ${it.page})` : ""}</span>
                            </div>
                          )}
                          {it.inference_reason && <div className="mt-1.5 text-[12.5px] text-amber-800">{it.inference_reason}</div>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <div className="space-y-5">
        <ConfidencePanel est={est} />
        <Questions est={est} onUpdated={onUpdated} />
        <Coverage est={est} />
      </div>
    </div>
  );
}
