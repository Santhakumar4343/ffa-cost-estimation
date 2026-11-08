import { useQuery } from "@tanstack/react-query";
import { FilePlus2, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/Layout";
import { Button, Card, ConfidenceBadge, EmptyState, Skeleton, StatusPill } from "../components/ui";
import { api } from "../lib/api";
import { dateTime, inr, shortDate } from "../lib/format";
import type { EstimateSummary } from "../lib/types";

export function EstimatesTable({ rows }: { rows: EstimateSummary[] }) {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line bg-slate-50/60 text-[11.5px] uppercase tracking-wider text-ink-3">
            <th className="px-5 py-2.5 font-semibold">Estimate</th>
            <th className="px-3 py-2.5 font-semibold">Category</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">Range (excl. GST)</th>
            <th className="px-3 py-2.5 text-right font-semibold">Duration</th>
            <th className="px-3 py-2.5 font-semibold">Confidence</th>
            <th className="px-5 py-2.5 text-right font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} onClick={() => navigate(`/estimates/${e.id}`)}
              className="cursor-pointer border-b border-line last:border-0 hover:bg-slate-50/80">
              <td className="px-5 py-3">
                <Link to={`/estimates/${e.id}`} className="font-medium text-ink hover:text-brand-700" onClick={(ev) => ev.stopPropagation()}>
                  {e.title}
                </Link>
                <div className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[12px] text-ink-3">
                  <span className="font-mono">{e.ref}</span>·<span>v{e.version}</span>
                  {e.client_name && <>·<span>{e.client_name}</span></>}
                  {e.ai_mode === "claude" && <Sparkles className="h-3 w-3 text-violet-500" aria-label="Claude extraction" />}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-ink-2">{e.category_name}</td>
              <td className="px-3 py-3"><StatusPill status={e.status} /></td>
              <td className="num whitespace-nowrap px-3 py-3 text-right font-medium">{inr(e.client_range.low)} – {inr(e.client_range.high)}</td>
              <td className="num px-3 py-3 text-right text-ink-2">{e.days} days</td>
              <td className="px-3 py-3"><ConfidenceBadge band={e.confidence_band} score={e.confidence} /></td>
              <td className="whitespace-nowrap px-5 py-3 text-right text-[12.5px] text-ink-3" title={dateTime(e.updated_at)}>{shortDate(e.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EstimatesList() {
  const { data, isLoading } = useQuery({ queryKey: ["estimates"], queryFn: api.list });
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const status = params.get("status") ?? "";
  const rows = useMemo(() => (data ?? []).filter((e) =>
    (!status || e.status === status)
    && (!q || `${e.title} ${e.client_name} ${e.ref} ${e.category_name}`.toLowerCase().includes(q.toLowerCase()))), [data, q, status]);

  return (
    <>
      <PageHeader title="Estimates" subtitle="Every estimate is versioned; approvals are bound to an exact version."
        actions={<Link to="/estimates/new"><Button icon={<FilePlus2 className="h-4 w-4" />}>New estimate</Button></Link>} />
      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input className="input pl-9" placeholder="Search by title, client or reference" value={q}
              onChange={(e) => { setQ(e.target.value); setParams((p) => { e.target.value ? p.set("q", e.target.value) : p.delete("q"); return p; }); }} />
          </div>
          <select className="input w-auto" value={status} aria-label="Filter by status"
            onChange={(e) => setParams((p) => { e.target.value ? p.set("status", e.target.value) : p.delete("status"); return p; })}>
            <option value="">All statuses</option>
            <option value="NEEDS_CLARIFICATION">Needs clarification</option>
            <option value="ESTIMATED">Estimated</option>
            <option value="TECH_APPROVED">Tech approved</option>
            <option value="APPROVED">Approved</option>
            <option value="CHANGES_REQUESTED">Changes requested</option>
          </select>
        </div>
        {isLoading ? <div className="p-5"><Skeleton className="h-48" /></div>
          : rows.length ? <EstimatesTable rows={rows} />
          : <EmptyState title={data?.length ? "No estimates match your filters" : "No estimates yet"}>
              {data?.length ? "Try a different search term or status." : "Create one from a sample brief to get started."}
            </EmptyState>}
      </Card>
    </>
  );
}
