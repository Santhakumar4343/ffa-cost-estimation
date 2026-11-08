import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, BadgeCheck, Brain, Calculator, ClipboardList, FilePlus2, FileStack, HelpCircle, ShieldCheck, Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { EstimatesTable } from "./EstimatesList";
import { Button, Card, EmptyState, Skeleton, Stat } from "../components/ui";
import { api } from "../lib/api";
import { inr, toNum } from "../lib/format";
import { PERSONAS, usePersona } from "../lib/persona";

const STEPS = [
  { icon: ClipboardList, title: "Capture the brief", text: "Plain-language brief, platform and constraints — or upload the client's document." },
  { icon: Brain, title: "AI structures the scope", text: "Requirements extracted with verified source quotes; gaps and conflicts flagged." },
  { icon: Calculator, title: "Engine calculates", text: "Hours × approved rates, contingency, overhead, commission and margin — fully traceable." },
  { icon: ShieldCheck, title: "People approve", text: "Technical and commercial approval before any quotation leaves the company." },
];

export default function Dashboard() {
  const { role } = usePersona();
  const persona = PERSONAS.find((p) => p.key === role)!;
  const { data, isLoading } = useQuery({ queryKey: ["estimates"], queryFn: api.list });
  const list = data ?? [];
  const awaiting = list.filter((e) => ["ESTIMATED", "TECH_APPROVED"].includes(e.status)).length;
  const clarify = list.filter((e) => e.status === "NEEDS_CLARIFICATION").length;
  const pipeline = list.reduce((s, e) => s + toNum(e.client_range.expected), 0);
  const avgConf = list.length ? Math.round(list.reduce((s, e) => s + e.confidence, 0) / list.length) : 0;

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-7 py-7 text-white shadow-glow">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-40 h-60 w-60 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] font-medium text-navy-100 ring-1 ring-inset ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> Signed in as {persona.name}
            </div>
            <h1 className="mt-3 text-[26px] font-semibold tracking-tight">Good day, {persona.person.split(" ")[0]}</h1>
            <p className="mt-1 max-w-xl text-[14px] text-navy-100">
              Turn a client's brief into <span className="rounded bg-gold-400 px-1.5 py-0.5 font-semibold text-navy-950">instant, defensible quotations</span> for web &amp; mobile projects — from ₹5,000 to ₹1,00,000. {persona.blurb}.
            </p>
          </div>
          <Link to="/estimates/new">
            <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-[14.5px] font-semibold text-navy-800 shadow-lg shadow-navy-950/30 transition hover:bg-navy-50">
              <FilePlus2 className="h-4 w-4" /> New estimate
            </button>
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[112px]" />) : (
          <>
            <Stat featured label="Pipeline (expected)" value={inr(pipeline)} sub={list.length ? `Avg. confidence ${avgConf}/100 · excl. GST` : "Excl. GST"} icon={<Wallet className="h-4 w-4" />} />
            <Stat label="Estimates" value={list.length} sub="Every version tracked" icon={<FileStack className="h-4 w-4" />} tone="brand" />
            <Stat label="Awaiting approval" value={awaiting} sub="Technical or commercial" icon={<BadgeCheck className="h-4 w-4" />} tone="violet" />
            <Stat label="Needs clarification" value={clarify} sub="Critical inputs missing" icon={<HelpCircle className="h-4 w-4" />} tone="amber" />
          </>
        )}
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-line-soft px-5 py-3.5">
          <h3 className="text-[14.5px] font-semibold">How an estimate is produced</h3>
        </div>
        <ol className="grid md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative px-5 py-5">
              {i < STEPS.length - 1 && <span className="absolute right-0 top-[38px] hidden h-px w-1/2 bg-gradient-to-r from-transparent to-line md:block" />}
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ring-inset ${i === 1 ? "bg-accent-50 text-accent-600 ring-accent-100" : i === 3 ? "bg-gold-50 text-gold-600 ring-gold-100" : "bg-brand-50 text-brand-600 ring-brand-100"}`}>
                  <s.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="num text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">Step 0{i + 1}</span>
              </div>
              <div className="mt-3 text-[14px] font-semibold">{s.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <Card
        className="mt-6"
        title="Recent estimates"
        subtitle="Client-facing ranges exclude GST"
        actions={<Link to="/estimates" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
        bodyClass="p-0"
      >
        {isLoading ? <div className="p-5"><Skeleton className="h-40" /></div> : list.length === 0 ? (
          <EmptyState icon={<FilePlus2 className="h-5 w-5" />} title="No estimates yet"
            action={<Link to="/estimates/new"><Button>Create the first estimate</Button></Link>}>
            Start with a sample brief to see extraction, costing and approvals end-to-end.
          </EmptyState>
        ) : <EstimatesTable rows={list.slice(0, 6)} />}
      </Card>
    </>
  );
}
