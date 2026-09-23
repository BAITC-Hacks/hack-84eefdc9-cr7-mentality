/** Runtime readers for the BACK-owned generated contract. */
import { z } from "zod";
import type {
  AnalyzeResponse,
  AssistantResponse,
  DashboardResponse,
  GraphResponse,
} from "@/contracts/api";
export const roleSchema = z.enum([
  "coordinator",
  "consolidator",
  "distributor",
  "transit",
  "terminal",
  "peripheral",
]);
const money = z.string().regex(/^\d+(\.\d+)?$/);
// Match backend/app/contracts.py (and docs/api-contract.schema.json) exactly.
const gidPattern = /^-?(0|[1-9][0-9]*)$/;
export const gidSchema = z
  .string()
  .regex(gidPattern)
  .refine((value) => {
    // The contract is textual; dataset gids are signed int64 values.
    if (!gidPattern.test(value)) return true;
    const asInt64 = BigInt(value);
    return asInt64 >= -9223372036854775808n && asInt64 <= 9223372036854775807n;
  }, { message: "gid must fit signed int64" });
const gid = gidSchema;
const count = z.number().int().nonnegative();
const score = z.number().min(0).max(1);
const depth = z.number().int().min(0).max(4);
export const graphNodeSchema = z.object({
  gid,
  depth,
  is_seed: z.boolean(),
  role: roleSchema,
  role_score: score,
  cluster_id: count,
  priority_score: score,
  evidence: z.string(),
  rule_id: z.string(),
  flags: z.array(
    z.enum([
      "depth4_censored",
      "seed_inflow_incomplete",
      "outflow_exceeds_observed_inflow",
      "isolated",
      "self_transfers_excluded",
    ]),
  ),
  metrics: z.object({
    in_degree: count,
    out_degree: count,
    observed_in_kzt: money,
    observed_out_kzt: money,
    observed_out_in_ratio: z.number().nonnegative().nullable(),
    ratio_usable: z.boolean(),
    reachable_seed_count: count,
    betweenness: z.number().nonnegative(),
  }),
  priority_breakdown: z.array(
    z.object({
      feature: z.enum([
        "inflow",
        "in_degree",
        "betweenness",
        "seed_reach",
        "role",
      ]),
      normalized_value: score,
      weight: score,
      contribution: score,
    }),
  ),
});
export const graphResponseSchema = z.object({
  analysis_id: z.string(),
  focus_gid: gid.nullable(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(
    z.object({
      id: z.string(),
      source: gid,
      target: gid,
      sum_kzt: money,
      n_tx: count,
      depth,
    }),
  ),
  matched_nodes: count,
  returned_nodes: count,
  truncated: z.boolean(),
}) satisfies z.ZodType<GraphResponse>;
export const exportFilenameSchema = z.enum([
  "nodes_roles.csv",
  "clusters.csv",
  "top_nodes.csv",
]);
export const dashboardSchema = z.object({
  analysis_id: z.string(),
  algorithm_version: z.literal("rules-v1"),
  currency: z.literal("KZT"),
  period: z.object({ start: z.string(), end: z.string() }),
  stats: z.object({
    n_nodes: count,
    n_edges: count,
    n_transactions: count,
    n_seed: count,
    n_clusters: count,
    n_weak_components: count,
    n_isolated_nodes: count,
    n_depth4_censored: count,
    graph_turnover_kzt: money,
    self_transfer_turnover_kzt: money,
  }),
  charts: z.object({
    by_role: z.array(z.object({ role: roleSchema, count })),
    by_depth: z.array(z.object({ depth, count })),
    daily_flow: z.array(
      z.object({ date: z.string(), sum_kzt: money, n_tx: count }),
    ),
  }),
  clusters: z.array(
    z.object({
      cluster_id: count,
      n_nodes: count,
      n_seed: count,
      sum_kzt_internal: money,
      top_gids: z.array(gid),
      hypothesis: z.string(),
    }),
  ),
  ranking: z.object({
    items: z.array(
      z.object({
        rank: count,
        gid,
        role: roleSchema,
        priority_score: score,
        why: z.string(),
      }),
    ),
    offset: count,
    limit: z.number().int().positive(),
    total: count,
  }),
  warnings: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      affected_nodes: count.nullable(),
    }),
  ),
  exports: z.array(
    z.object({ filename: exportFilenameSchema, url: z.string() }),
  ),
}) satisfies z.ZodType<DashboardResponse>;
export const analyzeResponseSchema = z.object({
  analysis_id: z.string(),
  status: z.literal("ready"),
  cached: z.boolean(),
  algorithm_version: z.literal("rules-v1"),
  runtime_ms: z.number().nonnegative(),
  summary_url: z.string(),
}) satisfies z.ZodType<AnalyzeResponse>;
export const assistantResponseSchema = z.object({
  analysis_id: z.string(),
  mode: z.enum(["live", "fallback"]),
  fallback_reason: z
    .enum([
      "disabled",
      "timeout",
      "unavailable",
      "invalid_output",
      "refusal",
      "incomplete",
    ])
    .nullable(),
  answer: z.object({
    status: z.enum(["ok", "insufficient_data"]),
    summary: z.string(),
    findings: z.array(
      z.object({ title: z.string(), evidence_ids: z.array(z.string()) }),
    ),
    missing_data: z.array(z.string()),
    next_steps: z.array(z.string()),
  }),
  evidence: z.array(
    z.object({
      id: z.string(),
      gid,
      metric: z.string(),
      value: z.string(),
      unit: z.string().nullable(),
      text: z.string(),
    }),
  ),
}) satisfies z.ZodType<AssistantResponse>;
