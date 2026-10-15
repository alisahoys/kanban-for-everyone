import sqlite3

import pytest

from app.database import connect, initialize_database, load_board, save_board
from app.schemas import BoardData


def test_database_is_created_and_initialization_keeps_saved_board(tmp_path) -> None:
    database_path = tmp_path / "nested" / "kanban.sqlite3"
    initialize_database(database_path)

    assert database_path.is_file()
    initial_board = load_board(database_path, "demo-user")
    assert initial_board is not None
    assert len(initial_board["columns"]) == 5

    initial_board["columns"][0]["title"] = "Saved title"
    saved_board = BoardData.model_validate(initial_board)
    assert save_board(database_path, "demo-user", saved_board)

    initialize_database(database_path)

    assert load_board(database_path, "demo-user") == initial_board


def test_board_ids_are_scoped_per_user_and_foreign_keys_are_enabled(tmp_path) -> None:
    database_path = tmp_path / "kanban.sqlite3"
    initialize_database(database_path)
    second_user_board = "board-second-user"

    with connect(database_path) as connection:
        assert connection.execute("PRAGMA foreign_keys").fetchone()[0] == 1
        connection.execute(
            "INSERT INTO users (id, username) VALUES (?, ?)",
            ("second-user", "second"),
        )
        connection.execute(
            "INSERT INTO boards (id, user_id) VALUES (?, ?)",
            (second_user_board, "second-user"),
        )
        connection.execute(
            "INSERT INTO columns (board_id, id, title, position) VALUES (?, ?, ?, ?)",
            (second_user_board, "col-backlog", "Other backlog", 0),
        )
        connection.execute(
            """INSERT INTO cards
               (board_id, id, column_id, title, details, position)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                second_user_board,
                "card-1",
                "col-backlog",
                "Other user's task",
                "Separate board",
                0,
            ),
        )

    first_user_board = load_board(database_path, "demo-user")
    second_user_board = load_board(database_path, "second-user")
    assert first_user_board is not None
    assert first_user_board["cards"]["card-1"]["title"] == "Align roadmap themes"
    assert second_user_board == {
        "columns": [
            {
                "id": "col-backlog",
                "title": "Other backlog",
                "cardIds": ["card-1"],
            }
        ],
        "cards": {
            "card-1": {
                "id": "card-1",
                "title": "Other user's task",
                "details": "Separate board",
            }
        },
    }


def test_database_write_transaction_rolls_back_on_constraint_failure(tmp_path) -> None:
    database_path = tmp_path / "kanban.sqlite3"
    initialize_database(database_path)

    with pytest.raises(sqlite3.IntegrityError):
        with connect(database_path) as connection:
            connection.execute(
                "UPDATE columns SET title = ? WHERE board_id = ? AND id = ?",
                ("Should roll back", "board-demo", "col-backlog"),
            )
            connection.execute(
                """INSERT INTO cards
                   (board_id, id, column_id, title, details, position)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    "board-demo",
                    "rollback-card",
                    "missing-column",
                    "Invalid task",
                    "",
                    0,
                ),
            )

    board = load_board(database_path, "demo-user")
    assert board is not None
    assert board["columns"][0]["title"] == "Backlog"
    assert "rollback-card" not in board["cards"]
