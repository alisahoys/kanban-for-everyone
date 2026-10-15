import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def main() -> int:
    with tempfile.TemporaryDirectory() as directory:
        app = create_app(Path(directory) / "smoke.sqlite3")
        with TestClient(app) as client:
            before = client.get("/api/users/demo-user/board")
            response = client.post(
                "/api/users/demo-user/chat",
                json={
                    "question": "How many columns are on this board? Do not change it.",
                    "history": [],
                },
            )
            if response.status_code != 200:
                print(
                    "Board chat smoke test failed: "
                    f"API returned HTTP {response.status_code}."
                )
                return 1
            result = response.json()
            after = client.get("/api/users/demo-user/board")

    if not isinstance(result.get("message"), str) or not result["message"].strip():
        print("Board chat smoke test failed: the assistant response was empty.")
        return 1
    if "board" in result or after.json() != before.json():
        print("Board chat smoke test failed: the no-change request altered its test board.")
        return 1

    print("Board-aware chat smoke test passed; the board remained unchanged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
