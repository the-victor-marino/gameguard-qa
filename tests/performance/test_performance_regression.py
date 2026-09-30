from pathlib import Path

import pytest

from gameguard.performance.regression import compare_performance, load_metrics

DATA = Path("test_data/baselines")
BUDGETS = {
    "load_time_ms": 10.0,
    "frame_time_p95_ms": 10.0,
    "memory_mb": 15.0,
}


@pytest.mark.performance
def test_build_inside_performance_budget_passes():
    baseline = load_metrics(DATA / "performance_baseline.json")
    current = load_metrics(DATA / "performance_current_good.json")

    report = compare_performance(baseline, current, BUDGETS)

    assert report.passed


@pytest.mark.performance
def test_regressed_build_is_detected():
    baseline = load_metrics(DATA / "performance_baseline.json")
    current = load_metrics(DATA / "performance_current_regressed.json")

    report = compare_performance(baseline, current, BUDGETS)
    failures = {metric.name for metric in report.metrics if not metric.passed}

    assert not report.passed
    assert failures == {"load_time_ms", "frame_time_p95_ms", "memory_mb"}


@pytest.mark.performance
def test_missing_metric_is_rejected():
    with pytest.raises(ValueError, match="missing performance metric"):
        compare_performance({"load_time_ms": 1}, {}, {"load_time_ms": 10})
