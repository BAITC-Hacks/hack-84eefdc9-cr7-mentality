"""Offline batch: three Parquet files -> roles, clusters and three CSV files.

From backend/: python -m app.pipeline --data-dir data --out-dir artifacts
"""

import argparse
from collections import Counter
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
import hashlib
from pathlib import Path
import time

import networkx as nx

from .clusters import Clusters, compute_clusters
from .errors import DataValidationError
from .exports import NAMES, cluster_records, write_exports
from .loader import Dataset, FILES, load_dataset, money
from .metrics import GraphMetrics, compute_metrics
from .roles import ROLE_WEIGHT, RoleResult, assign_roles_and_priorities, money_text


VERSION = "rules-v1"
DEFAULT_BACKEND = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = DEFAULT_BACKEND / "data"
DEFAULT_OUT_DIR = DEFAULT_BACKEND / "artifacts"
PERIOD_START = date(2026, 7, 1)
PERIOD_END = date(2026, 7, 31)


@dataclass
class AnalysisSnapshot:
    analysis_id: str
    dataset: Dataset
    metrics: GraphMetrics
    clusters: Clusters
    roles: dict[int, RoleResult]
    cluster_rows: list[dict]
    dashboard: dict
    out_dir: Path
    runtime_ms: int


def calculate_analysis_id(data_dir: Path, seed: int) -> str:
    digest = hashlib.sha256()
    digest.update(f"{VERSION}|seed={seed}|".encode("ascii"))
    for name in FILES:
        digest.update(name.encode("ascii"))
        with (data_dir / name).open("rb") as handle:
            for block in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(block)
    for name in ("loader.py", "metrics.py", "roles.py", "clusters.py", "exports.py", "pipeline.py"):
        digest.update(name.encode("ascii"))
        digest.update((Path(__file__).parent / name).read_bytes())
    digest.update((DEFAULT_BACKEND / "requirements.txt").read_bytes())
    return "a_" + digest.hexdigest()[:16]


def build_dashboard(
    analysis_id: str,
    dataset: Dataset,
    metrics: GraphMetrics,
    clusters: Clusters,
    roles: dict[int, RoleResult],
    cluster_rows: list[dict],
) -> dict:
    nodes = metrics.nodes
    role_counts = Counter(result.role for result in roles.values())
    depth_counts = Counter(node.depth for node in nodes.values())
    daily_sum: dict[date, Decimal] = {}
    daily_count: Counter[date] = Counter()
    turnover = Decimal(0)
    for row in dataset.transactions.itertuples(index=False):
        amount = money(row.sum_kzt)
        turnover += amount
        daily_sum[row.date] = daily_sum.get(row.date, Decimal(0)) + amount
        daily_count[row.date] += 1
    if any(day < PERIOD_START or day > PERIOD_END for day in daily_sum):
        raise DataValidationError("transactions.date must be in July 2026")
    daily_flow = []
    day = PERIOD_START
    while day <= PERIOD_END:
        daily_flow.append({"date": day.isoformat(), "sum_kzt": money_text(daily_sum.get(day, Decimal(0))), "n_tx": daily_count[day]})
        day += timedelta(days=1)

    depth4_count = sum(node.depth == 4 for node in nodes.values())
    seed_count = sum(node.is_seed for node in nodes.values())
    extra_out_count = sum(node.observed_out > node.observed_in for node in nodes.values())
    isolated_count = nx.number_of_isolates(metrics.graph)
    warnings = [
        {"code": "OUTGOING_ONLY", "message": "Выгрузка не содержит полный баланс клиентов и переводы вне наблюдаемой сети.", "affected_nodes": len(nodes)},
        {"code": "DEPTH4_CENSORED", "message": "На четвёртом колене исходящий обход обрывается: отсутствие исходящих не подтверждает конечного получателя.", "affected_nodes": depth4_count},
        {"code": "SEED_INFLOW_INCOMPLETE", "message": "Входящие переводы исходных клиентов до начала обхода не наблюдаются.", "affected_nodes": seed_count},
        {"code": "OUTFLOW_EXCEEDS_OBSERVED_INFLOW", "message": "Наблюдаемые исходящие выше входящих; это признак неполноты покрытия, а не вывод о происхождении денег.", "affected_nodes": extra_out_count},
        {"code": "THRESHOLD_5000_KZT", "message": "Переводы ниже порога выгрузки 5 000 KZT невидимы.", "affected_nodes": None},
    ]
    for warning in dataset.warnings:
        code, count = warning.split(":", 1)
        warnings.append({"code": code, "message": "Агрегаты edges и transactions расходятся по отдельным парам; граф рассчитан по edges.", "affected_nodes": int(count)})

    ranked = sorted(nodes, key=lambda gid: roles[gid].rank)
    return {
        "analysis_id": analysis_id,
        "algorithm_version": VERSION,
        "currency": "KZT",
        "period": {"start": PERIOD_START.isoformat(), "end": PERIOD_END.isoformat()},
        "stats": {
            "n_nodes": len(nodes),
            "n_edges": len(dataset.edges),
            "n_transactions": len(dataset.transactions),
            "n_seed": seed_count,
            "n_clusters": len(clusters.groups),
            "n_weak_components": nx.number_weakly_connected_components(metrics.graph),
            "n_isolated_nodes": isolated_count,
            "n_depth4_censored": depth4_count,
            "graph_turnover_kzt": money_text(turnover),
            "self_transfer_turnover_kzt": money_text(metrics.self_transfer_turnover),
        },
        "charts": {
            "by_role": [{"role": role, "count": role_counts[role]} for role in ROLE_WEIGHT],
            "by_depth": [{"depth": depth, "count": depth_counts[depth]} for depth in range(5)],
            "daily_flow": daily_flow,
        },
        "clusters": cluster_rows,
        "ranking": {
            "items": [
                {"rank": roles[gid].rank, "gid": str(gid), "role": roles[gid].role,
                 "priority_score": roles[gid].priority_score, "why": roles[gid].why}
                for gid in ranked
            ],
            "total": len(nodes),
            "offset": 0,
            "limit": 20,
        },
        "warnings": warnings,
        "exports": [
            {"filename": name, "url": f"/api/v1/analyses/{analysis_id}/exports/{name}"}
            for name in NAMES
        ],
    }


def run_pipeline(data_dir: Path = DEFAULT_DATA_DIR, out_dir: Path = DEFAULT_OUT_DIR, seed: int = 42) -> AnalysisSnapshot:
    started = time.perf_counter()
    data_dir, out_dir = Path(data_dir), Path(out_dir)
    analysis_id = calculate_analysis_id(data_dir, seed)
    dataset = load_dataset(data_dir)
    metrics = compute_metrics(dataset, seed)
    clusters = compute_clusters(dataset, metrics, seed)
    roles = assign_roles_and_priorities(metrics)
    cluster_rows = cluster_records(metrics, clusters, roles)
    dashboard = build_dashboard(analysis_id, dataset, metrics, clusters, roles, cluster_rows)
    if len(roles) != len(dataset.nodes) or len(clusters.by_gid) != len(dataset.nodes):
        raise RuntimeError("Not all nodes received a role and cluster")
    write_exports(out_dir, metrics, clusters, roles, cluster_rows)
    elapsed = round((time.perf_counter() - started) * 1000)
    return AnalysisSnapshot(analysis_id, dataset, metrics, clusters, roles, cluster_rows, dashboard, out_dir, elapsed)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build AML graph roles and three CSV exports offline")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    snapshot = run_pipeline(args.data_dir, args.out_dir, args.seed)
    stats = snapshot.dashboard["stats"]
    print(f"analysis_id={snapshot.analysis_id} runtime_ms={snapshot.runtime_ms}")
    print(f"nodes={stats['n_nodes']} edges={stats['n_edges']} transactions={stats['n_transactions']} clusters={stats['n_clusters']}")
    for name in NAMES:
        print(args.out_dir / name)


if __name__ == "__main__":
    main()
