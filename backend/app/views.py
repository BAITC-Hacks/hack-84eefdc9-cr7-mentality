"""Read-only projections of one computed snapshot for the API."""

from collections import deque
from decimal import Decimal

import pandas as pd

from .contracts import EvidenceFact, GraphQuery
from .pipeline import AnalysisSnapshot
from .roles import money_text


def dashboard_page(snapshot: AnalysisSnapshot, offset: int, limit: int) -> dict:
    source = snapshot.dashboard
    return {
        **source,
        "ranking": {
            "items": source["ranking"]["items"][offset:offset + limit],
            "total": source["ranking"]["total"],
            "offset": offset,
            "limit": limit,
        },
    }


def graph_view(snapshot: AnalysisSnapshot, query: GraphQuery) -> dict:
    nodes = snapshot.metrics.nodes
    requested = int(query.focus_gid) if query.focus_gid is not None else None
    if requested is not None and requested not in nodes:
        raise KeyError("GID_NOT_FOUND")
    if query.cluster_id is not None and query.cluster_id >= len(snapshot.clusters.groups):
        raise KeyError("CLUSTER_NOT_FOUND")
    if requested is not None and query.cluster_id is not None:
        if snapshot.clusters.by_gid[requested] != query.cluster_id:
            raise ValueError("Selected gid is outside the selected cluster")
    if requested is None:
        candidates = (
            snapshot.clusters.groups[query.cluster_id]
            if query.cluster_id is not None else nodes.keys()
        )
        requested = min(candidates, key=lambda gid: snapshot.roles[gid].rank)

    allowed = set(snapshot.clusters.groups[query.cluster_id]) if query.cluster_id is not None else None
    distance = {requested: 0}
    queue = deque([requested])
    graph = snapshot.metrics.graph
    while queue:
        current = queue.popleft()
        if distance[current] >= query.hops:
            continue
        neighbors = set(graph.predecessors(current)) | set(graph.successors(current))
        for neighbor in sorted(neighbors):
            if allowed is not None and neighbor not in allowed:
                continue
            if neighbor not in distance:
                distance[neighbor] = distance[current] + 1
                queue.append(neighbor)
    ordered = sorted(
        distance,
        key=lambda gid: (0 if gid == requested else 1, distance[gid],
                         -snapshot.roles[gid].priority_score, gid),
    )
    selected = ordered[:query.max_nodes]
    selected_set = set(selected)
    api_nodes = []
    for gid in selected:
        record = nodes[gid]
        role = snapshot.roles[gid]
        api_nodes.append({
            "gid": str(gid),
            "depth": record.depth,
            "is_seed": record.is_seed,
            "role": role.role,
            "role_score": role.role_score,
            "cluster_id": snapshot.clusters.by_gid[gid],
            "priority_score": role.priority_score,
            "evidence": role.evidence,
            "rule_id": role.rule_id,
            "flags": list(record.flags),
            "metrics": {
                "in_degree": record.in_degree,
                "out_degree": record.out_degree,
                "observed_in_kzt": money_text(record.observed_in),
                "observed_out_kzt": money_text(record.observed_out),
                "observed_out_in_ratio": record.observed_out_in_ratio,
                "ratio_usable": record.ratio_usable,
                "reachable_seed_count": record.reachable_seed_count,
                "betweenness": record.betweenness,
            },
            "priority_breakdown": list(role.priority_breakdown),
        })
    api_edges = []
    for row in snapshot.dataset.edges.itertuples(index=False):
        src, dst = int(row.src), int(row.dst)
        if src in selected_set and dst in selected_set:
            depth = max(nodes[src].depth, nodes[dst].depth) if pd.isna(row.depth) else int(row.depth)
            api_edges.append({
                "id": f"{src}:{dst}",
                "source": str(src),
                "target": str(dst),
                "sum_kzt": money_text(Decimal(str(row.sum_kzt))),
                "n_tx": int(row.n_tx),
                "depth": depth,
            })
    return {
        "analysis_id": snapshot.analysis_id,
        "focus_gid": str(requested),
        "nodes": api_nodes,
        "edges": api_edges,
        "matched_nodes": len(distance),
        "returned_nodes": len(selected),
        "truncated": len(selected) < len(distance),
    }


def assistant_facts(snapshot: AnalysisSnapshot, focus_gids: list[str]) -> list[EvidenceFact]:
    """Build a small, server-owned fact catalog. No UI-supplied metrics are trusted."""
    facts: list[EvidenceFact] = []
    selected = list(dict.fromkeys(int(gid) for gid in focus_gids))
    for gid in selected:
        node = snapshot.metrics.nodes[gid]
        role = snapshot.roles[gid]
        entries = [
            ("role", role.role, None, f"Роль по правилу {role.rule_id}: {role.evidence}"),
            ("in_degree", str(node.in_degree), "counterparties", f"Наблюдаются входящие от {node.in_degree} разных плательщиков."),
            ("out_degree", str(node.out_degree), "counterparties", f"Наблюдаются исходящие к {node.out_degree} разным получателям."),
            ("observed_in_kzt", money_text(node.observed_in), "KZT", f"Наблюдаемый входящий поток: {money_text(node.observed_in)} KZT."),
            ("observed_out_kzt", money_text(node.observed_out), "KZT", f"Наблюдаемый исходящий поток: {money_text(node.observed_out)} KZT."),
            ("seed_reach", str(node.reachable_seed_count), "seeds", f"Узел достижим от {node.reachable_seed_count} исходных клиентов в пределах четырёх переходов."),
        ]
        if node.ratio_usable and node.observed_out_in_ratio is not None:
            entries.append(("observed_out_in_ratio", f"{node.observed_out_in_ratio:.4f}", "ratio", f"Отношение наблюдаемых исходящих к входящим: {node.observed_out_in_ratio:.1%}."))
        for flag in node.flags:
            entries.append((flag, "true", None, {
                "depth4_censored": "Обход обрывается на четвёртом колене; дальнейшие исходящие неизвестны.",
                "seed_inflow_incomplete": "Для исходного клиента не наблюдается полный входящий поток.",
                "outflow_exceeds_observed_inflow": "Наблюдаемый исходящий поток выше входящего: покрытие данных неполное.",
                "isolated": "Узел не имеет связей в предоставленной выгрузке.",
                "self_transfers_excluded": "Переводы на тот же gid исключены из структурных метрик.",
            }[flag]))
        for metric, value, unit, text in entries:
            facts.append(EvidenceFact(id=f"node:{gid}:{metric}", gid=str(gid), metric=metric, value=value, unit=unit, text=text))
    # Direct observed links, sorted by transferred amount and limited globally.
    candidates = []
    selected_set = set(selected)
    for row in snapshot.dataset.edges.itertuples(index=False):
        src, dst = int(row.src), int(row.dst)
        if src != dst and (src in selected_set or dst in selected_set):
            candidates.append((Decimal(str(row.sum_kzt)), src, dst, int(row.n_tx)))
    for amount, src, dst, count in sorted(candidates, key=lambda row: (-row[0], row[1], row[2])):
        if len(facts) >= 50:
            break
        facts.append(EvidenceFact(
            id=f"edge:{src}:{dst}", gid=str(src), metric="observed_edge",
            value=money_text(amount), unit="KZT",
            text=f"Наблюдаемое направление {src} → {dst}: {money_text(amount)} KZT, {count} переводов.",
        ))
    return facts[:50]
