# Architecture

```text
                  GAME BUILD / TEST DATA
                           |
             +-------------+-------------+
             |                           |
             v                           v
       Save Guardian              Performance Analyzer
             |                           |
      integrity checks              baseline comparison
             |
      Compatibility Layer
             |
       v1 -> v2 migration
             |
      progression checks
             +-------------+-------------+
                           |
                           v
                    QUALITY GATE
                           |
                    PASS / FAIL + blockers
                           |
                           v
                    GitHub Actions
                           |
              JUnit + coverage + gate report
```

## Design principles

**Small game, serious QA.** The RPG model is intentionally minimal. Complexity is invested in testability and quality evidence.

**Diagnostics over exceptions.** Save Guardian reports stable codes, severity, location, and explanation.

**Backward compatibility is data integrity.** A successful deserialization is not sufficient; migration must preserve player-owned progression.

**Performance is a regression problem.** Deterministic metric fixtures make the portfolio suite reliable while demonstrating budget-based performance gating.

**One release decision.** The quality gate aggregates independent signals and returns a CI-compatible exit code.
