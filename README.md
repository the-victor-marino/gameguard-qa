# GameGuard QA

**Automated quality gates for game builds.**

GameGuard QA is a compact Game QA Engineering portfolio project that models a single-player RPG persistence pipeline and automatically detects **save corruption, progression regressions, backward-compatibility failures, and performance regressions before release**.

The game is deliberately small. The product demonstrated here is the **QA strategy, automation, diagnostics, and release evidence**.

## The problem

A game build can launch and pass smoke testing while still damaging the player experience:

- an update loads an old save but silently removes inventory;
- corrupted progression enters the game;
- a quest is persisted in an impossible state;
- a unique item is duplicated;
- load time or frame-time degrades between builds.

GameGuard turns those risks into automated release criteria.

## Quality pipeline

```text
Game Build / Test Data
        |
        +--> Save Guardian --------> corruption / state integrity
        |
        +--> Save Migration -------> v1 -> v2 compatibility
        |                              + progression preservation
        |
        +--> Performance ----------> baseline vs current build
        |
        +--------------------------> QUALITY GATE
                                        |
                                  PASS / FAIL
                                        |
                                  GitHub Actions
```

## Implemented milestones

### 1. Core game state
A deterministic RPG domain model covering player level/health, position, inventory, currency, quests, difficulty, and experience. Domain invariants are validated before persistence.

### 2. Save Guardian
Non-destructive save inspection with stable defect codes, severity, JSON paths, and actionable messages. Destructive tests cover malformed, empty, missing, and logically corrupted saves.

### 3. Backward compatibility
A versioned **v1 → v2** migration introduces new fields while regression tests verify that player level, health, position, currency, quests, and owned inventory survive the update.

### 4. Performance regression
Build metrics are compared with a known baseline using explicit budgets for load time, p95 frame time, and memory usage. A deliberately regressed fixture proves the detector fails when it should.

### 5. Release quality gate
Independent QA signals are consolidated into one CI-compatible decision with release blockers and exit code 0/1.

### 6. CI/CD evidence
GitHub Actions runs the complete suite on Python 3.11 and 3.12, generates JUnit and coverage XML, executes the release quality gate, and uploads the evidence as workflow artifacts.

## Test taxonomy

```text
tests/
├── unit/          # domain rules and boundary values
├── integration/   # persistence and quality-gate behavior
├── destructive/   # intentionally damaged save data
├── regression/    # save compatibility and progression preservation
└── performance/   # deterministic performance budgets
```

## QA techniques demonstrated

- Risk-based testing
- Boundary Value Analysis
- Equivalence Partitioning
- State and invariant validation
- Negative and destructive testing
- Data-integrity testing
- Integration testing
- Backward-compatibility testing
- Regression testing
- Performance-budget testing
- CI quality gates

## Try it

```bash
git clone https://github.com/the-victor-marino/gameguard-qa.git
cd gameguard-qa
python -m pip install -r requirements.txt
pytest
```

Inspect a corrupted save:

```bash
python -m gameguard.save_guard.cli test_data/saves/corrupted_save.json
```

Run the release quality gate:

```bash
python -m gameguard.quality_gate.gate
```

A safe release candidate returns **PASS** and exit code 0. Critical/high save defects or performance-budget violations return **FAIL** and a non-zero exit code.

## Portfolio evidence

- [Test strategy](docs/TEST_STRATEGY.md)
- [Save Guardian design](docs/SAVE_GUARDIAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Example defect reports](docs/BUG_REPORTS.md)

## Tech stack

**Python 3.11+ · pytest · pytest-cov · GitHub Actions · JSON**

## Scope

GameGuard does not claim to replace engine-level, platform-certification, graphical, usability, or exploratory testing. It demonstrates how targeted automation can protect high-risk game state and provide fast regression evidence alongside human Game QA.
