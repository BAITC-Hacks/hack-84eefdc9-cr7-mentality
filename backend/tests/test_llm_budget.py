"""Public demo limits must prevent provider calls without hiding graph facts."""

from fastapi.testclient import TestClient
import pytest

from app.ai import fallback
from app.contracts import AssistantResponse
from app.llm_budget import LLMBudget
from app.main import app


def test_concurrency_and_rolling_window() -> None:
    now = [100.0]
    budget = LLMBudget(per_minute=2, concurrency=1, clock=lambda: now[0])
    assert budget.try_acquire()
    assert not budget.try_acquire()
    budget.release()
    now[0] = 101
    assert budget.try_acquire()
    budget.release()
    assert not budget.try_acquire()
    now[0] = 160
    assert budget.try_acquire()  # The first attempt has expired, the second has not.
    budget.release()
    assert not budget.try_acquire()


def test_assistant_budget_releases_after_failure_and_blocks_paid_calls(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("ARTIFACTS_DIR", str(tmp_path))
    monkeypatch.setenv("LLM_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-no-network")
    monkeypatch.setenv("OPENAI_MODEL", "test-only")
    monkeypatch.setenv("LLM_REQUESTS_PER_MINUTE", "2")
    monkeypatch.setenv("LLM_MAX_CONCURRENT", "1")
    calls = []

    async def fake_explain(analysis_id, body, facts, limitations):
        calls.append(body.question)
        if len(calls) == 1:
            raise RuntimeError("simulated adapter failure")
        return AssistantResponse(
            analysis_id=analysis_id, mode="fallback", fallback_reason="unavailable",
            answer=fallback(facts), evidence=facts,
        )

    monkeypatch.setattr("app.main.explain", fake_explain)
    with TestClient(app) as client:
        analysis_id = client.post("/api/v1/analyze", json={"dataset_id": "hackalem-july-2026"}).json()["analysis_id"]
        url = f"/api/v1/analyses/{analysis_id}"
        gid = client.get(url).json()["ranking"]["items"][0]["gid"]
        body = {"question": "Что проверить?", "focus_gids": [gid]}
        with pytest.raises(RuntimeError, match="simulated adapter failure"):
            client.post(f"{url}/assistant", json=body)
        assert client.post(f"{url}/assistant", json=body).status_code == 200
        limited = client.post(f"{url}/assistant", json=body).json()
        assert len(calls) == 2
        assert limited["mode"] == "fallback" and limited["fallback_reason"] == "unavailable"
        assert "лимит" in limited["answer"]["summary"] and limited["evidence"]
