import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  BookOpen, ChevronDown, FilePlus2, FileStack, LayoutDashboard, Sparkles, Wallet, Wand2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../lib/api";
import { PERSONAS, usePersona } from "../lib/persona";
import { ThemeToggle } from "../lib/theme";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/estimates/new", label: "New estimate", icon: FilePlus2, end: false },
  { to: "/estimates", label: "Estimates", icon: FileStack, end: true },
];
const NAV2 = [
  { to: "/catalogue", label: "Feature catalogue", icon: BookOpen, end: false },
  { to: "/pricing", label: "Rates & benchmarks", icon: Wallet, end: false },
];

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition",
          isActive
            ? "bg-white/[0.12] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "text-navy-200 hover:bg-white/[0.06] hover:text-white")}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-accent-500 shadow-[0_0_10px_rgba(249,143,3,0.8)]" />}
          <Icon className={clsx("h-[18px] w-[18px]", isActive ? "text-gold-400" : "text-navy-300 group-hover:text-white")} />
          {label}
        </>
      )}
    </NavLink>
  );
}

function PersonaSwitcher() {
  const { role, setRole } = usePersona();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = PERSONAS.find((p) => p.key === role)!;
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg border border-line bg-surface py-1.5 pl-1.5 pr-2.5 shadow-sm hover:bg-slate-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-navy-500 to-navy-800 text-[11px] font-semibold text-white ring-2 ring-white">
          {current.person.split(" ").map((s) => s[0]).join("").slice(0, 2)}
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[13px] font-semibold">{current.person}</span>
          <span className="block text-[11.5px] text-ink-3">{current.name}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-ink-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-line bg-surface p-1.5 shadow-pop" role="listbox">
          <div className="px-2.5 pb-1.5 pt-1 text-[11.5px] text-ink-3">
            Demo: switch persona to see role-based access. The full build uses SSO / MFA login.
          </div>
          {PERSONAS.map((p) => (
            <button
              key={p.key}
              role="option"
              aria-selected={p.key === role}
              onClick={() => { setRole(p.key); setOpen(false); }}
              className={clsx("flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50",
                p.key === role && "bg-brand-50")}
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-100 text-[11px] font-semibold text-ink-2">
                {p.person.split(" ").map((s) => s[0]).join("").slice(0, 2)}
              </span>
              <span>
                <span className="block text-[13px] font-semibold">{p.name} <span className="font-normal text-ink-3">· {p.person}</span></span>
                <span className="block text-[12px] text-ink-3">{p.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AiModeChip() {
  const { data } = useQuery({ queryKey: ["health"], queryFn: api.health, staleTime: 60_000 });
  if (!data) return null;
  return data.ai_mode === "claude" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[12px] font-medium text-violet-700 ring-1 ring-violet-200">
      <Sparkles className="h-3.5 w-3.5" /> AI: Claude ({data.model})
    </span>
  ) : (
    <span title="Set ANTHROPIC_API_KEY on the backend to enable Claude extraction"
      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-ink-2 ring-1 ring-slate-200">
      <Wand2 className="h-3.5 w-3.5" /> AI: offline rule-based extractor
    </span>
  );
}

export function PageHeader({ title, subtitle, actions, crumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {crumbs && <div className="mb-1.5 text-[12.5px] text-ink-3">{crumbs}</div>}
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 px-3 py-4 lg:flex">
        {/* soft glows in the logo's royal blue and orange */}
        <div className="pointer-events-none absolute -left-20 top-40 h-64 w-64 rounded-full bg-navy-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-accent-500/15 blur-3xl" />
        <div className="relative mb-6 rounded-xl bg-white px-3 pb-2.5 pt-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <img src="/ffa-logo.png" alt="Failure Folks Academy — Training | Consulting | Technology Solutions" className="mx-auto h-auto w-[200px]" />
          <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-navy-800 to-navy-600 px-2 py-1 text-[11px] font-semibold text-white">
            <Sparkles className="h-3 w-3 text-gold-400" /> AI Project Cost Estimator
          </div>
        </div>
        <div className="relative mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300/80">Workspace</div>
        <nav className="relative space-y-0.5">{NAV.map((n) => <NavItem key={n.to} {...n} />)}</nav>
        <div className="relative mb-2 mt-7 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300/80">Reference data</div>
        <nav className="relative space-y-0.5">{NAV2.map((n) => <NavItem key={n.to} {...n} />)}</nav>
        <div className="relative mt-auto rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-[11.5px] leading-relaxed text-navy-200">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-gold-400">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> MVP demo
          </div>
          AI structures the brief. A deterministic engine calculates. People approve.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line/80 bg-surface/75 px-6 backdrop-blur-md backdrop-saturate-150">
          <div className="flex items-center gap-3 lg:hidden">
            <img src="/ffa-mark.png" alt="" className="h-7 w-7" />
            <span className="font-semibold text-brand-800">FFA Estimator</span>
          </div>
          <div className="hidden lg:block"><AiModeChip /></div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <PersonaSwitcher />
          </div>
        </header>
        <nav className="no-print flex gap-1 overflow-x-auto border-b border-line bg-surface px-4 py-2 lg:hidden">
          {[...NAV, ...NAV2].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => clsx("whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium",
                isActive ? "bg-brand-50 text-brand-700" : "text-ink-3")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
