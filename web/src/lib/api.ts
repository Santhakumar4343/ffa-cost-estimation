import { getRole } from "./persona";
import type { CatalogueFeature, Estimate, EstimateSummary, Meta } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Demo-Role", getRole());
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running on port 8000?");
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = typeof body.detail === "string" ? body.detail : Array.isArray(body.detail)
        ? body.detail.map((d: { msg: string }) => d.msg).join("; ") : msg;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  health: () => request<{ status: string; ai_mode: "claude" | "rules"; model: string | null }>("/health"),
  meta: () => request<Meta>("/meta"),
  catalogue: (category: string) => request<CatalogueFeature[]>(`/catalogue/${category}`),
  pricing: () => request<any>("/pricing"),
  list: () => request<EstimateSummary[]>("/estimates"),
  get: (id: number) => request<Estimate>(`/estimates/${id}`),
  create: (body: unknown) => request<Estimate>("/estimates", { method: "POST", body: JSON.stringify(body) }),
  updateScope: (id: number, body: unknown) =>
    request<Estimate>(`/estimates/${id}/scope`, { method: "PUT", body: JSON.stringify(body) }),
  answer: (id: number, answers: Record<string, string>) =>
    request<Estimate>(`/estimates/${id}/answers`, { method: "POST", body: JSON.stringify({ answers }) }),
  approve: (id: number, body: { type: string; decision: string; comment: string }) =>
    request<Estimate>(`/estimates/${id}/approvals`, { method: "POST", body: JSON.stringify(body) }),
  extractDocument: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ filename: string; pages: number; characters: number; scanned_suspected: boolean; text: string }>(
      "/documents/extract", { method: "POST", body: fd });
  },
};
