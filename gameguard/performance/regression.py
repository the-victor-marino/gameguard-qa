"""Deterministic performance-budget and regression analysis."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class MetricResult:
    name: str
    baseline: float
    current: float
    budget: float
    regression_percent: float
    passed: bool


@dataclass(frozen=True)
class PerformanceReport:
    metrics: tuple[MetricResult, ...]

    @property
    def passed(self) -> bool:
        return all(metric.passed for metric in self.metrics)


def load_metrics(path: str | Path) -> dict[str, float]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    return {key: float(value) for key, value in payload.items()}


def compare_performance(
    baseline: dict[str, float],
    current: dict[str, float],
    budgets: dict[str, float],
) -> PerformanceReport:
    results: list[MetricResult] = []
    for name, budget in budgets.items():
        if name not in baseline or name not in current:
            raise ValueError(f"missing performance metric: {name}")
        old = float(baseline[name])
        new = float(current[name])
        if old <= 0:
            raise ValueError(f"baseline must be positive: {name}")
        regression = ((new - old) / old) * 100
        results.append(MetricResult(name, old, new, float(budget), regression, regression <= budget))
    return PerformanceReport(tuple(results))
