"""Generate recruiter- and developer-friendly GameGuard QA reports."""

import argparse
from pathlib import Path

from gameguard.performance.regression import compare_performance, load_metrics
from gameguard.quality_gate.gate import DEFAULT_BUDGETS
from gameguard.save_guard.validator import inspect_save


def build_markdown_report(save_path, baseline_path, current_path):
    save = inspect_save(save_path)
    performance = compare_performance(load_metrics(baseline_path), load_metrics(current_path), DEFAULT_BUDGETS)
    passed = save.is_safe and performance.passed
    status = "PASS" if passed else "FAIL"
    save_status = "PASS" if save.is_safe else "FAIL"
    perf_status = "PASS" if performance.passed else "FAIL"
    lines = [
        "# GameGuard QA — Build Quality Report", "",
        "## Overall Status: " + status, "",
        "| Quality signal | Result |", "| --- | --- |",
        "| Save integrity | " + save_status + " |",
        "| Performance regression | " + perf_status + " |", "",
        "## Performance", "",
        "| Metric | Baseline | Current | Change | Budget | Result |",
        "| --- | ---: | ---: | ---: | ---: | --- |",
    ]
    for metric in performance.metrics:
        result = "PASS" if metric.passed else "FAIL"
        lines.append("| {} | {:.1f} | {:.1f} | {:+.1f}% | +{:.1f}% | {} |".format(
            metric.name, metric.baseline, metric.current, metric.regression_percent, metric.budget, result
        ))
    lines.extend(["", "## Save Integrity", ""])
    if save.issues:
        lines.extend(["| Severity | Code | Path | Finding |", "| --- | --- | --- | --- |"])
        for issue in save.issues:
            lines.append("| {} | {} | `{}` | {} |".format(issue.severity.value, issue.code, issue.path, issue.message))
    else:
        lines.append("No critical or high-risk save-data defects detected.")
    lines.extend(["", "## Release Decision", ""])
    lines.append("**APPROVED** — automated quality criteria passed." if passed else "**BLOCKED** — one or more automated quality criteria failed.")
    lines.extend(["", "> Automated checks provide regression evidence; they do not replace exploratory, usability, graphical, platform-certification, or player-experience testing.", ""])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate a GameGuard QA Markdown report.")
    parser.add_argument("--save", default="test_data/saves/valid_save_v2.json")
    parser.add_argument("--baseline", default="test_data/baselines/performance_baseline.json")
    parser.add_argument("--current", default="test_data/baselines/performance_current_good.json")
    parser.add_argument("--output", default="reports/quality-report.md")
    args = parser.parse_args()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    generated = build_markdown_report(args.save, args.baseline, args.current)
    output.write_text(generated, encoding="utf-8")
    print(generated)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
