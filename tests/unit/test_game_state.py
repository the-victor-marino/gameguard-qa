import pytest

from game.game_state import GameState, InventoryItem, Player, Position


def make_state(**overrides):
    values = {
        "player": Player(12, 85, Position("forest_01", 142.5, 87.2)),
        "inventory": [
            InventoryItem("iron_sword", 1, unique=True),
            InventoryItem("health_potion", 4),
        ],
        "currency": 1250,
        "quests": {"tutorial": "completed", "forest_guardian": "active"},
    }
    values.update(overrides)
    return GameState(**values)


@pytest.mark.unit
def test_valid_game_state_passes_validation():
    make_state().validate()


@pytest.mark.unit
@pytest.mark.parametrize("health", [-1, 101])
def test_health_outside_boundaries_is_rejected(health):
    state = make_state()
    state.player.health = health

    with pytest.raises(ValueError, match="health"):
        state.validate()


@pytest.mark.unit
@pytest.mark.parametrize("health", [0, 1, 99, 100])
def test_health_boundary_values_are_accepted(health):
    state = make_state()
    state.player.health = health
    state.validate()


@pytest.mark.unit
def test_negative_currency_is_rejected():
    with pytest.raises(ValueError, match="currency"):
        make_state(currency=-1).validate()


@pytest.mark.unit
def test_duplicate_unique_item_is_rejected():
    inventory = [
        InventoryItem("legendary_key", unique=True),
        InventoryItem("legendary_key", unique=True),
    ]

    with pytest.raises(ValueError, match="duplicate unique item"):
        make_state(inventory=inventory).validate()


@pytest.mark.unit
def test_invalid_quest_state_is_rejected():
    with pytest.raises(ValueError, match="invalid quest state"):
        make_state(quests={"forest_guardian": "almost_done"}).validate()


@pytest.mark.unit
def test_future_save_version_is_rejected():
    with pytest.raises(ValueError, match="unsupported save version"):
        make_state(save_version=999).validate()
