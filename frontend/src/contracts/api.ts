// Generated from contracts.py. Owner: backend. Do not edit manually.
// Runtime ranges and patterns are enforced by the backend JSON Schema.
export type Gid = string;
export type AnalysisId = string;

export type AIAnswer = {
  status: "ok" | "insufficient_data";
  summary: string;
  findings: Array<Finding>;
  missing_data: Array<string>;
  next_steps: Array<string>;
};

export type AnalyzeRequest = {
  dataset_id: "hackalem-july-2026";
};

export type AnalyzeResponse = {
  analysis_id: string;
  status: "ready";
  cached: boolean;
  algorithm_version: "rules-v1";
  runtime_ms: number;
  summary_url: string;
};

export type AssistantRequest = {
  question: string;
  focus_gids: Array<string>;
};

export type AssistantResponse = {
  analysis_id: string;
  mode: "live" | "fallback";
  fallback_reason: "disabled" | "timeout" | "unavailable" | "invalid_output" | "refusal" | "incomplete" | null;
  answer: AIAnswer;
  evidence: Array<EvidenceFact>;
};

export type Charts = {
  by_role: Array<RoleCount>;
  by_depth: Array<DepthCount>;
  daily_flow: Array<DailyFlow>;
};

export type Cluster = {
  cluster_id: number;
  n_nodes: number;
  n_seed: number;
  sum_kzt_internal: string;
  top_gids: Array<string>;
  hypothesis: string;
};

export type DailyFlow = {
  date: string;
  sum_kzt: string;
  n_tx: number;
};

export type DashboardQuery = {
  offset?: number;
  limit?: number;
};

export type DashboardResponse = {
  analysis_id: string;
  algorithm_version: "rules-v1";
  currency: "KZT";
  period: Period;
  stats: Stats;
  charts: Charts;
  clusters: Array<Cluster>;
  ranking: RankingPage;
  warnings: Array<DataWarning>;
  exports: Array<ExportLink>;
};

export type DataWarning = {
  code: string;
  message: string;
  affected_nodes: number | null;
};

export type DepthCount = {
  depth: number;
  count: number;
};

export type ErrorDetail = {
  code: "DATASET_NOT_FOUND" | "ANALYSIS_NOT_FOUND" | "GID_NOT_FOUND" | "INVALID_INPUT" | "ANALYSIS_BUSY" | "PIPELINE_FAILED" | "EXPORT_NOT_FOUND";
  message: string;
  request_id: string;
  retryable: boolean;
};

export type ErrorResponse = {
  error: ErrorDetail;
};

export type EvidenceFact = {
  id: string;
  gid: string;
  metric: string;
  value: string;
  unit: string | null;
  text: string;
};

export type ExportLink = {
  filename: "nodes_roles.csv" | "clusters.csv" | "top_nodes.csv";
  url: string;
};

export type Finding = {
  title: string;
  evidence_ids: Array<string>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  sum_kzt: string;
  n_tx: number;
  depth: number;
};

export type GraphNode = {
  gid: string;
  depth: number;
  is_seed: boolean;
  role: "consolidator" | "transit" | "distributor" | "terminal" | "coordinator" | "peripheral";
  role_score: number;
  cluster_id: number;
  priority_score: number;
  evidence: string;
  rule_id: string;
  flags: Array<"depth4_censored" | "seed_inflow_incomplete" | "outflow_exceeds_observed_inflow" | "isolated" | "self_transfers_excluded">;
  metrics: Metrics;
  priority_breakdown: Array<PriorityTerm>;
};

export type GraphQuery = {
  focus_gid?: string | null;
  hops?: number;
  cluster_id?: number | null;
  max_nodes?: number;
};

export type GraphResponse = {
  analysis_id: string;
  focus_gid: string | null;
  nodes: Array<GraphNode>;
  edges: Array<GraphEdge>;
  matched_nodes: number;
  returned_nodes: number;
  truncated: boolean;
};

export type Metrics = {
  in_degree: number;
  out_degree: number;
  observed_in_kzt: string;
  observed_out_kzt: string;
  observed_out_in_ratio: number | null;
  ratio_usable: boolean;
  reachable_seed_count: number;
  betweenness: number;
};

export type Period = {
  start: string;
  end: string;
};

export type PriorityTerm = {
  feature: "inflow" | "in_degree" | "betweenness" | "seed_reach" | "role";
  normalized_value: number;
  weight: number;
  contribution: number;
};

export type RankedNode = {
  rank: number;
  gid: string;
  role: "consolidator" | "transit" | "distributor" | "terminal" | "coordinator" | "peripheral";
  priority_score: number;
  why: string;
};

export type RankingPage = {
  items: Array<RankedNode>;
  total: number;
  offset: number;
  limit: number;
};

export type RoleCount = {
  role: "consolidator" | "transit" | "distributor" | "terminal" | "coordinator" | "peripheral";
  count: number;
};

export type Stats = {
  n_nodes: number;
  n_edges: number;
  n_transactions: number;
  n_seed: number;
  n_clusters: number;
  n_weak_components: number;
  n_isolated_nodes: number;
  n_depth4_censored: number;
  graph_turnover_kzt: string;
  self_transfer_turnover_kzt: string;
};

