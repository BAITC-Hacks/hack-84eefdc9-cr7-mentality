"""Stable Louvain communities over an undirected projection."""

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal
import math

import networkx as nx

from .loader import Dataset, money
from .metrics import GraphMetrics


@dataclass(frozen=True)
class Clusters:
    by_gid: dict[int, int]
    groups: tuple[tuple[int, ...], ...]
    internal_turnover: dict[int, Decimal]


def compute_clusters(dataset: Dataset, metrics: GraphMetrics, seed: int = 42) -> Clusters:
    projection = nx.Graph()
    projection.add_nodes_from(sorted(metrics.nodes))
    pair_amount: dict[tuple[int, int], Decimal] = defaultdict(Decimal)
    for row in dataset.edges.itertuples(index=False):
        src, dst = int(row.src), int(row.dst)
        if src == dst:
            continue
        pair_amount[(min(src, dst), max(src, dst))] += money(row.sum_kzt)
    for (src, dst), amount in sorted(pair_amount.items()):
        projection.add_edge(src, dst, weight=math.log1p(float(amount)))

    communities: list[tuple[int, ...]] = []
    for component in sorted(nx.connected_components(projection), key=min):
        if len(component) == 1:
            communities.append(tuple(component))
            continue
        subgraph = projection.subgraph(component).copy()
        result = nx.community.louvain_communities(
            subgraph, weight="weight", resolution=1.0, seed=seed
        )
        communities.extend(tuple(sorted(group)) for group in result)
    groups = tuple(sorted(communities, key=lambda group: group[0]))
    by_gid = {gid: cluster_id for cluster_id, group in enumerate(groups) for gid in group}
    if len(by_gid) != len(metrics.nodes):
        raise RuntimeError("Community partition did not cover all input nodes")

    internal = {cluster_id: Decimal(0) for cluster_id in range(len(groups))}
    for row in dataset.edges.itertuples(index=False):
        src, dst = int(row.src), int(row.dst)
        if by_gid[src] == by_gid[dst]:
            internal[by_gid[src]] += money(row.sum_kzt)
    return Clusters(by_gid, groups, internal)
