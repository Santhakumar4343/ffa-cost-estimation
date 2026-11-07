import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import { BadgeCheck, Calculator, CheckCircle2, Circle, Printer, Undo2 } from "lucide-react";
import { useState } from "react";
import { Alert, Button, Card } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { addDays, date, dateTime, inr, inrShort, pct } from "../../lib/format";
import type { Estimate } from "../../lib/types";

function ApprovalPanel({ est, onUpdated }: { est: Estimate; onUpdated: (e: Estimate) => void }) {
  const [comment, setComment] = useState("");
  const mut = useMutation({
    mutationFn: (decision: "approve" | "request_changes") =>
      api.approve(est.id, { type: est.permissions.approve!, decision, comment }),
    onSuccess: (e) => { setComment(""); onUpdated(e); },
  });
  const tech = est.approvals.find((a) => a.type === "technical");
  const comm = est.approvals.find((a) => a.type === "commercial");
  const mine = est.permissions.approve;
  const already = est.approvals.some((a) => a.type === mine);
  const blocked = mine === "commercial" && !tech;
  const steps = [
    { key: "technical", label: "Technical approval", who: "Tech Lead", a: tech },
    { key: "commercial", label: "Commercial approval", who: "Finance", a: comm },
  ];
  return (
    <Card title="Approval" subtitle={`Bound to version ${est.version}. Any later edit resets approvals.`}>
      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.key} className="flex items-start gap-3">
            {s.a ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <Circle className="mt-0.5 h-5 w-5 text-slate-300" />}
            <div className="text-[13px]">
              <div className="font-medium">{s.label}</div>
              <div className="text-[12px] text-ink-3">
                {s.a ? `${s.a.by} · ${dateTime(s.a.at)}${s.a.comment ? ` — “${s.a.comment}”` : ""}` : `Awaiting ${s.who}`}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {mine && !already && (
        <div className="mt-4 border-t border-line pt-4">
          {blocked ? <Alert tone="info">Commercial approval opens after technical approval.</Alert> : (
            <>
              <textarea className="input min-h-[64px] text-[13px]" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
              {mut.isError && <Alert tone="critical" className="mt-2">{(mut.error as ApiError).message}</Alert>}
              <div className="mt-2 flex gap-2">
                <Button variant="success" className="flex-1" icon={<BadgeCheck className="h-4 w-4" />} loading={mut.isPending && mut.variables === "approve"}
                  onClick={() => mut.mutate("approve")}>Approve {mine}</Button>
                <Button variant="danger" icon={<Undo2 className="h-4 w-4" />} loading={mut.isPending && mut.variables === "request_changes"}
                  onClick={() => mut.mutate("request_changes")}>Request changes</Button>
              </div>
            </>
          )}
        </div>
      )}
      {!mine && est.status !== "APPROVED" && (
        <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink-3">Switch persona to Tech Lead or Finance to approve.</p>
      )}
    </Card>
  );
}

export default function QuoteTab({ est, onUpdated }: { est: Estimate; onUpdated: (e: Estimate) => void }) {
  const r = est.result;
  const approved = est.status === "APPROVED";
  const issued = est.approvals.find((a) => a.type === "commercial")?.at ?? est.updated_at;
  const standard = r.tiers.find((t) => t.key === "standard") ?? r.tiers[0];
  const firstPrice = r.client_range.expected;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="relative">
        <article className="theme-light print-sheet relative mx-auto max-w-[820px] overflow-hidden rounded-xl border border-line bg-surface px-12 py-10 shadow-lift [print-color-adjust:exact]">
          {!approved && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <span className="rotate-[-24deg] whitespace-nowrap text-[54px] font-bold uppercase tracking-widest text-slate-200/70">Indicative · not a quotation</span>
            </div>
          )}
          <header className="-mx-12 -mt-10 flex items-start justify-between border-b-4 border-gold-400 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-12 pb-7 pt-9 text-white">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">Failure Folks Academy</div>
              <h2 className="mt-1.5 text-[26px] font-semibold">{approved ? "Project Quotation" : "Indicative Estimate"}</h2>
              <div className="mt-1 text-[13px] text-navy-200">{est.title}{est.client_name ? ` · Prepared for ${est.client_name}` : ""}</div>
            </div>
            <div className="text-right text-[12px] text-navy-200">
              <div className="font-mono text-white">{est.ref}-v{est.version}</div>
              <div>Date {date(issued)}</div>
              <div>Valid until {date(addDays(issued, est.validity_days))}</div>
            </div>
          </header>

          <section className="mt-6">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-brand-800">Project summary</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{est.analysis.summary || est.intake.brief.slice(0, 300)}</p>
            <p className="mt-1 text-[12.5px] text-ink-3">Platforms: {est.intake.platforms.map((p) => (p === "ios" ? "iOS" : p[0].toUpperCase() + p.slice(1))).join(", ")} · Category: {est.category_name}</p>
          </section>

          <section className="mt-6">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-brand-800">Investment options (excl. GST)</h3>
            <table className="mt-2 w-full text-[13px]">
              <thead><tr className="border-b border-line text-left text-[11.5px] text-ink-3">
                <th className="py-1.5 font-semibold">Package</th><th className="py-1.5 font-semibold">Scope</th>
                <th className="py-1.5 text-right font-semibold">Duration</th><th className="py-1.5 text-right font-semibold">Budget range</th>
              </tr></thead>
              <tbody>
                {r.tiers.map((t) => (
                  <tr key={t.key} className={clsx("border-b border-line", t.recommended && "bg-brand-50/50")}>
                    <td className="py-2 font-semibold">{t.name}{t.recommended && <span className="ml-1.5 text-[11px] font-medium text-brand-700">(recommended)</span>}</td>
                    <td className="py-2 text-ink-2">{t.features.length} features</td>
                    <td className="num py-2 text-right">{t.weeks} weeks</td>
                    <td className="num py-2 text-right font-medium">{inrShort(t.price.low)} – {inrShort(t.price.high)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-ink-3">GST at {pct(r.cost?.expected.gst_pct ?? "0.18")} is charged additionally. Final price is fixed at SOW sign-off against the confirmed scope.</p>
          </section>

          {standard && (
            <section className="mt-6">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-brand-800">Recommended scope — {standard.name}</h3>
              <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] text-ink-2">
                {standard.features.map((f) => <li key={f.code} className="flex gap-2"><span className="text-accent-600">•</span>{f.name}</li>)}
              </ul>
            </section>
          )}

          <section className="mt-6">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-brand-800">Timeline & payment milestones</h3>
            <table className="mt-2 w-full text-[13px]">
              <tbody>
                {r.timeline.milestones.map((m) => (
                  <tr key={m.name} className="border-b border-line">
                    <td className="py-1.5">{m.name}</td><td className="num py-1.5 text-right text-ink-3">Week {m.week}</td>
                    <td className="num py-1.5 text-right font-medium">{pct(m.payment_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-brand-800">Recurring costs (separate)</h3>
              <ul className="mt-2 space-y-1 text-[12.5px] text-ink-2">
                <li>Cloud hosting: {inr(r.recurring.cloud.monthly_low)}–{inr(r.recurring.cloud.monthly_high)} / month</li>
                <li>Maintenance & support: {inrShort(r.recurring.maintenance.annual_low)}–{inrShort(r.recurring.maintenance.annual_high)} / year</li>
                {r.recurring.third_party.map((t) => <li key={t.item}>{t.description}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-brand-800">Assumptions</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.5px] text-ink-2">{r.assumptions.slice(0, 6).map((a) => <li key={a.text}>{a.text}</li>)}</ul>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-brand-800">Exclusions & commercial terms</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.5px] text-ink-2">
              {r.exclusions.map((x) => <li key={x}>{x}</li>)}
              <li>Changes to the agreed scope follow the change-request process and are estimated separately.</li>
              <li>A written Statement of Work defines deliverables, acceptance criteria, warranty, IP and payment terms.</li>
            </ul>
          </section>

          <footer className="mt-8 flex items-end justify-between border-t border-line pt-4 text-[11.5px] text-ink-3">
            <span>Estimate basis: {r.versions.catalogue} · {r.versions.rate_card} · market data {r.versions.market_data_date}</span>
            <span>{approved ? `Approved: ${est.approvals.map((a) => a.by).join(" & ")}` : "Not yet approved"}</span>
          </footer>
        </article>
      </div>

      <div className="no-print space-y-5">
        <ApprovalPanel est={est} onUpdated={onUpdated} />
        <Card title="Export">
          {approved ? (
            <Alert tone="success" title="Ready to issue">Both approvals recorded on v{est.version}. Print or save as PDF.</Alert>
          ) : (
            <Alert tone="warning" title="Indicative only">Exports carry the “Indicative · not a quotation” watermark until both approvals are recorded.</Alert>
          )}
          <Button className="mt-3 w-full" variant={approved ? "primary" : "secondary"} icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            {approved ? "Print / save quotation PDF" : "Print indicative estimate"}
          </Button>
          {est.permissions.internal && (
            <p className="mt-3 flex gap-2 text-[12px] text-ink-3"><Calculator className="h-4 w-4 shrink-0" />Expected client price {inr(firstPrice)} before GST; the full internal cost sheet is in the Estimate tab.</p>
          )}
          <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-3">Full build: branded PDF rendered server-side, plus an internal XLSX cost sheet.</p>
        </Card>
      </div>
    </div>
  );
}
