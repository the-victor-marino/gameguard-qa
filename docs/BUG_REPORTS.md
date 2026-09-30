# Example Defect Reports

These reports document defects the automated suite is designed to detect. They demonstrate how GameGuard converts technical evidence into actionable QA communication.

## GG-001 — Legacy save migration loses owned equipment

**Severity:** Critical  
**Area:** Save compatibility / player progression  
**Risk:** A returning player can permanently lose an owned unique weapon after updating the game.

### Preconditions
- Player has a valid v1 save.
- Inventory contains the unique item `moonblade`.
- Build uses save schema v2.

### Steps
1. Load `test_data/saves/legacy_save_v1.json`.
2. Run the v1 → v2 migration.
3. Compare player-owned inventory before and after migration.

### Expected
All item IDs and quantities are preserved. New v2 fields may receive documented defaults.

### Defective behavior simulated by the regression test
If the migration removes or changes an owned item, `assert_progression_preserved` blocks the build.

### Automated coverage
`tests/regression/test_save_compatibility.py::test_migration_preserves_player_progression`

---

## GG-002 — Build exceeds performance regression budget

**Severity:** High  
**Area:** Performance  
**Risk:** A build can remain functionally correct while degrading load time, frame-time stability, or memory usage.

### Expected budgets
- Load time regression ≤ 10%
- p95 frame-time regression ≤ 10%
- Memory regression ≤ 15%

### Defective fixture
`performance_current_regressed.json` intentionally exceeds all three budgets.

### Automated coverage
`tests/performance/test_performance_regression.py::test_regressed_build_is_detected`

---

## GG-003 — Corrupted progression data accepted by save pipeline

**Severity:** High  
**Area:** Save integrity  
**Risk:** Invalid health, currency, quest state, or duplicated unique inventory can enter the game.

### Automated evidence
Save Guardian emits stable defect codes and JSON paths, allowing CI and developers to identify the exact invalid state rather than receiving a generic load failure.
