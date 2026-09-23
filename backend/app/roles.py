"""Explainable role rules and deterministic review priority."""

from bisect import bisect_left
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
import math

from .metrics import GraphMetrics, NodeMetrics


ROLE_WEIGHT = {
    "coordinator": 1.0,
    "consolidator": 0.95,
    "distributor": 0.85,
    "transit": 0.65,
    "terminal": 0.55,
    "peripheral": 0.10,
}
TERM_WEIGHT = {
    "inflow": 0.30,
    "in_degree": 0.20,
    "betweenness": 0.20,
    "seed_reach": 0.20,
    "role": 0.10,
}


@dataclass
class RoleResult:
    role: str
    role_score: float
    evidence: str
    rule_id: str
    priority_score: float = 0.0
    priority_breakdown: tuple[dict, ...] = ()
    rank: int = 0
    why: str = ""


def money_text(amount: Decimal) -> str:
    return format(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ".2f")


def _clip(value: float) -> float:
    return min(1.0, max(0.0, value))


def _quantile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    sorted_values = sorted(values)
    position = fraction * (len(sorted_values) - 1)
    lower = math.floor(position)
    upper = math.ceil(position)
    return sorted_values[lower] + (sorted_values[upper] - sorted_values[lower]) * (position - lower)


def _percentile(values: list, value) -> float:
    if len(values) <= 1 or value <= 0:
        return 0.0
    return _clip(bisect_left(values, value) / (len(values) - 1))


def _brief(text: str) -> str:
    return text if len(text) <= 200 else text[:197].rstrip() + "..."


def _assign_role(node: NodeMetrics, high_b: float | None, b_percentile: float) -> RoleResult:
    ratio = node.observed_out_in_ratio
    if (
        node.depth < 4 and node.in_degree >= 2 and node.out_degree >= 2
        and node.reachable_seed_count >= 3 and high_b is not None
        and node.betweenness > 0 and node.betweenness >= high_b
    ):
        score = .5 + .25 * min(node.reachable_seed_count / 10, 1) + .25 * b_percentile
        evidence = (
            f"Достижим от {node.reachable_seed_count} исходных клиентов; связывает части "
            f"наблюдаемого графа (центральность {node.betweenness:.4f}). Кандидат для проверки."
        )
        return RoleResult("coordinator", round(_clip(score), 6), _brief(evidence), "R1")
    if node.depth < 4 and node.out_degree >= 8:
        score = .5 + .5 * min(node.out_degree / 30, 1)
        evidence = f"Переводит средства {node.out_degree} различным получателям; признаки веерного распределения."
        return RoleResult("distributor", round(_clip(score), 6), _brief(evidence), "R2")
    if node.ratio_usable and node.in_degree >= 3 and ratio is not None and ratio <= .35:
        score = .5 + .25 * min(node.in_degree / 10, 1) + .25 * (1 - ratio)
        evidence = (
            f"{node.in_degree} плательщиков; наблюдаемый исходящий поток — "
            f"{ratio:.0%} входящего. Признаки консолидации."
        )
        return RoleResult("consolidator", round(_clip(score), 6), _brief(evidence), "R3")
    if (
        node.ratio_usable and node.in_degree >= 1 and node.out_degree >= 1
        and ratio is not None and .8 <= ratio <= 1.2
    ):
        score = .5 + .5 * max(0.0, 1 - abs(ratio - 1) / .2)
        evidence = (
            f"Получает от {node.in_degree}, переводит {node.out_degree} получателям; "
            f"масштаб наблюдаемых исходящих — {ratio:.0%} входящих. Признаки транзита."
        )
        return RoleResult("transit", round(_clip(score), 6), _brief(evidence), "R4")
    if node.ratio_usable and node.in_degree >= 1 and ratio is not None and ratio <= .05:
        score = .5 + .5 * (1 - ratio / .05)
        evidence = (
            f"Видны входящие от {node.in_degree} плательщиков; исходящие — "
            f"{ratio:.0%} наблюдаемого входящего. Возможный конечный получатель."
        )
        return RoleResult("terminal", round(_clip(score), 6), _brief(evidence), "R5")
    if "depth4_censored" in node.flags:
        evidence = "Обрыв на четвёртом колене: дальнейшие исходящие не наблюдаются; конечный получатель не подтверждён."
    elif "isolated" in node.flags:
        evidence = "Связи в предоставленной выгрузке отсутствуют; роль не определяется по наблюдаемому графу."
    elif node.is_seed:
        evidence = "Исходный клиент; входящие до начала обхода неизвестны, поэтому отношение потоков не применялось."
    else:
        evidence = "Наблюдаемые признаки не достигли порогов других ролей; требуется ручная проверка."
    score = .1 if "isolated" in node.flags or "depth4_censored" in node.flags else .3
    return RoleResult("peripheral", score, _brief(evidence), "R6")


def assign_roles_and_priorities(metrics: GraphMetrics) -> dict[int, RoleResult]:
    nodes = metrics.nodes
    positive_b = [node.betweenness for node in nodes.values() if node.betweenness > 0]
    high_b = _quantile(positive_b, .95)
    sorted_features = {
        "inflow": sorted(node.observed_in for node in nodes.values()),
        "in_degree": sorted(node.in_degree for node in nodes.values()),
        "betweenness": sorted(node.betweenness for node in nodes.values()),
        "seed_reach": sorted(node.reachable_seed_count for node in nodes.values()),
    }
    results: dict[int, RoleResult] = {}
    for gid, node in nodes.items():
        b_percentile = _percentile(sorted_features["betweenness"], node.betweenness)
        result = _assign_role(node, high_b, b_percentile)
        normalized = {
            "inflow": _percentile(sorted_features["inflow"], node.observed_in),
            "in_degree": _percentile(sorted_features["in_degree"], node.in_degree),
            "betweenness": b_percentile,
            "seed_reach": _percentile(sorted_features["seed_reach"], node.reachable_seed_count),
            "role": ROLE_WEIGHT[result.role],
        }
        if "isolated" in node.flags:
            normalized = {name: 0.0 for name in TERM_WEIGHT}
        result.priority_breakdown = tuple(
            {
                "feature": name,
                "normalized_value": round(normalized[name], 6),
                "weight": weight,
                "contribution": round(normalized[name] * weight, 6),
            }
            for name, weight in TERM_WEIGHT.items()
        )
        result.priority_score = round(_clip(sum(term["contribution"] for term in result.priority_breakdown)), 6)
        results[gid] = result

    ranked = sorted(results, key=lambda gid: (-results[gid].priority_score, gid))
    labels = {
        "inflow": "наблюдаемый входящий поток",
        "in_degree": "число плательщиков",
        "betweenness": "положение между ветвями сети",
        "seed_reach": "достижимость от исходных клиентов",
        "role": "структурная роль",
    }
    for rank, gid in enumerate(ranked, start=1):
        node = nodes[gid]
        result = results[gid]
        result.rank = rank
        if "isolated" in node.flags:
            result.why = "Связи в выгрузке отсутствуют; приоритет по сетевым признакам равен нулю."
            continue
        strongest = sorted(
            result.priority_breakdown,
            key=lambda term: (-term["contribution"], list(TERM_WEIGHT).index(term["feature"])),
        )[:2]
        evidence = ", ".join(labels[term["feature"]] for term in strongest if term["contribution"] > 0)
        caveats = []
        if "depth4_censored" in node.flags:
            caveats.append("обрыв на четвёртом колене")
        if "seed_inflow_incomplete" in node.flags:
            caveats.append("неполный входящий поток seed")
        if "outflow_exceeds_observed_inflow" in node.flags:
            caveats.append("наблюдаемые исходящие выше входящих")
        result.why = (
            f"Приоритет по признакам: {evidence or 'структурная роль'}. "
            f"{result.evidence}"
            + (f" Ограничения: {', '.join(caveats)}." if caveats else "")
        )
    return results
