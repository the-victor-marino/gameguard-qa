# GameGuard QA — Test Strategy

## Objective

GameGuard QA demonstrates a risk-based testing approach for persistent game state. The first milestone focuses on defects that can damage player progression even when the game itself still launches successfully.

## Quality risks

| Risk | Player impact | Initial coverage |
| --- | --- | --- |
| Save data cannot be loaded | Progress loss / blocker | Integration |
| Invalid health or level values | Broken gameplay state | Unit / boundary |
| Negative currency | Economy integrity defect | Unit / negative |
| Duplicate unique items | Inventory exploit / corruption | Unit / negative |
| Invalid quest states | Progression blocker | Unit / state validation |
| Unsupported save version | Compatibility risk | Unit |
| Malformed save file | Progress loss / crash risk | Integration |

## Test design techniques

**Boundary Value Analysis.** Health is constrained to 0–100 and player level to 1–100. Values around boundaries are targeted because off-by-one defects frequently occur at limits.

**Equivalence Partitioning.** Save versions are treated as supported and unsupported partitions. Later milestones will distinguish legacy, current, migratable, and unsupported versions.

**State and Invariant Validation.** Persistent data must obey invariants regardless of how the state was produced: non-negative currency, legal quest states, and uniqueness constraints for unique items.

**Negative Testing.** The suite deliberately supplies invalid values and malformed persistence data. A useful QA suite must demonstrate that it detects defects, not merely that valid scenarios pass.

**Integration Testing.** Round-trip tests exercise serialization and deserialization together to detect data loss or transformation across the persistence boundary.

## Release philosophy

Passing tests are evidence, not proof of defect-free software. GameGuard will evolve toward a quality gate combining functional, compatibility, destructive, and performance evidence into explicit release criteria.

## Out of scope for Milestone 1

Rendering and graphical correctness, multiplayer/network synchronization, platform certification, engine integration, performance regression detection, and save migration are intentionally deferred.
