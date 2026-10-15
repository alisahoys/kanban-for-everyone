import sqlite3

import pytest

from app.database import (
    DEMO_USER_ID,
    INITIAL_CARDS,
    INITIAL_COLUMNS,
    connect,
    initialize_database,
    load_board,
    save_board,
)
from app.schemas import BoardData


def test_database_is_created_and_initialization_keeps_saved_board(tmp_path) -> None:
    database_path = tmp_path / "nested" / "kanban.sqlite3"
    initialize_database(database_path)

    assert database_path.is_file()
    initial_board = load_board(database_path, "demo-user")
    assert initial_board is not None
    assert len(initial_board["columns"]) == 5
    initial_board["project"]["name"] = "Roadmap refresh"
    initial_board["project"]["description"] = "Plan the next product release."

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
        "project": {
            "name": "Product Planning",
            "description": "Plan product improvements from roadmap discovery through design, review, and launch.",
        },
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


def test_existing_database_migration_preserves_board_and_adds_project_defaults(
    tmp_path,
) -> None:
    database_path = tmp_path / "existing.sqlite3"
    with sqlite3.connect(database_path) as connection:
        connection.executescript(
            """
            CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE);
            CREATE TABLE boards (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE columns (
                board_id TEXT NOT NULL,
                id TEXT NOT NULL,
                title TEXT NOT NULL,
                position INTEGER NOT NULL,
                PRIMARY KEY (board_id, id),
                UNIQUE (board_id, position)
            );
            CREATE TABLE cards (
                board_id TEXT NOT NULL,
                id TEXT NOT NULL,
                column_id TEXT NOT NULL,
                title TEXT NOT NULL,
                details TEXT NOT NULL DEFAULT '',
                position INTEGER NOT NULL,
                PRIMARY KEY (board_id, id),
                UNIQUE (board_id, column_id, position),
                FOREIGN KEY (board_id, column_id) REFERENCES columns(board_id, id)
            );
            """
        )
        connection.execute(
            "INSERT INTO users (id, username) VALUES (?, ?)",
            (DEMO_USER_ID, "user"),
        )
        connection.execute(
            "INSERT INTO boards (id, user_id) VALUES (?, ?)",
            ("board-demo", DEMO_USER_ID),
        )
        for column_position, column in enumerate(INITIAL_COLUMNS):
            connection.execute(
                "INSERT INTO columns VALUES (?, ?, ?, ?)",
                ("board-demo", column["id"], column["title"], column_position),
            )
            for card_position, card_id in enumerate(column["cardIds"]):
                card = INITIAL_CARDS[card_id]
                connection.execute(
                    "INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        "board-demo",
                        card_id,
                        column["id"],
                        card["title"],
                        card["details"],
                        card_position,
                    ),
                )

    initialize_database(database_path)
    migrated = load_board(database_path, DEMO_USER_ID)

    assert migrated is not None
    assert migrated["project"] == {
        "name": "Product Planning",
        "description": "Plan product improvements from roadmap discovery through design, review, and launch.",
    }
    assert migrated["columns"] == INITIAL_COLUMNS
    assert migrated["cards"]["card-1"] == INITIAL_CARDS["card-1"]


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
