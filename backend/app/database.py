import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.constants import FIXED_COLUMN_IDS
from app.schemas import BoardData

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE_PATH = BACKEND_DIR / "data" / "kanban.sqlite3"
DATABASE_PATH = Path(os.environ.get("PM_DATABASE_PATH", DEFAULT_DATABASE_PATH))
DEMO_USER_ID = "demo-user"
DEMO_USERNAME = "user"

INITIAL_COLUMNS = [
    {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
    {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
    {
        "id": "col-progress",
        "title": "In Progress",
        "cardIds": ["card-4", "card-5"],
    },
    {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
    {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
]
INITIAL_CARDS = {
    "card-1": {
        "id": "card-1",
        "title": "Align roadmap themes",
        "details": "Draft quarterly themes with impact statements and metrics.",
    },
    "card-2": {
        "id": "card-2",
        "title": "Gather customer signals",
        "details": "Review support tags, sales notes, and churn feedback.",
    },
    "card-3": {
        "id": "card-3",
        "title": "Prototype analytics view",
        "details": "Sketch initial dashboard layout and key drill-downs.",
    },
    "card-4": {
        "id": "card-4",
        "title": "Refine status language",
        "details": "Standardize column labels and tone across the board.",
    },
    "card-5": {
        "id": "card-5",
        "title": "Design card layout",
        "details": "Add hierarchy and spacing for scanning dense lists.",
    },
    "card-6": {
        "id": "card-6",
        "title": "QA micro-interactions",
        "details": "Verify hover, focus, and loading states.",
    },
    "card-7": {
        "id": "card-7",
        "title": "Ship marketing page",
        "details": "Final copy approved and asset pack delivered.",
    },
    "card-8": {
        "id": "card-8",
        "title": "Close onboarding sprint",
        "details": "Document release notes and share internally.",
    },
}


@contextmanager
def connect(database_path: Path) -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database(database_path: Path = DATABASE_PATH) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with connect(database_path) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS boards (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL DEFAULT 'Product Planning',
                description TEXT NOT NULL DEFAULT 'Plan product improvements from roadmap discovery through design, review, and launch.'
            );
            CREATE TABLE IF NOT EXISTS columns (
                board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
                id TEXT NOT NULL,
                title TEXT NOT NULL,
                position INTEGER NOT NULL CHECK (position >= 0),
                PRIMARY KEY (board_id, id),
                UNIQUE (board_id, position)
            );
            CREATE TABLE IF NOT EXISTS cards (
                board_id TEXT NOT NULL,
                id TEXT NOT NULL,
                column_id TEXT NOT NULL,
                title TEXT NOT NULL,
                details TEXT NOT NULL DEFAULT '',
                priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT NULL,
                due_date TEXT DEFAULT NULL,
                position INTEGER NOT NULL CHECK (position >= 0),
                PRIMARY KEY (board_id, id),
                UNIQUE (board_id, column_id, position),
                FOREIGN KEY (board_id, column_id)
                    REFERENCES columns(board_id, id) ON DELETE CASCADE
            );
            """
        )

        board_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(boards)")
        }
        if "name" not in board_columns:
            connection.execute(
                "ALTER TABLE boards ADD COLUMN name TEXT NOT NULL DEFAULT 'Product Planning'"
            )
        if "description" not in board_columns:
            connection.execute(
                "ALTER TABLE boards ADD COLUMN description TEXT NOT NULL DEFAULT "
                "'Plan product improvements from roadmap discovery through design, review, and launch.'"
            )

        card_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(cards)")
        }
        if "priority" not in card_columns:
            connection.execute(
                "ALTER TABLE cards ADD COLUMN priority TEXT "
                "CHECK (priority IN ('low', 'medium', 'high'))"
            )
        if "due_date" not in card_columns:
            connection.execute("ALTER TABLE cards ADD COLUMN due_date TEXT")

        connection.execute(
            "INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)",
            (DEMO_USER_ID, DEMO_USERNAME),
        )
        board = connection.execute(
            "SELECT id FROM boards WHERE user_id = ?", (DEMO_USER_ID,)
        ).fetchone()
        if board:
            return

        board_id = "board-demo"
        connection.execute(
            "INSERT INTO boards (id, user_id) VALUES (?, ?)",
            (board_id, DEMO_USER_ID),
        )
        for column_position, column in enumerate(INITIAL_COLUMNS):
            connection.execute(
                "INSERT INTO columns (board_id, id, title, position) VALUES (?, ?, ?, ?)",
                (board_id, column["id"], column["title"], column_position),
            )
            for card_position, card_id in enumerate(column["cardIds"]):
                card = INITIAL_CARDS[card_id]
                connection.execute(
                    """INSERT INTO cards
                       (board_id, id, column_id, title, details, position)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        board_id,
                        card["id"],
                        column["id"],
                        card["title"],
                        card["details"],
                        card_position,
                    ),
                )


def load_board(database_path: Path, user_id: str) -> dict | None:
    with connect(database_path) as connection:
        board = connection.execute(
            "SELECT id, name, description FROM boards WHERE user_id = ?", (user_id,)
        ).fetchone()
        if not board:
            return None

        board_id = board["id"]
        columns = connection.execute(
            "SELECT id, title FROM columns WHERE board_id = ? ORDER BY position",
            (board_id,),
        ).fetchall()
        cards = connection.execute(
            """SELECT id, column_id, title, details, priority, due_date FROM cards
               WHERE board_id = ? ORDER BY column_id, position""",
            (board_id,),
        ).fetchall()

    card_data = {
        card["id"]: {
            "id": card["id"],
            "title": card["title"],
            "details": card["details"],
            "priority": card["priority"],
            "dueDate": card["due_date"],
        }
        for card in cards
    }
    cards_by_column: dict[str, list[str]] = {column["id"]: [] for column in columns}
    for card in cards:
        cards_by_column[card["column_id"]].append(card["id"])

    return {
        "project": {
            "name": board["name"],
            "description": board["description"],
        },
        "columns": [
            {
                "id": column["id"],
                "title": column["title"],
                "cardIds": cards_by_column[column["id"]],
            }
            for column in columns
        ],
        "cards": card_data,
    }


def save_board(database_path: Path, user_id: str, board_data: BoardData) -> bool:
    with connect(database_path) as connection:
        board = connection.execute(
            "SELECT id FROM boards WHERE user_id = ?", (user_id,)
        ).fetchone()
        if not board:
            return False

        board_id = board["id"]
        connection.execute(
            "UPDATE boards SET name = ?, description = ? WHERE id = ?",
            (board_data.project.name, board_data.project.description, board_id),
        )
        connection.execute("DELETE FROM cards WHERE board_id = ?", (board_id,))
        for column_position, column in enumerate(board_data.columns):
            connection.execute(
                "UPDATE columns SET title = ? WHERE board_id = ? AND id = ?",
                (column.title, board_id, column.id),
            )
            for card_position, card_id in enumerate(column.cardIds):
                card = board_data.cards[card_id]
                connection.execute(
                    """INSERT INTO cards
                       (board_id, id, column_id, title, details, priority, due_date, position)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        board_id,
                        card.id,
                        column.id,
                        card.title,
                        card.details,
                        card.priority,
                        card.dueDate.isoformat() if card.dueDate else None,
                        card_position,
                    ),
                )
    return True
