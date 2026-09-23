/** Synthetic UI fixtures only. Never a result of analysis of the hackathon dataset. */
import type {
  DashboardResponse,
  GraphNode,
  GraphQuery,
  GraphResponse,
} from "@/contracts/api";
import { ApiError } from "@/lib/api";
type Role = GraphNode["role"];
export const DEMO_ID = "demo_synthetic";
const roleList: Role[] = [
  "coordinator",
  "consolidator",
  "distributor",
  "transit",
  "terminal",
  "peripheral",
];
const nodes: GraphNode[] = Array.from({ length: 28 }, (_, i) => {
  const depth = i === 0 ? 1 : i % 5;
  const isolated = i === 27;
  const isSeed = depth === 0 || isolated;
  const role = isolated || depth === 4 ? "peripheral" : roleList[i % 6];
  const incoming = isolated ? "0.00" : `${(28 - i) * 21500}.00`;
  return {
    gid: isolated ? "9999" : i === 26 ? "9007199254740993" : String(1001 + i),
    depth: isolated ? 0 : depth,
    is_seed: isSeed,
    role,
    role_score: isolated ? 0.1 : 0.72,
    cluster_id: isolated ? 2 : i < 21 ? 0 : 1,
    priority_score: isolated ? 0 : Number((0.948 - i * 0.027).toFixed(3)),
    evidence: isolated
      ? "Связи в синтетической выборке отсутствуют."
      : depth === 4
        ? "Наблюдение обрывается на 4-м колене. Конечный получатель не подтверждён."
        : "Синтетический пример признаков роли для проверки интерфейса.",
    rule_id: "R6",
    metrics: {
      observed_in_kzt: incoming,
      observed_out_kzt:
        isolated || depth === 4 ? "0.00" : `${(28 - i) * 19500}.00`,
      in_degree: isolated ? 0 : 3 + (i % 7),
      out_degree: isolated || depth === 4 ? 0 : 2 + (i % 9),
      reachable_seed_count: isolated ? 0 : 4 + (i % 3),
      betweenness: isolated ? 0 : 0.082,
      observed_out_in_ratio:
        isolated || isSeed ? null : depth === 4 ? 0 : 0.907,
      ratio_usable: !isSeed && depth < 4 && !isolated,
    },
    flags: [
      ...(isolated ? ["isolated" as const] : []),
      ...(depth === 4 && !isolated ? ["depth4_censored" as const] : []),
      ...(isSeed ? ["seed_inflow_incomplete" as const] : []),
    ],
    priority_breakdown: (
      ["inflow", "in_degree", "betweenness", "seed_reach", "role"] as const
    ).map((feature, index) => ({
      feature,
      normalized_value: isolated ? 0 : Number((0.948 - i * 0.027).toFixed(3)),
      weight: [0.3, 0.2, 0.2, 0.2, 0.1][index],
      contribution: isolated
        ? 0
        : Number(
            ((0.948 - i * 0.027) * [0.3, 0.2, 0.2, 0.2, 0.1][index]).toFixed(6),
          ),
    })),
  };
});
const edges = nodes
  .slice(1, 21)
  .map((node, i) => ({
    src: i % 3 === 0 ? node.gid : "1001",
    dst: i % 3 === 0 ? "1001" : node.gid,
    sum_kzt: `${(i + 1) * 27000}.00`,
    n_tx: i + 2,
  }));
edges.push(
  { src: "1021", dst: "1022", sum_kzt: "50000.00", n_tx: 2 },
  { src: "1022", dst: "1023", sum_kzt: "35000.00", n_tx: 1 },
  { src: "1023", dst: "1024", sum_kzt: "25000.00", n_tx: 1 },
  { src: "1024", dst: "1025", sum_kzt: "10000.00", n_tx: 1 },
  { src: "1025", dst: "1026", sum_kzt: "9000.00", n_tx: 1 },
  { src: "1026", dst: "9007199254740993", sum_kzt: "8000.00", n_tx: 1 },
);
export function demoDashboard(offset = 0): DashboardResponse {
  return {
    analysis_id: DEMO_ID,
    algorithm_version: "rules-v1",
    currency: "KZT",
    period: { start: "2026-07-01", end: "2026-07-31" },
    stats: {
      n_nodes: nodes.length,
      n_edges: edges.length,
      n_transactions: 237,
      n_seed: nodes.filter((n) => n.is_seed).length,
      n_clusters: 3,
      graph_turnover_kzt: "5807000.00",
      self_transfer_turnover_kzt: "0.00",
      n_weak_components: 2,
      n_isolated_nodes: 1,
      n_depth4_censored: nodes.filter((n) => n.depth === 4).length,
    },
    charts: {
      by_role: roleList.map((role) => ({
        role,
        count: nodes.filter((n) => n.role === role).length,
      })),
      by_depth: Array.from({ length: 5 }, (_, depth) => ({
        depth,
        count: nodes.filter((n) => n.depth === depth).length,
      })),
      daily_flow: Array.from({ length: 31 }, (_, i) => ({
        date: `2026-07-${String(i + 1).padStart(2, "0")}`,
        sum_kzt: edges[i]?.sum_kzt ?? "0.00",
        n_tx: edges[i]?.n_tx ?? 0,
      })),
    },
    clusters: [0, 1, 2].map((cluster_id) => ({
      cluster_id,
      n_nodes: nodes.filter((n) => n.cluster_id === cluster_id).length,
      n_seed: nodes.filter((n) => n.cluster_id === cluster_id && n.is_seed)
        .length,
      sum_kzt_internal:
        cluster_id === 0
          ? "5670000.00"
          : cluster_id === 1
            ? "87000.00"
            : "0.00",
      top_gids: nodes
        .filter((n) => n.cluster_id === cluster_id)
        .slice(0, 5)
        .map((n) => n.gid),
      hypothesis: "Синтетическое сообщество для проверки интерфейса.",
    })),
    ranking: {
      items: nodes
        .slice(offset, offset + 20)
        .map((n, i) => ({
          rank: offset + i + 1,
          gid: n.gid,
          role: n.role,
          priority_score: n.priority_score,
          why: n.flags.includes("isolated")
            ? "Нет наблюдаемых связей."
            : "Пример приоритета: входящий поток и достижимость от seed.",
        })),
      offset,
      limit: 20,
      total: nodes.length,
    },
    warnings: [
      {
        code: "SYNTHETIC_UI",
        message:
          "Синтетические данные. Числа и роли не являются результатами анализа.",
        affected_nodes: nodes.length,
      },
    ],
    exports: [],
  };
}
export function demoGraph(query: GraphQuery): GraphResponse {
  const eligible = nodes.filter(
    (n) => query.cluster_id == null || n.cluster_id === query.cluster_id,
  );
  const focus = query.focus_gid ?? eligible[0]?.gid;
  if (!focus || !nodes.some((n) => n.gid === focus))
    throw new ApiError(
      "GID_NOT_FOUND",
      "Узел отсутствует в этом анализе.",
      404,
    );
  if (!eligible.some((n) => n.gid === focus))
    throw new ApiError(
      "INVALID_INPUT",
      "Узел не принадлежит выбранному кластеру.",
      422,
    );
  const permitted = new Set(eligible.map((n) => n.gid));
  const distances = new Map([[focus, 0]]);
  for (let hop = 1; hop <= (query.hops ?? 1); hop++) {
    for (const edge of edges) {
      if (!permitted.has(edge.src) || !permitted.has(edge.dst)) continue;
      if (
        (distances.get(edge.src) ?? Infinity) < hop &&
        !distances.has(edge.dst)
      )
        distances.set(edge.dst, hop);
      if (
        (distances.get(edge.dst) ?? Infinity) < hop &&
        !distances.has(edge.src)
      )
        distances.set(edge.src, hop);
    }
  }
  const matched = eligible
    .filter((n) => distances.has(n.gid))
    .sort(
      (a, b) =>
        distances.get(a.gid)! - distances.get(b.gid)! ||
        b.priority_score - a.priority_score ||
        (BigInt(a.gid) < BigInt(b.gid) ? -1 : 1),
    );
  const selected = matched.slice(0, query.max_nodes ?? 250);
  const ids = new Set(selected.map((n) => n.gid));
  return {
    analysis_id: DEMO_ID,
    focus_gid: focus,
    nodes: selected,
    edges: edges
      .filter((e) => ids.has(e.src) && ids.has(e.dst))
      .map((e) => ({
        id: `${e.src}:${e.dst}`,
        source: e.src,
        target: e.dst,
        sum_kzt: e.sum_kzt,
        n_tx: e.n_tx,
        depth: 1,
      })),
    returned_nodes: selected.length,
    matched_nodes: matched.length,
    truncated: selected.length < matched.length,
  };
}
