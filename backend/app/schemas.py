from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.constants import FIXED_COLUMN_IDS


class CardData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    details: str


class ColumnData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    cardIds: list[str]


class ProjectData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    description: str = Field(max_length=2000)


class BoardData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project: ProjectData
    columns: list[ColumnData]
    cards: dict[str, CardData]

    @model_validator(mode="after")
    def validate_board(self):
        if tuple(column.id for column in self.columns) != FIXED_COLUMN_IDS:
            raise ValueError("The board must contain its five fixed columns in order")

        referenced_ids = [card_id for column in self.columns for card_id in column.cardIds]
        if len(referenced_ids) != len(set(referenced_ids)):
            raise ValueError("A card can belong to only one column")
        if set(referenced_ids) != set(self.cards):
            raise ValueError("Every card must appear in exactly one column")
        if any(card_id != card.id for card_id, card in self.cards.items()):
            raise ValueError("Each cards map key must match its card id")
        return self


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class StructuredChatReply(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=4000)
    board_update: BoardData | None


class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=4000)
    board: BoardData | None = None
