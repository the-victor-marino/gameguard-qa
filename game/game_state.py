"""Core game-state model for the GameGuard QA demo game."""

from dataclasses import asdict, dataclass, field
from typing import Any

VALID_QUEST_STATES = {"locked", "active", "completed", "failed"}
MAX_HEALTH = 100
MAX_LEVEL = 100
CURRENT_SAVE_VERSION = 2


@dataclass
class Position:
    map_id: str
    x: float
    y: float

    def validate(self) -> None:
        if not isinstance(self.map_id, str) or not self.map_id.strip():
            raise ValueError("map_id must be a non-empty string")
        for name, value in (("x", self.x), ("y", self.y)):
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise TypeError(f"{name} must be numeric")


@dataclass
class InventoryItem:
    item_id: str
    quantity: int = 1
    unique: bool = False
    equipped: bool = False

    def validate(self) -> None:
        if not isinstance(self.item_id, str) or not self.item_id.strip():
            raise ValueError("item_id must be a non-empty string")
        if isinstance(self.quantity, bool) or not isinstance(self.quantity, int):
            raise TypeError("quantity must be an integer")
        if self.quantity < 1:
            raise ValueError("quantity must be at least 1")
        if self.unique and self.quantity != 1:
            raise ValueError("unique items must have quantity 1")


@dataclass
class Player:
    level: int
    health: int
    position: Position
    experience: int = 0

    def validate(self) -> None:
        if isinstance(self.level, bool) or not isinstance(self.level, int):
            raise TypeError("level must be an integer")
        if not 1 <= self.level <= MAX_LEVEL:
            raise ValueError(f"level must be between 1 and {MAX_LEVEL}")
        if isinstance(self.health, bool) or not isinstance(self.health, int):
            raise TypeError("health must be an integer")
        if not 0 <= self.health <= MAX_HEALTH:
            raise ValueError(f"health must be between 0 and {MAX_HEALTH}")
        if isinstance(self.experience, bool) or not isinstance(self.experience, int) or self.experience < 0:
            raise ValueError("experience must be a non-negative integer")
        self.position.validate()


@dataclass
class GameState:
    player: Player
    inventory: list[InventoryItem] = field(default_factory=list)
    currency: int = 0
    quests: dict[str, str] = field(default_factory=dict)
    difficulty: str = "normal"
    save_version: int = CURRENT_SAVE_VERSION

    def validate(self) -> None:
        if self.save_version != CURRENT_SAVE_VERSION:
            raise ValueError(f"unsupported save version: {self.save_version}")
        self.player.validate()
        if self.difficulty not in {"easy", "normal", "hard"}:
            raise ValueError(f"invalid difficulty: {self.difficulty}")
        if isinstance(self.currency, bool) or not isinstance(self.currency, int):
            raise TypeError("currency must be an integer")
        if self.currency < 0:
            raise ValueError("currency cannot be negative")

        seen_unique_items: set[str] = set()
        for item in self.inventory:
            item.validate()
            if item.unique:
                if item.item_id in seen_unique_items:
                    raise ValueError(f"duplicate unique item: {item.item_id}")
                seen_unique_items.add(item.item_id)

        for quest_id, state in self.quests.items():
            if not isinstance(quest_id, str) or not quest_id.strip():
                raise ValueError("quest id must be a non-empty string")
            if state not in VALID_QUEST_STATES:
                raise ValueError(f"invalid quest state for {quest_id}: {state}")

    def to_dict(self) -> dict[str, Any]:
        self.validate()
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "GameState":
        try:
            player_data = data["player"]
            position_data = player_data["position"]
            state = cls(
                save_version=data["save_version"],
                player=Player(
                    level=player_data["level"],
                    health=player_data["health"],
                    position=Position(**position_data),
                    experience=player_data.get("experience", 0),
                ),
                inventory=[InventoryItem(**item) for item in data.get("inventory", [])],
                currency=data.get("currency", 0),
                quests=data.get("quests", {}),
                difficulty=data.get("difficulty", "normal"),
            )
        except (KeyError, TypeError) as exc:
            raise ValueError(f"invalid save structure: {exc}") from exc
        state.validate()
        return state
