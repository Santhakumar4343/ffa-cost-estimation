import clsx from "clsx";
import {
  AlertTriangle, CheckCircle2, CircleDashed, CircleHelp, Info, Loader2, Lock, ShieldAlert, X,
} from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";

// ------------------------------------------------------------------ Button
type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
const variants: Record<Variant, string> = {
  primary: "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_2px_rgba(16,24,40,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-brand-600 hover:to-brand-700 active:to-brand-800",
  secondary: "bg-surface text-ink-2 border border-line hover:bg-slate-50 hover:text-ink shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
  ghost: "text-ink-2 hover:bg-slate-100",
  danger: "bg-surface text-red-700 border border-red-200 hover:bg-red-50",
  success: "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_1px_2px_rgba(16,24,40,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] hover:to-emerald-700",
};
export function Button({
  variant = "primary", size = "md", loading, icon, children, className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-9 px-4 text-[14px]",
        size === "lg" && "h-11 px-5 text-[15px]",
        variants[variant], className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Card
export function Card({ title, subtitle, actions, children, className, bodyClass }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={clsx("card", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
          <div>
            <h3 className="text-[14.5px] font-semibold text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

// ------------------------------------------------------------------ Badge
type Tone = "neutral" | "brand" | "green" | "amber" | "red" | "violet" | "teal";
const tones: Record<Tone, string> = {
  neutral: "bg-slate-50 text-ink-2 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200/70",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  amber: "bg-amber-50 text-amber-800 ring-amber-200/80",
  red: "bg-red-50 text-red-700 ring-red-200/80",
  violet: "bg-violet-50 text-violet-700 ring-violet-200/80",
  teal: "bg-sky-50 text-sky-700 ring-sky-200/80",
};
const dots: Record<Tone, string> = {
  neutral: "bg-slate-400", brand: "bg-brand-500", green: "bg-emerald-500", amber: "bg-amber-500",
  red: "bg-red-500", violet: "bg-violet-500", teal: "bg-sky-500",
};
export function Badge({ tone = "neutral", children, icon, className }: {
  tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ Status
const STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  NEEDS_CLARIFICATION: { label: "Needs clarification", tone: "amber" },
  ESTIMATED: { label: "Estimated", tone: "brand" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "red" },
  TECH_APPROVED: { label: "Tech approved", tone: "violet" },
  APPROVED: { label: "Approved", tone: "green" },
};
export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12px] font-medium text-ink-2 shadow-[0_1px_1px_rgba(16,24,40,0.04)]">
      <span className={clsx("h-1.5 w-1.5 rounded-full", dots[s.tone])} />
      {s.label}
    </span>
  );
}

/** Circular confidence gauge — status colour + numeric value + band label (never colour alone). */
export function ConfidenceRing({ score, band, size = 64, onDark }: {
  score: number; band: "High" | "Medium" | "Low"; size?: number; onDark?: boolean;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = band === "High" ? "#10b981" : band === "Medium" ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-3" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence ${score} of 100, ${band}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} style={{ stroke: onDark ? "rgba(255,255,255,0.14)" : "rgb(var(--c-slate-100))" }} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} stroke={color} strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`} />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" transform={`rotate(90 ${size / 2} ${size / 2})`}
          className="num" fontSize={size * 0.28} fontWeight={600} style={{ fill: onDark ? "#fff" : "rgb(var(--c-ink))" }}>{score}</text>
      </svg>
      <div className="leading-tight">
        <div className={clsx("text-[13px] font-semibold", onDark ? "text-white" : "text-ink")}>{band} confidence</div>
        <div className={clsx("text-[11.5px]", onDark ? "text-navy-200" : "text-ink-3")}>out of 100</div>
      </div>
    </div>
  );
}

// Confidence uses status colour + icon + label, never colour alone.
export function ConfidenceBadge({ band, score }: { band: "High" | "Medium" | "Low"; score?: number }) {
  const map = {
    High: { tone: "green" as Tone, icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    Medium: { tone: "amber" as Tone, icon: <CircleDashed className="h-3.5 w-3.5" /> },
    Low: { tone: "red" as Tone, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  }[band];
  return (
    <Badge tone={map.tone} icon={map.icon}>
      {band} confidence{score != null && <span className="num opacity-80">· {score}</span>}
    </Badge>
  );
}

// ------------------------------------------------------------------ Alerts / states
export function Alert({ tone = "info", title, children, className }: {
  tone?: "info" | "warning" | "critical" | "success"; title?: ReactNode; children?: ReactNode; className?: string;
}) {
  const t = {
    info: { cls: "bg-brand-50 border-brand-100 text-brand-900", icon: <Info className="h-4 w-4 text-brand-600" /> },
    warning: { cls: "bg-amber-50 border-amber-200 text-amber-900", icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
    critical: { cls: "bg-red-50 border-red-200 text-red-900", icon: <ShieldAlert className="h-4 w-4 text-red-600" /> },
    success: { cls: "bg-emerald-50 border-emerald-200 text-emerald-900", icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> },
  }[tone];
  return (
    <div className={clsx("flex gap-3 rounded-lg border px-3.5 py-3 text-[13px]", t.cls, className)} role={tone === "critical" ? "alert" : undefined}>
      <div className="mt-0.5 shrink-0">{t.icon}</div>
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={clsx(title && "mt-0.5", "leading-relaxed opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-ink-3">{icon ?? <CircleHelp className="h-5 w-5" />}</div>
      <div className="font-semibold text-ink">{title}</div>
      {children && <p className="mt-1 max-w-sm text-[13px] text-ink-3">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Locked({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
      <div>
        <div className="text-[13px] font-semibold text-ink-2">{title}</div>
        <div className="mt-0.5 text-[12.5px] text-ink-3">{children}</div>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-slate-200/70", className)} />;
}

export function PageLoader() {
  return (
    <div className="space-y-4 p-8">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Tabs
export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: { key: T; label: string; count?: number; icon?: ReactNode }[]; value: T; onChange: (k: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-[13.5px] font-medium transition",
            value === t.key ? "border-brand-600 text-ink [&>svg]:text-brand-600" : "border-transparent text-ink-3 hover:border-slate-300 hover:text-ink-2",
          )}
        >
          {t.icon}
          {t.label}
          {t.count != null && (
            <span className={clsx("num rounded-full px-1.5 py-px text-[11px] font-semibold", value === t.key ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-3")}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Drawer
export function Drawer({ open, onClose, title, subtitle, children, width = "max-w-xl" }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className={clsx("relative flex h-full w-full flex-col bg-surface shadow-pop", width)}>
        <header className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-3 hover:bg-slate-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------ Form field
export function Field({ label, hint, children, required }: { label: string; hint?: ReactNode; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

const statIcon: Record<string, string> = {
  brand: "bg-brand-50 text-brand-600 ring-brand-100",
  teal: "bg-accent-50 text-accent-600 ring-accent-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
};
export function Stat({ label, value, sub, icon, tone = "brand", featured }: {
  label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: keyof typeof statIcon; featured?: boolean;
}) {
  if (featured) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-5 py-4 text-white shadow-glow">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-brand-400/30 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-200">{label}</span>
          {icon && <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-gold-400 ring-1 ring-inset ring-white/15">{icon}</span>}
        </div>
        <div className="num relative mt-2 text-[26px] font-semibold tracking-tight text-gold-400">{value}</div>
        {sub && <div className="relative mt-0.5 text-[12.5px] text-navy-200">{sub}</div>}
      </div>
    );
  }
  return (
    <div className="card px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {icon && <span className={clsx("grid h-8 w-8 place-items-center rounded-lg ring-1 ring-inset", statIcon[tone])}>{icon}</span>}
      </div>
      <div className="num mt-2 text-[26px] font-semibold tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[12.5px] text-ink-3">{sub}</div>}
    </div>
  );
}
