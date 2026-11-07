export type Role = "sales" | "ba" | "techlead" | "finance" | "admin";
export type Money = string;
export type Range = { low: Money; expected: Money; high: Money };

export interface Category { key: string; name: string; icon: string; description: string }
export interface SampleBrief { title: string; category: string; platforms: string[]; client_name: string; brief: string }
export interface Meta {
  categories: Category[];
  input_groups: { key: string; name: string; critical: boolean }[];
  complexity_factors: { key: string; name: string }[];
  workstreams: Record<string, string>;
  roles: Record<Role, string>;
  sample_briefs: SampleBrief[];
  versions: Record<string, string>;
  ai_mode: "claude" | "rules";
}

export interface ExtractedItem {
  id: string;
  kind: string;
  statement: string;
  basis: "EXPLICIT" | "INFERRED";
  feature_code: string | null;
  quote: string;
  start: number | null;
  end: number | null;
  page: number | null;
  verification: "VERIFIED" | "FUZZY" | "UNVERIFIED" | "N/A";
  inference_reason: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface Question { id: string; group: string; group_name: string; critical: boolean; text: string; answer: string | null }
export interface Flag { id?: string; kind: string; severity: "warning" | "critical"; description: string; quotes?: string[] }
export interface TraceEntry { id: string; group: string; internal: boolean; label: string; formula: string; value: string; detail: string }
export interface Workstream { workstream: string; label: string; role: string; low: string; likely: string; high: string; expected: string }
export interface Tier {
  key: string; name: string; description: string; recommended: boolean;
  features: { code: string; name: string; tier: string; addon: boolean }[];
  hours_expected: string; weeks: number; price: Range;
}
export interface CostScenario {
  labour_lines: { role: string; role_name: string; hours: string; rate: string; cost: string }[];
  direct_labour: Money; misc_expenses: Money; build_infra: Money; build_months: number; expenses: Money;
  internal_cost: Money; contingency_pct: string; contingency: Money; overhead_pct: string; overhead: Money;
  base: Money; commission_pct: string; commission: Money; margin_pct: string; margin: Money;
  price_before_tax: Money; gst_pct: string; gst: Money; price_with_tax: Money;
}

export interface EstimateResult {
  computed_at: string;
  versions: Record<string, string>;
  complexity: {
    factors: { key: string; name: string; score: number; unknown: boolean }[];
    total: number; max: number; band: string; multiplier: string; reasons: string[]; overridden: string[];
  };
  confidence: {
    score: number; band: "High" | "Medium" | "Low"; contingency_pct?: string;
    components: { key: string; label: string; weight: number; value: number; detail: string }[];
  };
  effort: {
    workstreams: Workstream[];
    lines: { source: string; code: string; name: string; module: string; workstream: string; low: string; likely: string; high: string }[];
    totals: Range;
  };
  cost?: { low: CostScenario; expected: CostScenario; high: CostScenario };
  client_range: Range;
  tiers: Tier[];
  recurring: {
    cloud: { size: string; label: string; assumed: boolean; monthly_low: Money; monthly_high: Money; note: string };
    third_party: { item: string; description: string }[];
    fixed: { item: string; description: string }[];
    maintenance: { pct: string; annual_low: Money; annual_high: Money; note: string };
  };
  timeline: {
    weeks: { low: number; expected: number; high: number };
    team: { devs: number; hours_per_week: number };
    phases: { name: string; start: number; end: number }[];
    milestones: { name: string; week: number; payment_pct: string }[];
    client_dependencies: string[];
  };
  benchmark?: { implied_hourly: Money; band_low: Money; band_high: Money; status: string; source: string };
  trace: TraceEntry[];
  input_groups: Record<string, { status: "PROVIDED" | "PARTIAL" | "MISSING"; note: string }>;
  questions: Question[];
  commercial_flags: Flag[];
  assumptions: { text: string; source: string }[];
  exclusions: string[];
}

export interface Approval { type: "technical" | "commercial"; decision: string; by: string; comment: string; at: string; version: number }

export interface Estimate {
  id: number; ref: string; title: string; client_name: string; category: string; category_name: string;
  status: string; version: number; created_by: string; created_at: string; updated_at: string;
  intake: {
    title?: string; client_name?: string; category: string; platforms: string[]; mobile_approach: string;
    expected_users: number | null; budget_max: number | null; target_launch: string | null; brief: string;
  };
  analysis: {
    mode: "claude" | "rules"; model: string | null; prompt_version: string; summary: string;
    items: ExtractedItem[]; feature_codes: string[]; addon_codes: string[]; verification_ratio: number | null;
    conflicts: Flag[]; redactions: number; warnings: string[];
    usage?: { input_tokens: number; output_tokens: number } | null;
  };
  answers: Record<string, string>;
  scope: {
    feature_codes: string[]; addon_codes: string[]; custom_modules: { name: string; hours: number }[];
    complexity_overrides: Record<string, number>;
  };
  result: EstimateResult;
  approvals: Approval[];
  history: { version: number; at: string; by: string; reason: string; expected: Money; low: Money; high: Money; confidence: number }[];
  audit: { at: string; by: string; action: string; detail: string }[];
  validity_days: number;
  view: "internal" | "client";
  permissions: { edit_scope: boolean; approve: "technical" | "commercial" | null; internal: boolean };
}

export interface EstimateSummary {
  id: number; ref: string; title: string; client_name: string; category: string; category_name: string;
  status: string; version: number; updated_at: string; client_range: Range; confidence: number;
  confidence_band: "High" | "Medium" | "Low"; weeks: number; ai_mode: string;
}

export interface CatalogueFeature {
  code: string; name: string; module: string; tier: "essential" | "recommended" | "advanced";
  admin?: boolean; sensitive?: boolean; realtime?: boolean; hours: Record<string, [number, number, number]>;
}
