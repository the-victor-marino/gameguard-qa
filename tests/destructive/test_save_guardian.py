from pathlib import Path

import pytest

from gameguard.save_guard.validator import Severity, inspect_save

FIXTURES = Path("test_data/saves")


@pytest.mark.destructive
def test_known_good_save_is_safe():
    report = inspect_save(FIXTURES / "valid_save_v2.json")

    assert report.is_safe
    assert report.issues == ()


@pytest.mark.destructive
def test_corrupted_progression_save_is_rejected():
    report = inspect_save(FIXTURES / "corrupted_save.json")
    codes = {issue.code for issue in report.issues}

    assert not report.is_safe
    assert {"SAVE-005", "SAVE-006", "SAVE-007", "SAVE-008", "SAVE-011", "SAVE-013"} <= codes


@pytest.mark.destructive
def test_truncated_json_is_reported_without_crashing(tmp_path):
    path = tmp_path / "truncated.save.json"
    path.write_text('{"save_version": 1, "player": {"level":', encoding="utf-8")

    report = inspect_save(path)

    assert not report.is_safe
    assert report.critical_count == 1
    assert report.issues[0].code == "SAVE-017"
    assert report.issues[0].severity == Severity.CRITICAL


@pytest.mark.destructive
def test_empty_save_is_critical(tmp_path):
    path = tmp_path / "empty.save.json"
    path.write_text("", encoding="utf-8")

    report = inspect_save(path)

    assert report.issues[0].code == "SAVE-016"
    assert report.issues[0].severity == Severity.CRITICAL


@pytest.mark.destructive
def test_missing_save_file_is_critical(tmp_path):
    report = inspect_save(tmp_path / "missing.save.json")

    assert report.issues[0].code == "SAVE-014"
    assert report.issues[0].severity == Severity.CRITICAL
