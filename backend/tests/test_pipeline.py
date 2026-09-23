"""Acceptance checks tied to the supplied batch and the hackathon CSV contract."""

import csv
from pathlib import Path

from app.exports import NAMES
from app.pipeline import DEFAULT_DATA_DIR, run_pipeline


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def test_full_batch_keeps_every_node_and_explains_roles(tmp_path: Path) -> None:
    snapshot = run_pipeline(DEFAULT_DATA_DIR, tmp_path)
    roles = _read_csv(tmp_path / "nodes_roles.csv")
    clusters = _read_csv(tmp_path / "clusters.csv")
    top = _read_csv(tmp_path / "top_nodes.csv")

    source_ids = set(int(gid) for gid in snapshot.dataset.nodes["gid"])
    assert len(roles) == len(source_ids) == 2248
    assert {int(row["gid"]) for row in roles} == source_ids
    assert len(clusters) == snapshot.dashboard["stats"]["n_clusters"]
    assert sum(int(row["n_nodes"]) for row in clusters) == 2248
    assert sum(int(row["n_seed"]) for row in clusters) == 81
    assert {int(row["cluster_id"]) for row in roles} == set(range(len(clusters)))
    assert len(top) >= 20
    assert [int(row["rank"]) for row in top] == list(range(1, len(top) + 1))

    allowed_roles = {"coordinator", "consolidator", "distributor", "transit", "terminal", "peripheral"}
    assert {row["role"] for row in roles} == allowed_roles
    assert all(row["evidence"] and len(row["evidence"]) <= 200 for row in roles)
    assert all(0 <= float(row["role_score"]) <= 1 for row in roles)
    assert all(0 <= float(row["priority_score"]) <= 1 for row in roles)
    assert all(row["why"] for row in top)

    depth4 = [node for node in snapshot.metrics.nodes.values() if node.depth == 4]
    assert len(depth4) == 444
    assert all(snapshot.roles[node.gid].role != "terminal" for node in depth4)
    assert all(not node.ratio_usable for node in snapshot.metrics.nodes.values() if node.is_seed)
    isolated_seeds = [node for node in snapshot.metrics.nodes.values() if node.is_seed and "isolated" in node.flags]
    assert len(isolated_seeds) == 19
    assert all(snapshot.roles[node.gid].priority_score == 0 for node in isolated_seeds)


def test_csv_output_is_reproducible_without_llm(tmp_path: Path) -> None:
    first = tmp_path / "first"
    second = tmp_path / "second"
    a = run_pipeline(DEFAULT_DATA_DIR, first)
    b = run_pipeline(DEFAULT_DATA_DIR, second)
    assert a.analysis_id == b.analysis_id
    assert all((first / name).read_bytes() == (second / name).read_bytes() for name in NAMES)
