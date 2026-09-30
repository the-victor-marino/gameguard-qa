from pathlib import Path

import pytest

from gameguard.quality_gate.gate import evaluate_quality_gate

SAVES = Path("test_data/saves")
PERF = Path("test_data/baselines")


@pytest.mark.integration
def test_release_candidate_passes_when_all_evidence_is_green():
    result = evaluate_quality_gate(
        SAVES / "valid_save_v2.json",
        PERF / "performance_baseline.json",
        PERF / "performance_current_good.json",
    )
    assert result.passed
    assert result.blockers == ()


@pytest.mark.integration
def test_release_is_blocked_by_save_and_performance_defects():
    result = evaluate_quality_gate(
        SAVES / "corrupted_save.json",
        PERF / "performance_baseline.json",
        PERF / "performance_current_regressed.json",
    )
    assert not result.passed
    assert result.blockers
    assert any("SAVE-" in blocker for blocker in result.blockers)
    assert any("PERF-" in blocker for blocker in result.blockers)
