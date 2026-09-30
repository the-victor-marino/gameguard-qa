"""Non-destructive save-file inspection for GameGuard QA."""

from __future__ import annotations

import json
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from game.game_state import CURRENT_SAVE_VERSION, GameState


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass(frozen=True)
class SaveIssue:
    code: str
    severity: Severity
    message: str
    path: str


@dataclass(frozen=True)
class SaveValidationReport:
    source: str
    issues: tuple[SaveIssue, ...]

    @property
    def is_safe(self) -> bool:
        return not any(
            issue.severity in {Severity.CRITICAL, Severity.HIGH}
            for issue in self.issues
        )

    @property
    def critical_count(self) -> int:
        return sum(issue.severity == Severity.CRITICAL for issue in self.issues)


def _issue(code: str, severity: Severity, message: str, path: str) -> SaveIssue:
    return SaveIssue(code, severity, message, path)


def inspect_payload(payload: Any, source: str = "<memory>") -> SaveValidationReport:
    issues: list[SaveIssue] = []

    if not isinstance(payload, dict):
        return SaveValidationReport(
            source,
            (_issue("SAVE-001", Severity.CRITICAL, "Save root must be an object", "$"),),
        )

    version = payload.get("save_version")
    if version is None:
        issues.append(_issue("SAVE-002", Severity.CRITICAL, "Missing save version", "$.save_version"))
    elif version != CURRENT_SAVE_VERSION:
        issues.append(
            _issue(
                "SAVE-003",
                Severity.HIGH,
                f"Unsupported save version: {version}",
                "$.save_version",
            )
        )

    player = payload.get("player")
    if not isinstance(player, dict):
        issues.append(_issue("SAVE-004", Severity.CRITICAL, "Missing or invalid player object", "$.player"))
    else:
        health = player.get("health")
        if not isinstance(health, int) or isinstance(health, bool) or not 0 <= health <= 100:
            issues.append(_issue("SAVE-005", Severity.HIGH, "Player health is outside 0-100", "$.player.health"))

        level = player.get("level")
        if not isinstance(level, int) or isinstance(level, bool) or not 1 <= level <= 100:
            issues.append(_issue("SAVE-006", Severity.HIGH, "Player level is outside 1-100", "$.player.level"))

        position = player.get("position")
        if not isinstance(position, dict) or not position.get("map_id"):
            issues.append(_issue("SAVE-007", Severity.HIGH, "Player position is missing a valid map", "$.player.position"))

    currency = payload.get("currency", 0)
    if not isinstance(currency, int) or isinstance(currency, bool) or currency < 0:
        issues.append(_issue("SAVE-008", Severity.HIGH, "Currency must be a non-negative integer", "$.currency"))

    inventory = payload.get("inventory", [])
    if not isinstance(inventory, list):
        issues.append(_issue("SAVE-009", Severity.HIGH, "Inventory must be a list", "$.inventory"))
    else:
        unique_ids: set[str] = set()
        for index, item in enumerate(inventory):
            path = f"$.inventory[{index}]"
            if not isinstance(item, dict):
                issues.append(_issue("SAVE-010", Severity.HIGH, "Inventory entry must be an object", path))
                continue
            if item.get("unique") is True:
                item_id = item.get("item_id")
                if item_id in unique_ids:
                    issues.append(
                        _issue(
                            "SAVE-011",
                            Severity.HIGH,
                            f"Duplicate unique item: {item_id}",
                            path,
                        )
                    )
                unique_ids.add(item_id)

    quests = payload.get("quests", {})
    valid_states = {"locked", "active", "completed", "failed"}
    if not isinstance(quests, dict):
        issues.append(_issue("SAVE-012", Severity.HIGH, "Quests must be an object", "$.quests"))
    else:
        for quest_id, state in quests.items():
            if state not in valid_states:
                issues.append(
                    _issue(
                        "SAVE-013",
                        Severity.HIGH,
                        f"Invalid quest state '{state}' for '{quest_id}'",
                        f"$.quests.{quest_id}",
                    )
                )

    if not issues:
        try:
            GameState.from_dict(payload)
        except (ValueError, TypeError) as exc:
            issues.append(_issue("SAVE-099", Severity.HIGH, str(exc), "$"))

    return SaveValidationReport(source, tuple(issues))


def inspect_save(path: str | Path) -> SaveValidationReport:
    source = Path(path)

    try:
        text = source.read_text(encoding="utf-8")
    except FileNotFoundError:
        return SaveValidationReport(
            str(source),
            (_issue("SAVE-014", Severity.CRITICAL, "Save file does not exist", "$"),),
        )
    except UnicodeDecodeError:
        return SaveValidationReport(
            str(source),
            (_issue("SAVE-015", Severity.CRITICAL, "Save file is not valid UTF-8", "$"),),
        )

    if not text.strip():
        return SaveValidationReport(
            str(source),
            (_issue("SAVE-016", Severity.CRITICAL, "Save file is empty", "$"),),
        )

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return SaveValidationReport(
            str(source),
            (_issue("SAVE-017", Severity.CRITICAL, "Save file contains malformed JSON", "$"),),
        )

    return inspect_payload(payload, str(source))
