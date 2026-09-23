"""Directed graph metrics computed from the full observed batch."""

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal

import networkx as nx

from .loader import Dataset, money


@dataclass
class NodeMetrics:
    gid: int
    depth: int
    is_seed: bool
    in_degree: int = 0
    out_degree: int = 0
    observed_in: Decimal = Decimal(0)
    observed_out: Decimal = Decimal(0)
    observed_out_in_ratio: float | None = None
    ratio_usable: bool = False
    reachable_seed_count: int = 0
    betweenness: float = 0.0
    flags: tuple[str, ...] = ()


@dataclass
class GraphMetrics:
    graph: nx.DiGraph
    nodes: dict[int, NodeMetrics]
    self_transfer_turnover: Decimal


def compute_metrics(dataset: Dataset, seed: int = 42) -> GraphMetrics:
    nodes = {
        int(row.gid): NodeMetrics(int(row.gid), int(row.depth), bool(row.is_seed))
        for row in dataset.nodes.itertuples(index=False)
    }
    graph = nx.DiGraph()
    graph.add_nodes_from(nodes)
    self_transfer_turnover = Decimal(0)
    self_incident: set[int] = set()
    for row in dataset.edges.itertuples(index=False):
        src, dst = int(row.src), int(row.dst)
        amount = money(row.sum_kzt)
        if src == dst:
            self_transfer_turnover += amount
            self_incident.add(src)
            continue
        graph.add_edge(src, dst)
        nodes[src].observed_out += amount
        nodes[dst].observed_in += amount

    # Distinct counterparties: edge rows are already aggregated per ordered pair.
    for gid, record in nodes.items():
        record.in_degree = graph.in_degree(gid)
        record.out_degree = graph.out_degree(gid)

    reached_by: dict[int, set[int]] = defaultdict(set)
    for seed_gid, seed_node in nodes.items():
        if not seed_node.is_seed:
            continue
        visited = {seed_gid}
        frontier = {seed_gid}
        for _ in range(4):
            frontier = {dst for src in frontier for dst in graph.successors(src)} - visited
            if not frontier:
                break
            for gid in frontier:
                reached_by[gid].add(seed_gid)
            visited.update(frontier)

    if len(graph) > 2 and graph.number_of_edges():
        between = nx.betweenness_centrality(
            graph, k=min(128, len(graph)), normalized=True, weight=None, seed=seed
        )
    else:
        between = {gid: 0.0 for gid in graph}

    for gid, record in nodes.items():
        if record.observed_in > 0:
            record.observed_out_in_ratio = float(record.observed_out / record.observed_in)
        record.ratio_usable = record.observed_in > 0 and not record.is_seed and record.depth < 4
        record.reachable_seed_count = len(reached_by[gid] - {gid})
        record.betweenness = min(1.0, max(0.0, float(between.get(gid, 0.0))))
        flags = []
        if record.depth == 4:
            flags.append("depth4_censored")
        if record.is_seed:
            flags.append("seed_inflow_incomplete")
        if record.observed_out > record.observed_in:
            flags.append("outflow_exceeds_observed_inflow")
        if record.in_degree == 0 and record.out_degree == 0:
            flags.append("isolated")
        if gid in self_incident:
            flags.append("self_transfers_excluded")
        record.flags = tuple(flags)
    return GraphMetrics(graph, nodes, self_transfer_turnover)
