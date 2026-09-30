import pytest

from game.game_state import GameState, InventoryItem, Player, Position
from game.save_manager import load_game, save_game


@pytest.mark.integration
def test_save_load_round_trip_preserves_game_state(tmp_path):
    original = GameState(
        player=Player(12, 85, Position("forest_01", 142.5, 87.2)),
        inventory=[
            InventoryItem("iron_sword", 1, unique=True),
            InventoryItem("health_potion", 4),
        ],
        currency=1250,
        quests={"tutorial": "completed", "forest_guardian": "active"},
    )
    save_path = tmp_path / "player.save.json"

    save_game(original, save_path)
    restored = load_game(save_path)

    assert restored == original


@pytest.mark.integration
def test_malformed_json_is_rejected(tmp_path):
    save_path = tmp_path / "corrupted.save.json"
    save_path.write_text('{"player": ', encoding="utf-8")

    with pytest.raises(ValueError, match="corrupted"):
        load_game(save_path)


@pytest.mark.integration
def test_missing_required_player_data_is_rejected(tmp_path):
    save_path = tmp_path / "invalid.save.json"
    save_path.write_text(
        '{"save_version": 1, "player": {"level": 10}}',
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="invalid save structure"):
        load_game(save_path)
