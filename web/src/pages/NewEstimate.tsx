import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Briefcase, CalendarCheck, Check, FileUp, GraduationCap, Globe, Loader2, ShieldCheck, ShoppingCart, Smartphone,
  Sparkles, Utensils,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/Layout";
import { Alert, Button, Card, Field } from "../components/ui";
import { api, ApiError } from "../lib/api";
import type { SampleBrief } from "../lib/types";

const ICONS: Record<string, typeof Briefcase> = {
  briefcase: Briefcase, "shopping-cart": ShoppingCart, utensils: Utensils, "graduation-cap": GraduationCap,
  "calendar-check": CalendarCheck,
};
const PLATFORMS = [
  { key: "web", label: "Responsive web", icon: Globe },
  { key: "android", label: "Android", icon: Smartphone },
  { key: "ios", label: "iOS", icon: Smartphone },
];
const PIPELINE = [
  "Redacting personal data",
  "Extracting requirements",
  "Verifying source quotes",
  "Matching the feature catalogue",
  "Checking completeness & conflicts",
  "Calculating effort and cost",
];

function Progress({ claude }: { claude: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, PIPELINE.length - 1)), claude ? 4500 : 350);
    return () => clearInterval(t);
  }, [claude]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-[420px] rounded-2xl bg-surface p-6 shadow-pop">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Sparkles className="h-5 w-5" /></span>
          <div>
            <div className="font-semibold">Analysing the brief</div>
            <div className="text-[12.5px] text-ink-3">{claude ? "Claude typically takes 20–60 seconds" : "Rule-based extractor"}</div>
          </div>
        </div>
        <ol className="mt-5 space-y-2.5">
          {PIPELINE.map((label, i) => (
            <li key={label} className="flex items-center gap-3 text-[13.5px]">
              {i < step ? <Check className="h-4 w-4 text-emerald-600" />
                : i === step ? <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                : <span className="h-4 w-4 rounded-full border border-line" />}
              <span className={clsx(i > step && "text-ink-4", i === step && "font-medium")}>{label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function NewEstimate() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: api.meta, staleTime: Infinity });
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", client_name: "", category: "booking", platforms: ["web"] as string[],
    mobile_approach: "cross_platform", expected_users: "", budget_max: "", target_launch: "", brief: "",
  });
  const [docNote, setDocNote] = useState<{ tone: "success" | "warning" | "critical"; text: string } | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const words = form.brief.trim() ? form.brief.trim().split(/\s+/).length : 0;
  const hasMobile = form.platforms.some((p) => p !== "web");

  const create = useMutation({
    mutationFn: () => api.create({
      title: form.title || undefined,
      client_name: form.client_name || undefined,
      category: form.category,
      platforms: form.platforms,
      mobile_approach: form.mobile_approach,
      expected_users: form.expected_users ? Number(form.expected_users) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
      target_launch: form.target_launch || undefined,
      brief: form.brief,
    }),
    onSuccess: (est) => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
      navigate(`/estimates/${est.id}`);
    },
  });

  const upload = useMutation({
    mutationFn: (f: File) => api.extractDocument(f),
    onSuccess: (d) => {
      set("brief", (form.brief ? form.brief + "\n\n" : "") + d.text);
      setDocNote(d.scanned_suspected
        ? { tone: "warning", text: `${d.filename}: very little text found — it may be a scanned PDF. OCR arrives in phase 2; please paste the text.` }
        : { tone: "success", text: `${d.filename}: ${d.pages} page(s) read; text added to the brief with page markers for citations.` });
    },
    onError: (e: Error) => setDocNote({ tone: "critical", text: e.message }),
  });

  const loadSample = (s: SampleBrief) => setForm((f) => ({
    ...f, title: s.title, client_name: s.client_name, category: s.category, platforms: s.platforms,
    brief: s.brief, expected_users: "", budget_max: "", target_launch: "",
  }));

  const valid = form.brief.trim().length >= 10 && form.platforms.length > 0;

  return (
    <>
      {create.isPending && <Progress claude={meta?.ai_mode === "claude"} />}
      <PageHeader title="New estimate" subtitle="Capture the enquiry. An indicative estimate is produced even when details are incomplete — clearly labelled with its confidence." />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="1 · Project category" subtitle="Selects the reusable feature catalogue and completeness rules">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
              {meta?.categories.map((c) => {
                const Icon = ICONS[c.icon] ?? Briefcase;
                const active = form.category === c.key;
                return (
                  <button key={c.key} type="button" onClick={() => set("category", c.key)} aria-pressed={active}
                    className={clsx("rounded-xl border p-3.5 text-left transition",
                      active ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-100" : "border-line hover:border-slate-300 hover:bg-slate-50")}>
                    <Icon className={clsx("h-5 w-5", active ? "text-brand-700" : "text-ink-3")} />
                    <div className="mt-2 text-[13.5px] font-semibold">{c.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-3">{c.description}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="2 · Client & platform">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Project title"><input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Salon booking app" /></Field>
              <Field label="Client name" hint="Stored separately and redacted before any AI processing">
                <input className="input" value={form.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="e.g. Glow Studio Salons" />
              </Field>
            </div>
            <div className="mt-5">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Target platforms<span className="text-red-600">*</span></span>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const on = form.platforms.includes(p.key);
                  return (
                    <button key={p.key} type="button" aria-pressed={on}
                      onClick={() => set("platforms", on ? form.platforms.filter((x) => x !== p.key) : [...form.platforms, p.key])}
                      className={clsx("inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13.5px] font-medium transition",
                        on ? "border-brand-500 bg-brand-50 text-brand-800" : "border-line text-ink-2 hover:bg-slate-50")}>
                      {on ? <Check className="h-4 w-4" /> : <p.icon className="h-4 w-4" />}{p.label}
                    </button>
                  );
                })}
              </div>
              {hasMobile && (
                <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
                  {[["cross_platform", "Cross-platform (Flutter / React Native)"], ["native", "Native apps"]].map(([k, l]) => (
                    <label key={k} className="inline-flex items-center gap-2">
                      <input type="radio" name="approach" checked={form.mobile_approach === k} onChange={() => set("mobile_approach", k)} className="accent-brand-700" />
                      {l}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Expected users" hint="Registered users in year one">
                <input className="input num" type="number" min={1} value={form.expected_users} onChange={(e) => set("expected_users", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Client budget (₹)" hint="Upper limit, if shared">
                <input className="input num" type="number" min={1000} value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Target launch date">
                <input className="input" type="date" value={form.target_launch} onChange={(e) => set("target_launch", e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title="3 · Requirement brief" subtitle="Paste the client's words, or upload their document (PDF, DOCX, TXT)"
            actions={
              <>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
                <Button variant="secondary" size="sm" loading={upload.isPending} icon={<FileUp className="h-4 w-4" />}
                  onClick={() => fileRef.current?.click()}>Upload document</Button>
              </>
            }>
            {docNote && <Alert tone={docNote.tone} className="mb-3">{docNote.text}</Alert>}
            <textarea className="input min-h-[220px] resize-y leading-relaxed" value={form.brief} onChange={(e) => set("brief", e.target.value)}
              placeholder="Describe what the client wants to build, who will use it, key features, integrations, deadline and budget…" />
            <div className="mt-2 flex items-center justify-between text-[12px] text-ink-3">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Treated as untrusted data · personal details are redacted before AI analysis</span>
              <span className="num">{words} words</span>
            </div>
          </Card>

          {create.isError && <Alert tone="critical" title="Could not create the estimate">{(create.error as ApiError).message}</Alert>}
          <div className="flex items-center justify-end gap-3 pb-6">
            <span className="text-[12.5px] text-ink-3">Indicative results are labelled — never a quotation until approved.</span>
            <Button size="lg" disabled={!valid} loading={create.isPending} onClick={() => create.mutate()} icon={<Sparkles className="h-4 w-4" />}>
              Analyse & estimate
            </Button>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card title="Try a sample brief" subtitle="Realistic enquiries for the demo" bodyClass="p-2">
            {meta?.sample_briefs.map((s) => (
              <button key={s.title} onClick={() => loadSample(s)} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-semibold">{s.title}</span>
                  <span className="text-[11.5px] text-ink-3">{meta.categories.find((c) => c.key === s.category)?.name}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-3">{s.brief}</p>
              </button>
            ))}
          </Card>
          <Card title="What happens next">
            <ol className="space-y-3 text-[13px] text-ink-2">
              {[
                "Requirements are extracted — each one cites the exact sentence it came from.",
                "Missing information becomes clarification questions; defaults become visible assumptions.",
                "The engine computes hours, cost, timeline and three packages — no AI-generated numbers.",
                "Tech Lead and Finance approve before a quotation can be issued.",
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="num grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
