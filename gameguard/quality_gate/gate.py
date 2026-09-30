"""Consolidated GameGuard QA release decision."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from gameguard.performance.regression import compare_performance, load_metrics
from gameguard.save_guard.validator import inspect_save

DEFAULT_BUDGETS = {
    "load_time_ms": 10.0,
    "frame_time_p95_ms": 10.0,
    "memory_mb": 15.0,
}


@dataclass(frozen=True)
class GateResult:
    save_safe: bool
    performance_passed: bool
    blockers: tuple[str, ...]

    @property
    def passed(self) -> bool:
        return self.save_safe and self.performance_passed and not self.blockers


def evaluate_quality_gate(
    save_path: str | Path,
    baseline_path: str | Path,
    current_path: str | Path,
) -> GateResult:
    save_report = inspect_save(save_path)
    performance = compare_performance(
        load_metrics(baseline_path),
        load_metrics(current_path),
        DEFAULT_BUDGETS,
    )
    blockers: list[str] = []
    blockers.extend(f"{i.code}: {i.message}" for i in save_report.issues if i.severity.value in {"CRITICAL", "HIGH"})
    blockers.extend(
        f"PERF-{m.name}: regression {m.regression_percent:.1f}% exceeds {m.budget:.1f}% budget"
        for m in performance.metrics
        if not m.passed
    )
    return GateResult(save_report.is_safe, performance.passed, tuple(blockers))


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the GameGuard release quality gate.")
    parser.add_argument("--save", default="test_data/saves/valid_save_v2.json")
    parser.add_argument("--baseline", default="test_data/baselines/performance_baseline.json")
    parser.add_argument("--current", default="test_data/baselines/performance_current_good.json")
    args = parser.parse_args()

    result = evaluate_quality_gate(args.save, args.baseline, args.current)
    print("=" * 60)
    print("GAMEGUARD QA — BUILD QUALITY REPORT")
    print("=" * 60)
    print(f"Save integrity: {'PASS' if result.save_safe else 'FAIL'}")
    print(f"Performance:    {'PASS' if result.performance_passed else 'FAIL'}")
    print("-" * 60)
    print(f"QUALITY GATE:   {'PASS' if result.passed else 'FAIL'}")
    if result.blockers:
        print("\nRelease blockers:")
        for blocker in result.blockers:
            print(f"- {blocker}")
    return 0 if result.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
