"""End-to-end HTTP checks against real computed data, with LLM disabled."""

from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.contracts import AssistantResponse, DashboardResponse, GraphResponse
from app.main import app
from app.pipeline import DEFAULT_DATA_DIR


def test_analyst_flow_and_isolated_gid(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("LLM_ENABLED", "false")
    monkeypatch.setenv("ARTIFACTS_DIR", str(tmp_path))
    with TestClient(app) as client:
        analysis = client.post("/api/v1/analyze", json={"dataset_id": "hackalem-july-2026"})
        assert analysis.status_code == 200
        analysis_id = analysis.json()["analysis_id"]
        url = f"/api/v1/analyses/{analysis_id}"

        dashboard = client.get(url)
        assert dashboard.status_code == 200
        data = DashboardResponse.model_validate(dashboard.json())
        assert data.stats.n_nodes == 2248
        assert len(data.ranking.items) == 20
        focus = data.ranking.items[0].gid

        graph = client.get(f"{url}/graph", params={"focus_gid": focus, "hops": 1})
        assert graph.status_code == 200
        subgraph = GraphResponse.model_validate(graph.json())
        assert subgraph.focus_gid == focus
        assert all(edge.source in {node.gid for node in subgraph.nodes} for edge in subgraph.edges)
        assert all(edge.target in {node.gid for node in subgraph.nodes} for edge in subgraph.edges)

        missing = client.get(f"{url}/graph", params={"focus_gid": "999999999999999999"})
        assert missing.status_code == 404 and missing.json()["error"]["code"] == "GID_NOT_FOUND"

        # The real supplied data contains seed clients absent from every edge.
        from app.loader import load_dataset
        dataset = load_dataset(DEFAULT_DATA_DIR)
        connected = set(dataset.edges["src"]) | set(dataset.edges["dst"])
        isolated = next(str(int(row.gid)) for row in dataset.nodes.itertuples(index=False) if row.is_seed and row.gid not in connected)
        one = client.get(f"{url}/graph", params={"focus_gid": isolated, "hops": 1})
        assert one.status_code == 200
        assert len(one.json()["nodes"]) == 1 and one.json()["edges"] == []

        assistant = client.post(f"{url}/assistant", json={"question": "Что проверить?", "focus_gids": [focus]})
        assert assistant.status_code == 200
        explanation = AssistantResponse.model_validate(assistant.json())
        assert explanation.mode == "fallback" and explanation.fallback_reason == "disabled"
        assert explanation.evidence

        for filename in ("nodes_roles.csv", "clusters.csv", "top_nodes.csv"):
            export = client.get(f"{url}/exports/{filename}")
            assert export.status_code == 200
            assert "text/csv" in export.headers["content-type"]
            assert export.content


@pytest.mark.parametrize("invalid_gid", [
    "9" * 5000,
    "9223372036854775808",
    "-9223372036854775809",
])
def test_invalid_gid_returns_validation_error(tmp_path: Path, monkeypatch, invalid_gid: str) -> None:
    monkeypatch.setenv("LLM_ENABLED", "false")
    monkeypatch.setenv("ARTIFACTS_DIR", str(tmp_path))
    with TestClient(app) as client:
        analysis = client.post("/api/v1/analyze", json={"dataset_id": "hackalem-july-2026"})
        assert analysis.status_code == 200
        url = f"/api/v1/analyses/{analysis.json()['analysis_id']}"

        graph = client.get(f"{url}/graph", params={"focus_gid": invalid_gid})
        assert graph.status_code == 422
        assert graph.json()["error"]["code"] == "INVALID_INPUT"

        assistant = client.post(f"{url}/assistant", json={
            "question": "Что проверить?", "focus_gids": [invalid_gid],
        })
        assert assistant.status_code == 422
        assert assistant.json()["error"]["code"] == "INVALID_INPUT"
