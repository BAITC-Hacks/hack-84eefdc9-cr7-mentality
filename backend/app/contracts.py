"""API v1 contract for the HackAlem MVP. This is a contract, not an API server."""
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Gid = Annotated[str, Field(pattern=r"^-?(0|[1-9][0-9]*)$")]
Money = Annotated[str, Field(pattern=r"^[0-9]+\.[0-9]{2}$")]
Score = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
Count = Annotated[int, Field(ge=0)]
AnalysisId = Annotated[str, Field(pattern=r"^a_[0-9a-f]{16}$")]
Role = Literal["consolidator", "transit", "distributor", "terminal", "coordinator", "peripheral"]
Flag = Literal["depth4_censored", "seed_inflow_incomplete", "outflow_exceeds_observed_inflow", "isolated", "self_transfers_excluded"]
ExportName = Literal["nodes_roles.csv", "clusters.csv", "top_nodes.csv"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AnalyzeRequest(StrictModel):
    dataset_id: Literal["hackalem-july-2026"]


class AnalyzeResponse(StrictModel):
    analysis_id: AnalysisId
    status: Literal["ready"]
    cached: bool
    algorithm_version: Literal["rules-v1"]
    runtime_ms: Count
    summary_url: str


class DashboardQuery(StrictModel):
    offset: Annotated[int, Field(ge=0)] = 0
    limit: Annotated[int, Field(ge=1, le=100)] = 20


class GraphQuery(StrictModel):
    focus_gid: Gid | None = None
    hops: Annotated[int, Field(ge=0, le=2)] = 1
    cluster_id: Annotated[int, Field(ge=0)] | None = None
    max_nodes: Annotated[int, Field(ge=1, le=1000)] = 250


class Period(StrictModel):
    start: date
    end: date


class DataWarning(StrictModel):
    code: str
    message: str
    affected_nodes: Count | None


class Metrics(StrictModel):
    in_degree: Count
    out_degree: Count
    observed_in_kzt: Money
    observed_out_kzt: Money
    observed_out_in_ratio: Annotated[float, Field(ge=0, allow_inf_nan=False)] | None
    ratio_usable: bool
    reachable_seed_count: Count
    betweenness: Score


class PriorityTerm(StrictModel):
    feature: Literal["inflow", "in_degree", "betweenness", "seed_reach", "role"]
    normalized_value: Score
    weight: Score
    contribution: Score


class GraphNode(StrictModel):
    gid: Gid
    depth: Annotated[int, Field(ge=0, le=4)]
    is_seed: bool
    role: Role
    role_score: Score
    cluster_id: Count
    priority_score: Score
    evidence: Annotated[str, Field(min_length=1, max_length=200)]
    rule_id: str
    flags: list[Flag]
    metrics: Metrics
    priority_breakdown: list[PriorityTerm]


class GraphEdge(StrictModel):
    id: str
    source: Gid
    target: Gid
    sum_kzt: Money
    n_tx: Annotated[int, Field(ge=1)]
    depth: Annotated[int, Field(ge=0, le=4)]


class GraphResponse(StrictModel):
    analysis_id: AnalysisId
    focus_gid: Gid | None
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    matched_nodes: Count
    returned_nodes: Count
    truncated: bool


class Stats(StrictModel):
    n_nodes: Count
    n_edges: Count
    n_transactions: Count
    n_seed: Count
    n_clusters: Count
    n_weak_components: Count
    n_isolated_nodes: Count
    n_depth4_censored: Count
    graph_turnover_kzt: Money
    self_transfer_turnover_kzt: Money


class RoleCount(StrictModel):
    role: Role
    count: Count


class DepthCount(StrictModel):
    depth: Annotated[int, Field(ge=0, le=4)]
    count: Count


class DailyFlow(StrictModel):
    date: date
    sum_kzt: Money
    n_tx: Count


class Charts(StrictModel):
    by_role: list[RoleCount]
    by_depth: list[DepthCount]
    daily_flow: list[DailyFlow]


class Cluster(StrictModel):
    cluster_id: Count
    n_nodes: Count
    n_seed: Count
    sum_kzt_internal: Money
    top_gids: list[Gid]
    hypothesis: str


class RankedNode(StrictModel):
    rank: Annotated[int, Field(ge=1)]
    gid: Gid
    role: Role
    priority_score: Score
    why: str


class RankingPage(StrictModel):
    items: list[RankedNode]
    total: Count
    offset: Count
    limit: Annotated[int, Field(ge=1, le=100)]


class ExportLink(StrictModel):
    filename: ExportName
    url: str


class DashboardResponse(StrictModel):
    analysis_id: AnalysisId
    algorithm_version: Literal["rules-v1"]
    currency: Literal["KZT"]
    period: Period
    stats: Stats
    charts: Charts
    clusters: list[Cluster]
    ranking: RankingPage
    warnings: list[DataWarning]
    exports: list[ExportLink]


class AssistantRequest(StrictModel):
    question: Annotated[str, Field(min_length=1, max_length=1000)]
    focus_gids: Annotated[list[Gid], Field(min_length=1, max_length=5)]


class Finding(StrictModel):
    title: str
    evidence_ids: list[str]


class AIAnswer(StrictModel):
    """The only object the LLM is allowed to generate."""
    status: Literal["ok", "insufficient_data"]
    summary: str
    findings: list[Finding]
    missing_data: list[str]
    next_steps: list[str]


class EvidenceFact(StrictModel):
    id: str
    gid: Gid
    metric: str
    value: str
    unit: str | None
    text: str


class AssistantResponse(StrictModel):
    analysis_id: AnalysisId
    mode: Literal["live", "fallback"]
    fallback_reason: Literal["disabled", "timeout", "unavailable", "invalid_output", "refusal", "incomplete"] | None
    answer: AIAnswer
    evidence: list[EvidenceFact]


class ErrorDetail(StrictModel):
    code: Literal["DATASET_NOT_FOUND", "ANALYSIS_NOT_FOUND", "GID_NOT_FOUND", "INVALID_INPUT", "ANALYSIS_BUSY", "PIPELINE_FAILED", "EXPORT_NOT_FOUND"]
    message: str
    request_id: str
    retryable: bool


class ErrorResponse(StrictModel):
    error: ErrorDetail


class ContractBundle(StrictModel):
    analyze_request: AnalyzeRequest
    analyze_response: AnalyzeResponse
    dashboard_query: DashboardQuery
    dashboard_response: DashboardResponse
    graph_query: GraphQuery
    graph_response: GraphResponse
    assistant_request: AssistantRequest
    assistant_response: AssistantResponse
    error_response: ErrorResponse
