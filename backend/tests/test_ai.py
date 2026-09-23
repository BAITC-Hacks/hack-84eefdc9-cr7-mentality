"""Exercise the live structured-response adapter without external credentials."""

import asyncio
from types import SimpleNamespace

from app import ai
from app.contracts import AIAnswer, AssistantRequest, EvidenceFact, Finding


def test_live_answer_must_reference_server_fact(monkeypatch) -> None:
    fact = EvidenceFact(
        id="node:123:in_degree", gid="123", metric="in_degree", value="4",
        unit="counterparties", text="Наблюдаются четыре различных плательщика.",
    )
    parsed = AIAnswer(
        status="ok", summary="Есть признаки консолидации в наблюдаемом графе.",
        findings=[Finding(title="Несколько источников переводов", evidence_ids=[fact.id])],
        missing_data=["Внешние переводы неизвестны."],
        next_steps=["Проверьте дополнительные выписки клиента."],
    )

    class FakeResponses:
        async def parse(self, **kwargs):
            assert kwargs["text_format"] is AIAnswer
            return SimpleNamespace(status="completed", output=[], output_parsed=parsed)

    class FakeClient:
        responses = FakeResponses()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

    monkeypatch.setattr(ai, "AsyncOpenAI", lambda **kwargs: FakeClient())
    monkeypatch.setenv("LLM_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-never-sent")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-6-luna")
    result = asyncio.run(ai.explain(
        "a_0123456789abcdef", AssistantRequest(question="Что проверить?", focus_gids=["123"]),
        [fact], ["Наблюдаются только переводы внутри банка."],
    ))
    assert result.mode == "live" and result.fallback_reason is None
    assert result.answer.findings[0].evidence_ids == [fact.id]
