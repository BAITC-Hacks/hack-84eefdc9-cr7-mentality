"""Check the public analyst flow against a local or deployed API.

No third-party packages are needed. Example:
python backend/scripts/smoke_api.py --base-url http://localhost:8000
"""

import argparse
import csv
from io import StringIO
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def fetch(base_url: str, path: str, *, body: dict | None = None, origin: str | None = None):
    headers = {"Accept": "application/json"}
    if origin:
        headers["Origin"] = origin
    payload = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(body).encode("utf-8")
    request = Request(base_url + path, data=payload, headers=headers)
    try:
        with urlopen(request, timeout=45) as response:
            content = response.read()
            if origin:
                assert response.headers.get("Access-Control-Allow-Origin") == origin, (
                    f"CORS_ORIGINS does not allow {origin}"
                )
            return json.loads(content) if "json" in response.headers.get("Content-Type", "") else content
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"HTTP {exc.code} on {path}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Cannot reach {base_url}: {exc.reason}") from exc


def check(base_url: str, gid: str | None, origin: str | None) -> None:
    health = fetch(base_url, "/healthz", origin=origin)
    assert health["status"] == "ok", f"API is not ready: {health}"
    if origin:
        preflight = Request(
            base_url + "/api/v1/analyze",
            method="OPTIONS",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        with urlopen(preflight, timeout=15) as response:
            assert response.status == 200, "CORS preflight failed"
            assert response.headers.get("Access-Control-Allow-Origin") == origin, "CORS origin rejected"
            assert "POST" in response.headers.get("Access-Control-Allow-Methods", ""), "CORS POST rejected"

    analysis = fetch(base_url, "/api/v1/analyze", body={"dataset_id": "hackalem-july-2026"}, origin=origin)
    assert analysis["status"] == "ready"
    analysis_id = analysis["analysis_id"]
    path = f"/api/v1/analyses/{analysis_id}"
    dashboard = fetch(base_url, path, origin=origin)
    assert dashboard["stats"]["n_nodes"] == 2248
    assert dashboard["stats"]["n_edges"] == 3119
    assert dashboard["stats"]["n_transactions"] == 4840
    assert len(dashboard["ranking"]["items"]) >= 20
    assert len(dashboard["exports"]) == 3
    focus = gid or dashboard["ranking"]["items"][0]["gid"]

    query = urlencode({"focus_gid": focus, "hops": 1, "max_nodes": 250})
    graph = fetch(base_url, f"{path}/graph?{query}", origin=origin)
    ids = {node["gid"] for node in graph["nodes"]}
    assert focus in ids, f"Focused gid {focus} is absent from graph response"
    assert all(edge["source"] in ids and edge["target"] in ids for edge in graph["edges"])
    focused = next(node for node in graph["nodes"] if node["gid"] == focus)
    assert focused["evidence"] and focused["rule_id"]

    assistant = fetch(base_url, f"{path}/assistant", body={
        "question": "Почему этот узел в приоритете и что проверить дальше?",
        "focus_gids": [focus],
    }, origin=origin)
    assert assistant["mode"] in {"live", "fallback"}
    assert assistant["answer"]["summary"] and assistant["evidence"]
    evidence_ids = {fact["id"] for fact in assistant["evidence"]}
    assert all(set(item["evidence_ids"]) <= evidence_ids for item in assistant["answer"]["findings"])

    expected = {"nodes_roles.csv": 2248, "top_nodes.csv": 20, "clusters.csv": 1}
    for filename, minimum in expected.items():
        raw = fetch(base_url, f"{path}/exports/{filename}", origin=origin)
        rows = list(csv.DictReader(StringIO(raw.decode("utf-8-sig"))))
        assert len(rows) >= minimum, f"{filename}: expected at least {minimum} rows, got {len(rows)}"
        assert all(rows[0].values()), f"{filename}: first row has an empty field"

    print(f"PASS analysis={analysis_id} nodes=2248 edges=3119 focus_gid={focus}")
    print(f"PASS graph_nodes={len(graph['nodes'])} graph_edges={len(graph['edges'])} assistant={assistant['mode']}")
    print("PASS CSV exports: nodes_roles.csv, clusters.csv, top_nodes.csv")
    if origin:
        print(f"PASS CORS origin={origin}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke-test the AML demo flow over HTTP")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend URL, without trailing slash")
    parser.add_argument("--gid", help="Optional gid named by the jury")
    parser.add_argument("--origin", help="Optional frontend origin to validate CORS")
    args = parser.parse_args()
    check(args.base_url.rstrip("/"), args.gid, args.origin)


if __name__ == "__main__":
    main()
