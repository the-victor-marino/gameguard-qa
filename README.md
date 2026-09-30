# GameGuard QA

[![GameGuard QA](https://github.com/the-victor-marino/gameguard-qa/actions/workflows/gameguard-ci.yml/badge.svg)](https://github.com/the-victor-marino/gameguard-qa/actions/workflows/gameguard-ci.yml)
![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12-blue)
![pytest](https://img.shields.io/badge/test-pytest-blue)
![Game QA](https://img.shields.io/badge/focus-Game%20QA-blueviolet)

**Catch progression-breaking defects before players do.**

GameGuard QA is a compact **Game QA Engineering** project that protects persistent player state and detects build regressions before release.

> A build can launch successfully and still lose a player's inventory, corrupt progression, or become noticeably slower. GameGuard turns those risks into automated release criteria.

## At a glance

- **30 automated tests** across unit, integration, destructive, regression, and performance layers
- **Save Guardian** with stable defect IDs, severity, and exact JSON paths
- **v1 → v2 backward-compatibility testing** with progression-preservation checks
- **Performance budgets** for load time, p95 frame time, and memory
- **Automated quality gate** returning PASS/FAIL for CI
- **GitHub Actions** on Python 3.11 and 3.12
- **Automated QA evidence**: JUnit, coverage XML, CLI gate output, and Markdown build report

## What can go wrong?

| Risk | Example | GameGuard response |
| --- | --- | --- |
| Save corruption | Health = -500 | Block release |
| Economy integrity | Currency = -999 | Block release |
| Inventory exploit | Duplicate unique item | Block release |
| Progression corruption | Illegal quest state | Block release |
| Update regression | v1 → v2 loses inventory | Block release |
| Performance regression | Load time +30% | Block release |

## Quality pipeline

```text
                  GAME BUILD / TEST DATA
                           |
             +-------------+-------------+
             |                           |
             v                           v
       SAVE GUARDIAN              PERFORMANCE ANALYZER
             |                           |
       state integrity              baseline comparison
             |
       SAVE MIGRATION
             |
      v1 -> v2 compatibility
             |
    progression preservation
             +-------------+-------------+
                           |
                           v
                    QUALITY GATE
                    /           \
                 PASS           FAIL
                   |              |
                   +------ CI ----+
                          |
              reports + coverage + evidence
```

## Example: defective save

```text
GAMEGUARD QA — SAVE GUARDIAN
Status: FAIL

[HIGH] SAVE-005 $.player.health
  Player health is outside 0-100

[HIGH] SAVE-008 $.currency
  Currency must be a non-negative integer

[HIGH] SAVE-011 $.inventory[1]
  Duplicate unique item: legendary_key
```

The diagnostic answers four questions a developer needs: **what failed, where, how severe it is, and which stable defect code identifies it.**

## Backward compatibility

Version 2 adds experience, difficulty, and equipment state. A legacy v1 save is migrated before loading.

```text
v1 save
   |
   v
migration
   |
   +-- add v2 defaults
   |
   +-- preserve level / health / position
   +-- preserve currency / quests
   +-- preserve inventory ownership
   |
   v
v2 GameState
```

A save merely loading is not enough: regression tests verify that player-owned progression survives the update.

## Performance regression

Performance fixtures model build telemetry and compare the current build against a known baseline.

| Metric | Regression budget |
| --- | ---: |
| Load time | ≤ 10% |
| p95 frame time | ≤ 10% |
| Memory | ≤ 15% |

The intentionally regressed fixture exceeds every budget, proving the detector can fail when it should.

## Test architecture

```text
tests/
├── unit/          domain rules, boundaries, reporting
├── integration/   save/load and release quality gate
├── destructive/   corrupted and malformed saves
├── regression/    migration and progression preservation
└── performance/   deterministic performance budgets
```

Techniques demonstrated include **risk-based testing, Boundary Value Analysis, Equivalence Partitioning, state/invariant validation, negative testing, destructive testing, data-integrity testing, backward-compatibility testing, regression testing, and performance-budget testing.**

## Build Quality Report

CI generates a human-readable report for every run:

```text
GameGuard QA — Build Quality Report

Overall Status: PASS

Save integrity          PASS
Performance regression PASS

load_time_ms            +3.9%   PASS
frame_time_p95_ms       +1.8%   PASS
memory_mb               +2.1%   PASS

Release Decision: APPROVED
```

The report is uploaded with the workflow's JUnit and coverage evidence.

## Run it

```bash
git clone https://github.com/the-victor-marino/gameguard-qa.git
cd gameguard-qa
python -m pip install -r requirements.txt
pytest
```

Try the intentionally corrupted save:

```bash
python -m gameguard.save_guard.cli test_data/saves/corrupted_save.json
```

Run the release gate:

```bash
python -m gameguard.quality_gate.gate
```

Generate the readable report:

```bash
python -m gameguard.reporting.report
```

## QA documentation

- [Test Strategy](docs/TEST_STRATEGY.md)
- [Save Guardian Design](docs/SAVE_GUARDIAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Example Defect Reports](docs/BUG_REPORTS.md)

## Scope

The demo RPG is intentionally minimal: **the QA system is the project**.

GameGuard does not replace exploratory, usability, graphical, platform-certification, accessibility, or player-experience testing. It demonstrates how targeted automation can protect high-risk game state and provide fast regression evidence alongside human Game QA.

**Stack:** Python 3.11+ · pytest · pytest-cov · GitHub Actions · JSON
