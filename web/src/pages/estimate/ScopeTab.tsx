import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Lock, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Skeleton } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { usePersona } from "../../lib/persona";
import type { CatalogueFeature, Estimate } from "../../lib/types";

const TIER_TONE = { essential: "brand", recommended: "teal", advanced: "violet" } as const;

export default function ScopeTab({ est, onUpdated }: { est: Estimate; onUpdated: (e: Estimate) => void }) {
  const { role } = usePersona();
  const canEdit = est.permissions.edit_scope;
  const canOverride = role === "techlead" || role === "finance";
  const { data: catalogue, isLoading } = useQuery({ queryKey: ["catalogue", est.category], queryFn: () => api.catalogue(est.category), staleTime: Infinity });

  const initial = () => ({
    features: new Set(est.scope.feature_codes),
    addons: new Set(est.scope.addon_codes),
    custom: est.scope.custom_modules.map((m) => ({ ...m })),
    overrides: { ...est.scope.complexity_overrides } as Record<string, number>,
    approach: est.intake.mobile_approach || "cross_platform",
  });
  const [s, setS] = useState(initial);
  const [reason, setReason] = useState("");
  const [newMod, setNewMod] = useState({ name: "", hours: "" });
  useEffect(() => setS(initial()), [est.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const fromBrief = useMemo(() => {
    const m: Record<string, "explicit" | "inferred"> = {};
    est.analysis.items.forEach((i) => { if (i.feature_code) m[i.feature_code] = i.basis === "EXPLICIT" ? "explicit" : (m[i.feature_code] ?? "inferred"); });
    return m;
  }, [est.analysis.items]);

  const byModule = useMemo(() => {
    const m: Record<string, CatalogueFeature[]> = {};
    (catalogue ?? []).forEach((f) => (m[f.module] ??= []).push(f));
    return Object.entries(m);
  }, [catalogue]);

  const dirty = JSON.stringify([[...s.features].sort(), [...s.addons].sort(), s.custom, s.overrides, s.approach])
    !== JSON.stringify([[...est.scope.feature_codes].sort(), [...est.scope.addon_codes].sort(), est.scope.custom_modules, est.scope.complexity_overrides, est.intake.mobile_approach || "cross_platform"]);

  const save = useMutation({
    mutationFn: () => api.updateScope(est.id, {
      feature_codes: [...s.features], addon_codes: [...s.addons], custom_modules: s.custom,
      complexity_overrides: s.overrides, mobile_approach: s.approach, reason: reason || undefined,
    }),
    onSuccess: (e) => { setReason(""); onUpdated(e); },
  });

  const toggle = (set: "features" | "addons", code: string) => setS((st) => {
    const next = new Set(st[set]);
    next.has(code) ? next.delete(code) : next.add(code);
    const other = set === "features" ? new Set(st.addons) : new Set(st.features);
    if (next.has(code)) other.delete(code);
    return set === "features" ? { ...st, features: next, addons: other } : { ...st, addons: next, features: other };
  });

  const hasMobile = est.intake.platforms.some((p) => p !== "web");
  const factors = est.result.complexity.factors;

  return (
    <div className="space-y-5 pb-24">
      {!canEdit && (
        <Alert tone="info" title="Read-only for your role">
          Scope is edited by the Business Analyst, Tech Lead or Finance. Switch persona to try it.
        </Alert>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Feature scope" subtitle="Reusable features from the versioned catalogue. Tier tags drive the Basic / Standard / Premium packages." bodyClass="p-0">
          {isLoading ? <div className="p-5"><Skeleton className="h-64" /></div> : (
            <div className="divide-y divide-line">
              {byModule.map(([module, feats]) => (
                <div key={module} className="px-5 py-3.5">
                  <div className="label mb-2">{module}</div>
                  <ul className="space-y-1">
                    {feats.map((f) => {
                      const on = s.features.has(f.code);
                      const addon = s.addons.has(f.code);
                      const likely = Object.values(f.hours).reduce((a, h) => a + h[1], 0);
                      return (
                        <li key={f.code} className={clsx("flex items-center gap-3 rounded-lg px-2 py-1.5", on && "bg-brand-50/50")}>
                          <input type="checkbox" checked={on} disabled={!canEdit} onChange={() => toggle("features", f.code)}
                            className="h-4 w-4 rounded accent-brand-700" aria-label={`Include ${f.name}`} />
                          <span className="min-w-0 flex-1">
                            <span className="text-[13.5px] font-medium">{f.name}</span>
                            <span className="ml-2 font-mono text-[11px] text-ink-4">{f.code}</span>
                          </span>
                          {fromBrief[f.code] === "explicit" && <Badge tone="green">From brief</Badge>}
                          {fromBrief[f.code] === "inferred" && <Badge tone="amber">Inferred</Badge>}
                          <Badge tone={TIER_TONE[f.tier]}>{f.tier}</Badge>
                          <span className="num w-16 text-right text-[12px] text-ink-3" title="Catalogue likely hours before platform & complexity adjustments">~{likely} h</span>
                          {f.tier === "advanced" && !on && (
                            <button disabled={!canEdit} onClick={() => toggle("addons", f.code)}
                              className={clsx("rounded-md px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset transition disabled:opacity-50",
                                addon ? "bg-violet-600 text-white ring-violet-600" : "text-violet-700 ring-violet-200 hover:bg-violet-50")}>
                              {addon ? "Premium add-on ✓" : "Offer in Premium"}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Custom modules" subtitle="Work not in the catalogue — lowers catalogue coverage in the confidence score">
            {s.custom.length === 0 && <p className="mb-3 text-[13px] text-ink-3">None. Add bespoke work the catalogue doesn't cover.</p>}
            <ul className="mb-3 space-y-2">
              {s.custom.map((m, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[13px]">
                  <span className="font-medium">{m.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="num text-ink-3">{m.hours} h</span>
                    {canEdit && <button onClick={() => setS((st) => ({ ...st, custom: st.custom.filter((_, j) => j !== i) }))}
                      aria-label={`Remove ${m.name}`} className="text-ink-4 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                  </span>
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="flex gap-2">
                <input className="input" placeholder="Module name" value={newMod.name} onChange={(e) => setNewMod({ ...newMod, name: e.target.value })} />
                <input className="input num w-24" type="number" min={1} placeholder="Hours" value={newMod.hours} onChange={(e) => setNewMod({ ...newMod, hours: e.target.value })} />
                <Button variant="secondary" icon={<Plus className="h-4 w-4" />} aria-label="Add custom module"
                  disabled={newMod.name.trim().length < 2 || !(Number(newMod.hours) > 0)}
                  onClick={() => { setS((st) => ({ ...st, custom: [...st.custom, { name: newMod.name.trim(), hours: Number(newMod.hours) }] })); setNewMod({ name: "", hours: "" }); }} />
              </div>
            )}
          </Card>

          <Card title="Complexity assessment" subtitle={`Suggested from scope; ${est.result.complexity.band} band → ×${est.result.complexity.multiplier} on build effort`}
            actions={!canOverride ? <Badge tone="neutral" icon={<Lock className="h-3 w-3" />}>Tech Lead</Badge> : undefined}>
            <table className="w-full text-[13px]">
              <tbody>
                {factors.map((f) => {
                  const val = s.overrides[f.key] ?? f.score;
                  return (
                    <tr key={f.key} className="border-b border-line last:border-0">
                      <td className="py-1.5 pr-2">
                        {f.name}
                        {f.unknown && s.overrides[f.key] == null && <Badge tone="amber" className="ml-1.5">unknown</Badge>}
                        {s.overrides[f.key] != null && <Badge tone="violet" className="ml-1.5">override</Badge>}
                      </td>
                      <td className="py-1.5 text-right">
                        <select className="rounded-md border border-line bg-surface px-2 py-1 text-[12.5px] disabled:bg-slate-50" value={val}
                          disabled={!canOverride} aria-label={`${f.name} score`}
                          onChange={(e) => setS((st) => ({ ...st, overrides: { ...st.overrides, [f.key]: Number(e.target.value) } }))}>
                          {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n} — {["None", "Low", "Medium", "High"][n]}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {canOverride && Object.keys(s.overrides).length > 0 && (
              <button className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-ink"
                onClick={() => setS((st) => ({ ...st, overrides: {} }))}><RotateCcw className="h-3.5 w-3.5" /> Reset to suggested</button>
            )}
          </Card>

          {hasMobile && (
            <Card title="Mobile approach">
              <div className="space-y-2 text-[13px]">
                {[["cross_platform", "Cross-platform (one codebase)"], ["native", "Native Android + iOS (×1.8 mobile effort)"]].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="radio" name="approach" disabled={!canEdit} checked={s.approach === k}
                      onChange={() => setS((st) => ({ ...st, approach: k }))} className="accent-brand-700" />{l}
                  </label>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {canEdit && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:pl-64">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-8 py-3">
            <span className="text-[13px] font-medium">Unsaved scope changes</span>
            <span className="text-[12.5px] text-ink-3">Recalculating creates v{est.version + 1}{est.approvals.length ? " and resets approvals" : ""}.</span>
            <div className="ml-auto flex items-center gap-2">
              {save.isError && <span className="text-[12.5px] text-red-700">{(save.error as ApiError).message}</span>}
              <input className="input w-72" placeholder="Reason for change (recorded in the trace)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button variant="ghost" onClick={() => setS(initial())}>Discard</Button>
              <Button loading={save.isPending} onClick={() => save.mutate()}>Recalculate</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
