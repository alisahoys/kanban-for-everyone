import json

import pytest

from app.chat import InvalidReplyError, parse_reply
from app.database import INITIAL_CARDS, INITIAL_COLUMNS
from app.schemas import BoardData


def make_board() -> BoardData:
    cards = {
        card_id: {**card, "priority": None, "dueDate": None}
        for card_id, card in INITIAL_CARDS.items()
    }
    cards["card-1"].update(priority="high", dueDate="2027-03-12")
    return BoardData.model_validate(
        {
            "project": {"name": "Saved project", "description": "Saved description"},
            "columns": INITIAL_COLUMNS,
            "cards": cards,
        }
    )


def test_parse_reply_without_board_update() -> None:
    reply = parse_reply(
        json.dumps({"message": "Nothing to change.", "board_update": None}), make_board()
    )

    assert reply.message == "Nothing to change."
    assert reply.board_update is None


def test_parse_reply_restores_omitted_project_and_card_fields() -> None:
    board = make_board()
    update = board.model_dump(mode="json")
    del update["project"]
    for card in update["cards"].values():
        del card["priority"]
        del card["dueDate"]
    update["cards"]["card-new"] = {"id": "card-new", "title": "New", "details": ""}
    update["columns"][0]["cardIds"].append("card-new")

    reply = parse_reply(
        json.dumps({"message": "Added.", "board_update": update}), board
    )

    assert reply.board_update.project == board.project
    assert reply.board_update.cards["card-1"].priority == "high"
    assert reply.board_update.cards["card-1"].dueDate.isoformat() == "2027-03-12"
    assert reply.board_update.cards["card-new"].priority is None
    assert reply.board_update.cards["card-new"].dueDate is None


def test_parse_reply_keeps_values_the_model_set() -> None:
    board = make_board()
    update = board.model_dump(mode="json")
    update["cards"]["card-1"].update(priority="low", dueDate=None)

    reply = parse_reply(
        json.dumps({"message": "Updated.", "board_update": update}), board
    )

    assert reply.board_update.cards["card-1"].priority == "low"
    assert reply.board_update.cards["card-1"].dueDate is None


@pytest.mark.parametrize(
    ("raw_reply", "detail"),
    [
        ("not json", "malformed structured output"),
        (json.dumps(["not", "an", "object"]), "invalid response or board update"),
        (json.dumps({"message": "Hi"}), "invalid response or board update"),
        (
            json.dumps({"message": "Hi", "board_update": {"cards": []}}),
            "invalid response or board update",
        ),
    ],
)
def test_parse_reply_rejects_unusable_output(raw_reply: str, detail: str) -> None:
    with pytest.raises(InvalidReplyError, match=detail):
        parse_reply(raw_reply, make_board())
