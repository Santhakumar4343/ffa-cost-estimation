import clsx from "clsx";
import { Check, Plus, Star } from "lucide-react";
import { Alert, Badge } from "../../components/ui";
import { inrShort, num } from "../../lib/format";
import type { Estimate } from "../../lib/types";

export default function PackagesTab({ est }: { est: Estimate }) {
  const tiers = est.result.tiers;
  const base = new Set(tiers[0]?.features.map((f) => f.code));
  return (
    <div className="space-y-5">
      <Alert tone="info" title="Packages differ by scope, not by price multipliers">
        Each package is a separate run of the estimation engine on a different feature set, so every price difference is explained by features.
      </Alert>
      <div className={clsx("grid gap-5", tiers.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        {tiers.map((t) => (
          <section key={t.key} className={clsx("card card-hover relative flex flex-col overflow-hidden", t.recommended && "border-brand-300 shadow-glow")}>
            <div className={clsx("relative border-b px-6 py-5", t.recommended ? "overflow-hidden border-transparent bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 text-white [&_.sub]:!text-navy-200" : "border-line-soft")}>
              {t.recommended && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gold-400 px-2.5 py-0.5 text-[11px] font-semibold text-navy-950">
                  <Star className="h-3 w-3 fill-navy-950" /> Recommended
                </span>
              )}
              <h3 className="text-[17px] font-semibold">{t.name}</h3>
              <p className="sub mt-0.5 text-[12.5px] text-ink-3">{t.description}</p>
              <div className="num mt-4 text-[24px] font-semibold tracking-tight">
                {inrShort(t.price.low)} – {inrShort(t.price.high)}
              </div>
              <div className="sub mt-0.5 text-[12.5px] text-ink-3">Expected {inrShort(t.price.expected)} · excl. GST</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
                <div className={clsx("rounded-lg px-3 py-2", t.recommended ? "bg-white/10 ring-1 ring-inset ring-white/10" : "bg-slate-50")}><div className="sub text-ink-3">Duration</div><div className="num font-semibold">{t.weeks} weeks</div></div>
                <div className={clsx("rounded-lg px-3 py-2", t.recommended ? "bg-white/10 ring-1 ring-inset ring-white/10" : "bg-slate-50")}><div className="sub text-ink-3">Effort</div><div className="num font-semibold">{num(t.hours_expected)} h</div></div>
              </div>
            </div>
            <ul className="flex-1 space-y-2 px-6 py-5 text-[13px]">
              {t.features.map((f) => {
                const extra = t.key !== tiers[0].key && !base.has(f.code);
                return (
                  <li key={f.code} className="flex items-start gap-2">
                    {extra ? <Plus className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> : <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                    <span className={clsx(extra && "font-medium")}>{f.name}</span>
                    {f.addon && <Badge tone="violet" className="ml-auto">add-on</Badge>}
                    {f.tier === "custom" && <Badge tone="neutral" className="ml-auto">custom</Badge>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
