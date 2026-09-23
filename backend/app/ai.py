"""Optional OpenAI adapter over the server-computed AML facts.

Dependencies: openai, pydantic. No API call is made when importing this module.
The caller builds facts from its own immutable analysis snapshot, never from
client-supplied metrics. The deterministic pipeline does not import this file.
"""
import asyncio
import json
import os
from pathlib import Path

from openai import AsyncOpenAI, OpenAIError
from pydantic import ValidationError

from .contracts import AIAnswer, AssistantRequest, AssistantResponse, EvidenceFact, Finding

SYSTEM_PROMPT = Path(__file__).with_name("system_prompt.txt").read_text(encoding="utf-8")


def validate_answer(answer: AIAnswer, facts: list[EvidenceFact]) -> None:
    allowed = {fact.id for fact in facts}
    if len(answer.summary) > 600 or len(answer.findings) > 4:
        raise ValueError("Answer too long")
    if len(answer.missing_data) > 4 or len(answer.next_steps) > 3:
        raise ValueError("Too many recommendations")
    if answer.status == "ok" and not answer.findings:
        raise ValueError("Missing evidence")
    for finding in answer.findings:
        if not finding.evidence_ids or not set(finding.evidence_ids) <= allowed:
            raise ValueError("Unknown or empty evidence references")
        if len(finding.title) > 160:
            raise ValueError("Finding too long")
    # Numeric facts are rendered from the server catalog, not generated prose.
    prose = [answer.summary, *(f.title for f in answer.findings), *answer.missing_data, *answer.next_steps]
    if any(char.isdigit() for text in prose for char in text):
        raise ValueError("Generated numeric claim")


def fallback(facts: list[EvidenceFact]) -> AIAnswer:
    return AIAnswer(
        status="insufficient_data",
        summary="ИИ-пояснение недоступно. Ниже показаны рассчитанные признаки; они предназначены для ручной проверки.",
        findings=[Finding(title="Наблюдаемые признаки выбранного узла", evidence_ids=[fact.id]) for fact in facts[:4]],
        missing_data=["Полные входящие и исходящие потоки за пределами выборки не наблюдаются."],
        next_steps=["Проверьте связи и ограничения покрытия в карточке узла."],
    )


async def explain(
    analysis_id: str,
    request: AssistantRequest,
    facts: list[EvidenceFact],
    limitations: list[str],
) -> AssistantResponse:
    """facts and limitations MUST be assembled on the backend from analysis_id.

    Server context builder includes every selected gid's role/evidence and flags,
    at most 50 facts, plus relevant observed links; it does not read UI metrics.
    """
    context = {
        "analysis_id": analysis_id,
        "focus_gids": request.focus_gids,
        "facts": [fact.model_dump() for fact in facts],
        "limitations": limitations,
        "scope": "selected nodes and explicitly supplied observed links only",
    }
    reason = None
    answer = None
    key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL")
    if not key or not model or os.getenv("LLM_ENABLED", "false").lower() != "true":
        reason = "disabled"
    else:
        try:
            async with AsyncOpenAI(api_key=key, timeout=18.0, max_retries=0) as client:
                response = await asyncio.wait_for(
                    client.responses.parse(
                        model=model,
                        input=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": json.dumps({"question": request.question, "context": context}, ensure_ascii=False)},
                        ],
                        text_format=AIAnswer,
                        max_output_tokens=1600,
                        store=False,
                    ),
                    timeout=20,
                )
            refused = any(
                item.type == "message" and any(part.type == "refusal" for part in item.content)
                for item in response.output
            )
            if refused:
                reason = "refusal"
            elif response.status != "completed":
                reason = "incomplete"
            elif response.output_parsed is None:
                reason = "invalid_output"
            else:
                validate_answer(response.output_parsed, facts)
                answer = response.output_parsed
        except asyncio.TimeoutError:
            reason = "timeout"
        except OpenAIError:
            # Includes provider timeout, auth, quota and network errors.
            reason = "unavailable"
        except (ValueError, ValidationError):
            reason = "invalid_output"
    return AssistantResponse(
        analysis_id=analysis_id,
        mode="live" if answer is not None else "fallback",
        fallback_reason=reason,
        answer=answer if answer is not None else fallback(facts),
        evidence=facts,
    )
