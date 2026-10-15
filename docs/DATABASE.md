# Database proposal

## Storage

Use SQLite, as required for the local MVP. Keep the board in normalized `users`, `boards`, `columns`, and `cards` tables. The full proposed schema and a sample board JSON shape are in [kanban-schema.json](kanban-schema.json).

The `boards.user_id` unique constraint enforces one board per user. Column and card IDs are unique within their board rather than globally, so separate users can have the same seeded IDs. Columns and cards have integer positions so their display order is preserved. Renaming a column changes its title; moving a card changes its column and position. The MVP keeps the five seeded columns fixed. Foreign keys cascade from a user to their board and its contents, and the backend must enable SQLite foreign-key enforcement on each connection.

## MVP identity and initialization

Seed one user with ID `demo-user` and username `user`; do not store the hardcoded demo password in the database. Create that user's board and seed its project name and description, five columns, and sample cards when the database is first initialized. The board API representation includes `project` details, `columns` with `cardIds`, and a `cards` map; the backend maps that shape to and from the normalized rows. Existing databases receive project name and description columns with defaults during initialization, preserving existing columns and cards.

The sign-in implemented so far is client-side demo UI only. The MVP API uses `/api/users/{user_id}/board` and the seeded `demo-user` ID; this identifier is not authentication. Do not treat the current frontend sign-in as authorization. Future authentication should derive the user ID from the authenticated server-side identity.

## Writes and file location

Use `GET` and full-board `PUT` at `/api/users/{user_id}/board`. Apply each board-changing request in a single SQLite transaction so a move, edit, or delete cannot leave partially updated ordering. Keep order values contiguous when saving a board. Enable foreign keys and use parameterized SQL.

In Docker, store the database at `/data/kanban.sqlite3` on a named Compose volume so it survives container recreation and `docker compose down`. For local backend development, allow a `PM_DATABASE_PATH` environment variable and use a project-local data path by default. The backend creates the parent directory and database when absent.

## Not included

This proposal does not add authentication, board history, soft deletes, general-purpose schema migration tooling, or multiple boards per user. Existing databases receive only the small in-app migration needed for the project detail fields.
