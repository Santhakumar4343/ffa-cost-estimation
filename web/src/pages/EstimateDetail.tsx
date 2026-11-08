import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  BarChart3, Check, ClipboardList, FileText, GitBranch, Layers, ListChecks, Package, Sparkles, Wand2, CalendarRange,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Alert, Badge, ConfidenceRing, EmptyState, PageLoader, StatusPill, Tabs } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { date, inr } from "../lib/format";
import type { Estimate } from "../lib/types";
import EstimateTab from "./estimate/EstimateTab";
import HistoryTab from "./estimate/HistoryTab";
import PackagesTab from "./estimate/PackagesTab";
import QuoteTab from "./estimate/QuoteTab";
import RequirementsTab from "./estimate/RequirementsTab";
import ScopeTab from "./estimate/ScopeTab";
import TimelineTab from "./estimate/TimelineTab";

type TabKey = "requirements" | "scope" | "estimate" | "packages" | "timeline" | "quote" | "history";

function Stepper({ est }: { est: Estimate }) {
  const criticalOpen = est.result.questions.filter((q) => q.critical && !q.answer).length;
  const tech = est.approvals.some((a) => a.type === "technical" && a.decision === "approve");
  const comm = est.approvals.some((a) => a.type === "commercial" && a.decision === "approve");
  const steps = [
    { label: "Analysed", done: true, note: est.analysis.mode === "claude" ? "Claude" : "Rule-based" },
    { label: "Clarified", done: est.status !== "NEEDS_CLARIFICATION",
      note: est.status === "NEEDS_CLARIFICATION" ? `${criticalOpen} critical open`
        : criticalOpen ? `Proceeding on assumptions · ${criticalOpen} open` : "Inputs sufficient" },
    { label: "Technical approval", done: tech, note: tech ? "Tech Lead" : "Pending" },
    { label: "Commercial approval", done: comm, note: comm ? "Finance" : "Pending" },
    { label: "Ready to issue", done: est.status === "APPROVED", note: est.status === "APPROVED" ? "Quotation" : "Indicative only" },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2.5">
          <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
            s.done ? "bg-emerald-500 text-white shadow-[0_2px_6px_-2px_rgba(16,185,129,0.6)]" : i === current ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-surface text-ink-4 ring-1 ring-line")}>
            {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className="min-w-0 leading-tight">
            <span className={clsx("block truncate text-[12.5px] font-semibold", !s.done && i !== current && "text-ink-3")}>{s.label}</span>
            <span className="block truncate text-[11.5px] text-ink-3">{s.note}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function EstimateDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabKey) || "requirements";
  const setTab = (t: TabKey) => setParams((p) => { p.set("tab", t); return p; }, { replace: true });
  const { data: est, isLoading, error } = useQuery({ queryKey: ["estimate", Number(id)], queryFn: () => api.get(Number(id)) });

  if (isLoading) return <PageLoader />;
  if (error || !est) {
    return <EmptyState title="Estimate not available">{(error as ApiError)?.message ?? "Not found"}</EmptyState>;
  }

  const onUpdated = (e: Estimate) => {
    qc.setQueryData(["estimate", e.id], e);
    qc.invalidateQueries({ queryKey: ["estimates"] });
  };
  const r = est.result;
  const flags = [...r.commercial_flags, ...est.analysis.conflicts];
  const openQuestions = r.questions.filter((q) => !q.answer).length;

  return (
    <>
      <div className="mb-3 text-[12.5px] text-ink-3 no-print">
        <Link to="/estimates" className="hover:text-brand-700">Estimates</Link> <span className="text-ink-4">/</span> <span className="text-ink-2">{est.title}</span>
      </div>

      <section className="card no-print mb-5 overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12px] text-ink-4">{est.ref}</span>
              <StatusPill status={est.status} />
              <Badge tone="neutral"><GitBranch className="h-3 w-3" />v{est.version}</Badge>
              {est.analysis.mode === "claude"
                ? <Badge tone="violet" icon={<Sparkles className="h-3 w-3" />}>Claude · {est.analysis.model}</Badge>
                : <Badge tone="neutral" icon={<Wand2 className="h-3 w-3" />}>Rule-based extraction</Badge>}
            </div>
            <h1 className="mt-2 text-[24px] font-semibold tracking-tight">{est.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
              {est.client_name && <><span className="font-medium text-ink-2">{est.client_name}</span><span className="text-line">•</span></>}
              <span>{est.category_name}</span><span className="text-line">•</span>
              <span>{est.intake.platforms.map((p) => (p === "ios" ? "iOS" : p[0].toUpperCase() + p.slice(1))).join(" · ")}</span><span className="text-line">•</span>
              <span>Created {date(est.created_at)} by {est.created_by}</span>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-6 py-5 text-white md:min-w-[440px]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-400/30 blur-3xl" />
            <div className="relative flex items-start justify-between gap-6">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-200">Indicative budget · excl. GST</div>
                <div className="num mt-1.5 whitespace-nowrap text-[28px] font-bold tracking-tight text-gold-400">
                  {inr(r.client_range.low)} <span className="text-gold-200/70">–</span> {inr(r.client_range.high)}
                </div>
                <div className="num mt-1 text-[12.5px] text-navy-200">
                  Expected <span className="font-semibold text-white">{inr(r.client_range.expected)}</span> · {r.timeline.days.expected} working days
                </div>
              </div>
              <ConfidenceRing score={r.confidence.score} band={r.confidence.band} size={58} onDark />
            </div>
          </div>
        </div>
        <div className="border-t border-line-soft bg-slate-50/50 px-6 py-3.5"><Stepper est={est} /></div>
      </section>

      {flags.length > 0 && tab !== "quote" && (
        <div className="no-print mb-5 grid gap-2.5 md:grid-cols-2">
          {flags.map((f, i) => (
            <Alert key={i} tone={f.severity === "critical" ? "critical" : "warning"}
              title={f.kind === "timeline" ? "Timeline risk" : f.kind === "budget" ? "Budget gap" : f.kind === "cap" ? "₹1,00,000 limit reached" : f.kind === "platform" ? "Scope conflict" : "Conflicting requirement"}>
              {f.description}
            </Alert>
          ))}
        </div>
      )}

      <div className="no-print">
        <Tabs<TabKey>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "requirements", label: "Requirements", icon: <ClipboardList className="h-4 w-4" />, count: openQuestions || undefined },
            { key: "scope", label: "Scope", icon: <Layers className="h-4 w-4" />, count: est.scope.feature_codes.length + est.scope.custom_modules.length },
            { key: "estimate", label: "Estimate", icon: <BarChart3 className="h-4 w-4" /> },
            { key: "packages", label: "Packages", icon: <Package className="h-4 w-4" />, count: r.tiers.length },
            { key: "timeline", label: "Timeline", icon: <CalendarRange className="h-4 w-4" /> },
            { key: "quote", label: "Quote & approval", icon: <FileText className="h-4 w-4" /> },
            { key: "history", label: "History & trace", icon: <ListChecks className="h-4 w-4" /> },
          ]}
        />
      </div>
      <div className="mt-5">
        {tab === "requirements" && <RequirementsTab est={est} onUpdated={onUpdated} />}
        {tab === "scope" && <ScopeTab est={est} onUpdated={onUpdated} />}
        {tab === "estimate" && <EstimateTab est={est} />}
        {tab === "packages" && <PackagesTab est={est} />}
        {tab === "timeline" && <TimelineTab est={est} />}
        {tab === "quote" && <QuoteTab est={est} onUpdated={onUpdated} />}
        {tab === "history" && <HistoryTab est={est} />}
      </div>
    </>
  );
}
