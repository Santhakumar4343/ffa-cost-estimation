import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "../components/Layout";
import { Badge, Card, Skeleton, Tabs } from "../components/ui";
import { api } from "../lib/api";

const WS = ["design", "frontend", "backend", "mobile", "integration"] as const;
const WS_LABEL: Record<string, string> = { design: "Design", frontend: "Web FE", backend: "Backend", mobile: "Mobile", integration: "Integr." };
const TIER_TONE = { essential: "brand", recommended: "teal", advanced: "violet" } as const;

export default function Catalogue() {
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: api.meta, staleTime: Infinity });
  const [cat, setCat] = useState("booking");
  const { data, isLoading } = useQuery({ queryKey: ["catalogue", cat], queryFn: () => api.catalogue(cat), staleTime: Infinity });

  return (
    <>
      <PageHeader title="Feature catalogue" subtitle={`Traditional-equivalent effort per feature (hours) — the engine converts these to AI-assisted hours · ${meta?.versions.catalogue ?? ""}`} />
      <Card bodyClass="p-0">
        <div className="px-5 pt-2">
          <Tabs value={cat} onChange={setCat} tabs={(meta?.categories ?? []).map((c) => ({ key: c.key, label: c.name }))} />
        </div>
        {isLoading ? <div className="p-5"><Skeleton className="h-80" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-slate-50/60 text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <th className="px-5 py-2.5 font-semibold">Feature</th>
                  <th className="px-3 py-2.5 font-semibold">Module</th>
                  <th className="px-3 py-2.5 font-semibold">Tier</th>
                  {WS.map((w) => <th key={w} className="px-3 py-2.5 text-right font-semibold">{WS_LABEL[w]}</th>)}
                  <th className="px-5 py-2.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((f) => {
                  const total = Object.values(f.hours).reduce((a, h) => a + h[1], 0);
                  return (
                    <tr key={f.code} className="border-b border-line last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-2.5">
                        <div className="font-medium">{f.name}</div>
                        <div className="mt-0.5 flex gap-1.5">
                          <span className="font-mono text-[11px] text-ink-4">{f.code}</span>
                          {f.admin && <Badge tone="neutral">admin web</Badge>}
                          {f.sensitive && <Badge tone="red">sensitive</Badge>}
                          {f.realtime && <Badge tone="amber">real-time</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-ink-2">{f.module}</td>
                      <td className="px-3 py-2.5"><Badge tone={TIER_TONE[f.tier]}>{f.tier}</Badge></td>
                      {WS.map((w) => (
                        <td key={w} className="num px-3 py-2.5 text-right text-ink-2" title={f.hours[w] ? `low ${f.hours[w][0]} · likely ${f.hours[w][1]} · high ${f.hours[w][2]}` : undefined}>
                          {f.hours[w] ? f.hours[w][1] : <span className="text-ink-4">—</span>}
                        </td>
                      ))}
                      <td className="num px-5 py-2.5 text-right font-semibold">{total} h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-line px-5 py-3 text-[12px] text-ink-3">
              Traditional-equivalent likely hours shown (hover for low / likely / high); pricing uses AI-assisted hours = these × the AI productivity factor. Demo placeholders — in production the BA and Tech Lead own and review these values; each change is versioned and audited.
            </p>
          </div>
        )}
      </Card>
    </>
  );
}
