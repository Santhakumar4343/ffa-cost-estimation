import clsx from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
const KEY = "ffa.theme";

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(readPref);

  useEffect(() => {
    apply(pref);
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      /* ignore */
    }
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const opts: { key: ThemePref; label: string; icon: typeof Sun }[] = [
    { key: "light", label: "Light theme", icon: Sun },
    { key: "dark", label: "Dark theme", icon: Moon },
    { key: "system", label: "Match system", icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label="Colour theme" className="inline-flex items-center rounded-lg border border-line bg-slate-50 p-0.5">
      {opts.map((o) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={pref === o.key}
          title={o.label}
          aria-label={o.label}
          onClick={() => setPref(o.key)}
          className={clsx(
            "grid h-7 w-8 place-items-center rounded-md transition",
            pref === o.key ? "bg-surface text-brand-600 shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink",
          )}
        >
          <o.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
