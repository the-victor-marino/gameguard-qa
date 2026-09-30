"""JSON persistence boundary for game-state save files."""

import json
from pathlib import Path

from game.game_state import GameState
from gameguard.save_guard.compatibility import migrate_to_current


def save_game(state: GameState, path: str | Path) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(state.to_dict(), indent=2, sort_keys=True), encoding="utf-8")


def load_game(path: str | Path, *, migrate: bool = True) -> GameState:
    source = Path(path)
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError("save file is corrupted or is not valid JSON") from exc

    if not isinstance(payload, dict):
        raise ValueError("save root must be a JSON object")
    if migrate:
        payload = migrate_to_current(payload)
    return GameState.from_dict(payload)
