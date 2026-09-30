# Save Guardian

Save Guardian is the first GameGuard QA quality-analysis module. It inspects persistent player data without attempting to repair or silently normalize defects.

## Why save integrity matters

A game can pass launch and smoke testing while still shipping progression-breaking defects. Persistent-state failures can remove inventory, invalidate quests, corrupt player position, damage an economy, or make a save unloadable.

The module therefore treats the save file as a QA boundary.

## Current checks

| Code | Condition | Severity |
| --- | --- | --- |
| SAVE-001 | Root is not an object | Critical |
| SAVE-002 | Missing save version | Critical |
| SAVE-003 | Unsupported version | High |
| SAVE-004 | Missing/invalid player | Critical |
| SAVE-005 | Health outside 0–100 | High |
| SAVE-006 | Level outside 1–100 | High |
| SAVE-007 | Invalid player map | High |
| SAVE-008 | Invalid/negative currency | High |
| SAVE-009 | Inventory is not a list | High |
| SAVE-010 | Invalid inventory entry | High |
| SAVE-011 | Duplicate unique item | High |
| SAVE-012 | Quests is not an object | High |
| SAVE-013 | Illegal quest state | High |
| SAVE-014 | Missing file | Critical |
| SAVE-015 | Invalid text encoding | Critical |
| SAVE-016 | Empty file | Critical |
| SAVE-017 | Malformed JSON | Critical |
| SAVE-099 | Domain validation fallback | High |

## Example

```bash
python -m gameguard.save_guard.cli test_data/saves/corrupted_save.json
```

Expected result:

```text
GAMEGUARD QA — SAVE GUARDIAN
Status: FAIL

[HIGH] SAVE-005 $.player.health
  Player health is outside 0-100

[HIGH] SAVE-011 $.inventory[1]
  Duplicate unique item: legendary_key
```

The CLI returns exit code 0 for a safe save and 1 for an unsafe save, allowing the same analysis to be used later in CI and the GameGuard release quality gate.

## QA design

The module separates **inspection** from **deserialization**. This is deliberate: a loader answers whether data can be consumed; a QA diagnostic tool should also identify what failed, where it failed, and how severely it threatens player progression.
