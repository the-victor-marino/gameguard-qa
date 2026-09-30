# GameGuard QA

**Automated quality gates for game builds.**

GameGuard QA is a portfolio project focused on Game QA Engineering. It models a lightweight single-player RPG and uses automated tests to detect game-state defects, save-data corruption, compatibility regressions, and—later in the roadmap—performance regressions before release.

## Why this project exists

Game defects are often state-dependent: a build can launch correctly while still corrupting progression, inventory, quest state, or player data. GameGuard QA treats those risks as testable release criteria.

## Milestone 1 — Core Game State

The first milestone implements:

- A deterministic RPG game-state model
- Player, inventory, position, and quest data
- JSON save/load
- Explicit state validation
- Unit and integration tests
- CI with pytest and coverage

## QA techniques demonstrated

- Equivalence partitioning
- Boundary value analysis
- State validation
- Negative testing
- Data integrity testing
- Integration testing
- Regression-oriented test design

## Roadmap

1. **Core Game State** — state model, validation, save/load, tests
2. **Save Guardian** — corrupted saves, schema validation, destructive tests
3. **Compatibility** — save migration and backward-compatibility regression
4. **Performance** — baselines, budgets, regression detection
5. **Quality Gate** — consolidated PASS/FAIL release decision
6. **CI/CD** — reports and build artifacts

## Run locally

```bash
python -m pip install -r requirements.txt
pytest
```

## Tech stack

Python 3.11+ · pytest · pytest-cov · GitHub Actions

---
This project is intentionally small in game scope: the product being demonstrated is the **QA strategy and automation framework**, not the game itself.
