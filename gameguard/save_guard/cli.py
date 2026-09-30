"""Command-line interface for Save Guardian."""

from __future__ import annotations

import argparse

from gameguard.save_guard.validator import inspect_save


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect a game save for integrity defects.")
    parser.add_argument("save_file", help="Path to the JSON save file")
    args = parser.parse_args()

    report = inspect_save(args.save_file)

    print("=" * 60)
    print("GAMEGUARD QA — SAVE GUARDIAN")
    print("=" * 60)
    print(f"Source: {report.source}")
    print(f"Status: {'PASS' if report.is_safe else 'FAIL'}")
    print(f"Issues: {len(report.issues)}")

    for issue in report.issues:
        print(f"[{issue.severity.value}] {issue.code} {issue.path}")
        print(f"  {issue.message}")

    return 0 if report.is_safe else 1


if __name__ == "__main__":
    raise SystemExit(main())
