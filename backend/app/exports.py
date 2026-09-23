"""Write the three mandatory, deterministic CSV deliverables."""

import csv
import os
from pathlib import Path
import tempfile

from .clusters import Clusters
from .metrics import GraphMetrics
from .roles import RoleResult, money_text


NAMES = ("nodes_roles.csv", "clusters.csv", "top_nodes.csv")


def cluster_hypothesis(group: tuple[int, ...], roles: dict[int, RoleResult]) -> str:
    if len(group) == 1:
        return "Отдельный узел без наблюдаемых связей с другими участниками."
    distribution = {role: sum(roles[gid].role == role for gid in group) for role in (
        "coordinator", "consolidator", "distributor", "transit", "terminal"
    )}
    lead = max(distribution, key=lambda role: (distribution[role], -list(distribution).index(role)))
    if distribution[lead] == 0:
        return "Связная группа переводов без выраженной структурной роли; требуется ручная проверка."
    text = {
        "coordinator": "узлами, связывающими ветви сети",
        "consolidator": "консолидацией наблюдаемых поступлений",
        "distributor": "веерным распределением переводов",
        "transit": "пропусканием поступлений далее по сети",
        "terminal": "узлами с низким наблюдаемым исходящим потоком",
    }[lead]
    return f"Сообщество с признаками {text}; гипотеза для проверки, не установленная группа."


def cluster_records(metrics: GraphMetrics, clusters: Clusters, roles: dict[int, RoleResult]) -> list[dict]:
    result = []
    for cluster_id, group in enumerate(clusters.groups):
        top = sorted(group, key=lambda gid: (-roles[gid].priority_score, gid))[:5]
        result.append({
            "cluster_id": cluster_id,
            "n_nodes": len(group),
            "n_seed": sum(metrics.nodes[gid].is_seed for gid in group),
            "sum_kzt_internal": money_text(clusters.internal_turnover[cluster_id]),
            "top_gids": [str(gid) for gid in top],
            "hypothesis": cluster_hypothesis(group, roles),
        })
    return result


def _write_one(path: Path, header: tuple[str, ...], rows: list[tuple]) -> None:
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="", prefix=".writing-", suffix=".csv",
            dir=path.parent, delete=False,
        ) as handle:
            temp_name = handle.name
            writer = csv.writer(handle, lineterminator="\n")
            writer.writerow(header)
            writer.writerows(rows)
        os.replace(temp_name, path)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def write_exports(
    out_dir: Path,
    metrics: GraphMetrics,
    clusters: Clusters,
    roles: dict[int, RoleResult],
    cluster_rows: list[dict],
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    ordered_gids = sorted(metrics.nodes)
    _write_one(
        out_dir / "nodes_roles.csv",
        ("gid", "role", "role_score", "cluster_id", "priority_score", "evidence"),
        [
            (
                gid, roles[gid].role, f"{roles[gid].role_score:.6f}", clusters.by_gid[gid],
                f"{roles[gid].priority_score:.6f}", roles[gid].evidence,
            )
            for gid in ordered_gids
        ],
    )
    _write_one(
        out_dir / "clusters.csv",
        ("cluster_id", "n_nodes", "n_seed", "sum_kzt_internal", "top_gids", "hypothesis"),
        [
            (
                row["cluster_id"], row["n_nodes"], row["n_seed"], row["sum_kzt_internal"],
                ";".join(row["top_gids"]), row["hypothesis"],
            )
            for row in cluster_rows
        ],
    )
    ranked = sorted(ordered_gids, key=lambda gid: roles[gid].rank)[:100]
    _write_one(
        out_dir / "top_nodes.csv",
        ("rank", "gid", "role", "priority_score", "why"),
        [
            (roles[gid].rank, gid, roles[gid].role, f"{roles[gid].priority_score:.6f}", roles[gid].why)
            for gid in ranked
        ],
    )
