"""Backward-compatible save migration with preservation checks."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any

from game.game_state import CURRENT_SAVE_VERSION


@dataclass(frozen=True)
class MigrationResult:
    payload: dict[str, Any]
    from_version: int
    to_version: int


def migrate_v1_to_v2(payload: dict[str, Any]) -> dict[str, Any]:
    migrated = deepcopy(payload)
    migrated["save_version"] = 2
    migrated.setdefault("difficulty", "normal")
    migrated.setdefault("player", {}).setdefault("experience", 0)
    for item in migrated.get("inventory", []):
        if isinstance(item, dict):
            item.setdefault("equipped", False)
    return migrated


def migrate_to_current(payload: dict[str, Any]) -> dict[str, Any]:
    migrated = deepcopy(payload)
    version = migrated.get("save_version")
    if version == CURRENT_SAVE_VERSION:
        return migrated
    if version == 1 and CURRENT_SAVE_VERSION == 2:
        return migrate_v1_to_v2(migrated)
    raise ValueError(f"no migration path from save version {version} to {CURRENT_SAVE_VERSION}")


def assert_progression_preserved(before: dict[str, Any], after: dict[str, Any]) -> None:
    """Raise when migration changes player-owned progression data."""
    protected = ("currency", "quests")
    for field in protected:
        if before.get(field) != after.get(field):
            raise ValueError(f"migration changed protected field: {field}")

    before_player = before.get("player", {})
    after_player = after.get("player", {})
    for field in ("level", "health", "position"):
        if before_player.get(field) != after_player.get(field):
            raise ValueError(f"migration changed protected player field: {field}")

    before_items = [(x.get("item_id"), x.get("quantity")) for x in before.get("inventory", [])]
    after_items = [(x.get("item_id"), x.get("quantity")) for x in after.get("inventory", [])]
    if before_items != after_items:
        raise ValueError("migration changed inventory ownership")
