import { createContext, useContext, useState, type ReactNode } from "react";
import type { Role } from "./types";

export const PERSONAS: { key: Role; name: string; person: string; blurb: string }[] = [
  { key: "sales", name: "Sales", person: "Priya Raman", blurb: "Captures enquiries, shares client-facing ranges" },
  { key: "ba", name: "Business Analyst", person: "Arjun Mehta", blurb: "Clarifies requirements, edits scope" },
  { key: "techlead", name: "Tech Lead", person: "Karthik Iyer", blurb: "Reviews complexity, gives technical approval" },
  { key: "finance", name: "Finance", person: "Divya Nair", blurb: "Sees internal costing, gives commercial approval" },
  { key: "admin", name: "Administrator", person: "Admin", blurb: "Manages users, catalogue and configuration" },
];

const KEY = "ffa.persona";

function readPersona(): Role {
  // Demo convenience: ?persona=finance opens the app as that role (handy for presentations).
  const fromUrl = new URLSearchParams(window.location.search).get("persona");
  if (fromUrl && PERSONAS.some((p) => p.key === fromUrl)) {
    try { localStorage.setItem(KEY, fromUrl); } catch { /* ignore */ }
    return fromUrl as Role;
  }
  try {
    const v = localStorage.getItem(KEY);
    if (v && PERSONAS.some((p) => p.key === v)) return v as Role;
  } catch {
    /* storage unavailable */
  }
  return "sales";
}

let currentRole: Role = readPersona();
export const getRole = () => currentRole;

const Ctx = createContext<{ role: Role; setRole: (r: Role) => void }>({ role: "sales", setRole: () => {} });

export function PersonaProvider({ children, onChange }: { children: ReactNode; onChange: () => void }) {
  const [role, setRoleState] = useState<Role>(currentRole);
  const setRole = (r: Role) => {
    currentRole = r;
    try {
      localStorage.setItem(KEY, r);
    } catch {
      /* ignore */
    }
    setRoleState(r);
    onChange();
  };
  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
}

export const usePersona = () => useContext(Ctx);
