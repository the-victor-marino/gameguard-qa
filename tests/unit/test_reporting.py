import pytest

from gameguard.reporting.report import build_markdown_report


@pytest.mark.unit
def test_report_exposes_release_evidence():
    report = build_markdown_report(
        "test_data/saves/valid_save_v2.json",
        "test_data/baselines/performance_baseline.json",
        "test_data/baselines/performance_current_good.json",
    )
    assert "Overall Status: PASS" in report
    assert "Save integrity | PASS" in report
    assert "Performance regression | PASS" in report
    assert "APPROVED" in report


@pytest.mark.unit
def test_report_makes_regressions_visible():
    report = build_markdown_report(
        "test_data/saves/corrupted_save.json",
        "test_data/baselines/performance_baseline.json",
        "test_data/baselines/performance_current_regressed.json",
    )
    assert "Overall Status: FAIL" in report
    assert "SAVE-005" in report
    assert "BLOCKED" in report
