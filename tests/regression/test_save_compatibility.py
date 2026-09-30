import json
from pathlib import Path

import pytest

from game.game_state import CURRENT_SAVE_VERSION
from game.save_manager import load_game
from gameguard.save_guard.compatibility import (
    assert_progression_preserved,
    migrate_to_current,
)

LEGACY = Path("test_data/saves/legacy_save_v1.json")


@pytest.mark.regression
def test_v1_save_migrates_to_current_version():
    before = json.loads(LEGACY.read_text(encoding="utf-8"))
    after = migrate_to_current(before)

    assert after["save_version"] == CURRENT_SAVE_VERSION
    assert after["difficulty"] == "normal"
    assert after["player"]["experience"] == 0
    assert all("equipped" in item for item in after["inventory"])


@pytest.mark.regression
def test_migration_preserves_player_progression():
    before = json.loads(LEGACY.read_text(encoding="utf-8"))
    after = migrate_to_current(before)

    assert_progression_preserved(before, after)


@pytest.mark.regression
def test_legacy_save_loads_in_current_build():
    state = load_game(LEGACY)

    assert state.player.level == 27
    assert state.currency == 4820
    assert state.inventory[0].item_id == "moonblade"
    assert state.quests["royal_audience"] == "active"


@pytest.mark.regression
def test_unknown_future_save_has_no_migration_path():
    with pytest.raises(ValueError, match="no migration path"):
        migrate_to_current({"save_version": 999})
