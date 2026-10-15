import re
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "kanban.sqlite3")) as test_client:
        yield test_client


def test_root_serves_kanban_html(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Checking your session" in response.text


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pm-backend"}


def test_hello_endpoint_returns_message(client: TestClient) -> None:
    response = client.get("/api/hello")

    assert response.status_code == 200
    assert response.json() == {"message": "hello from the PM backend"}


def test_next_development_origin_can_call_chat_api(client: TestClient) -> None:
    response = client.options(
        "/api/users/demo-user/chat",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_next_static_assets_are_served(client: TestClient) -> None:
    page = client.get("/")
    assets = re.findall(r'(?:src|href)="(/_next/static/[^"]+)"', page.text)

    assert assets
    response = client.get(assets[0])
    assert response.status_code == 200


def test_unknown_route_returns_not_found(client: TestClient) -> None:
    response = client.get("/api/missing")

    assert response.status_code == 404


def test_get_board_seeds_demo_user_and_returns_ordered_board(client: TestClient) -> None:
    response = client.get("/api/users/demo-user/board")

    assert response.status_code == 200
    board = response.json()
    assert board["project"] == {
        "name": "Product Planning",
        "description": "Plan product improvements from roadmap discovery through design, review, and launch.",
    }
    assert [column["id"] for column in board["columns"]] == [
        "col-backlog",
        "col-discovery",
        "col-progress",
        "col-review",
        "col-done",
    ]
    assert board["columns"][0]["cardIds"] == ["card-1", "card-2"]
    assert board["cards"]["card-1"] == {
        "id": "card-1",
        "title": "Align roadmap themes",
        "details": "Draft quarterly themes with impact statements and metrics.",
        "priority": None,
        "dueDate": None,
    }


def test_put_board_persists_edits_moves_and_deletes(client: TestClient) -> None:
    board = client.get("/api/users/demo-user/board").json()
    board["project"] = {
        "name": "Customer insights",
        "description": "Turn customer feedback into product improvements.",
    }
    board["columns"][0]["title"] = "Icebox"
    board["columns"][0]["cardIds"].remove("card-2")
    board["columns"][1]["cardIds"].append("card-2")
    board["cards"]["card-2"]["title"] = "Moved customer signals"
    board["cards"]["card-2"]["priority"] = "high"
    board["cards"]["card-2"]["dueDate"] = "2027-03-12"
    del board["cards"]["card-8"]
    board["columns"][4]["cardIds"].remove("card-8")

    response = client.put("/api/users/demo-user/board", json=board)

    assert response.status_code == 200
    assert response.json() == board
    assert client.get("/api/users/demo-user/board").json() == board


def test_board_routes_return_not_found_for_unknown_user(client: TestClient) -> None:
    response = client.get("/api/users/missing-user/board")

    assert response.status_code == 404
    assert response.json() == {"detail": "Board not found"}

    demo_board = client.get("/api/users/demo-user/board").json()
    update_response = client.put("/api/users/missing-user/board", json=demo_board)
    assert update_response.status_code == 404


@pytest.mark.parametrize(
    "invalid_change",
    [
        lambda board: board["columns"].pop(),
        lambda board: board["columns"][1]["cardIds"].append("card-1"),
        lambda board: board["cards"].pop("card-1"),
        lambda board: board["cards"]["card-1"].update({"id": "different-id"}),
        lambda board: board["project"].update({"name": ""}),
        lambda board: board["cards"]["card-1"].update({"priority": "urgent"}),
        lambda board: board["cards"]["card-1"].update({"dueDate": "2027-02-30"}),
        lambda board: board["columns"][0].update({"title": ""}),
        lambda board: board["columns"][0].update({"title": "x" * 61}),
        lambda board: board["cards"]["card-1"].update({"title": "x" * 201}),
        lambda board: board["cards"]["card-1"].update({"details": "x" * 2001}),
        lambda board: (
            board["cards"].update(
                {
                    f"extra-{i}": {
                        "id": f"extra-{i}",
                        "title": "Extra",
                        "details": "",
                        "priority": None,
                        "dueDate": None,
                    }
                    for i in range(493)
                }
            ),
            board["columns"][0]["cardIds"].extend(f"extra-{i}" for i in range(493)),
        ),
    ],
)
def test_put_board_rejects_invalid_board_structure(
    client: TestClient, invalid_change
) -> None:
    board = client.get("/api/users/demo-user/board").json()
    saved_board = deepcopy(board)
    invalid_change(board)

    response = client.put("/api/users/demo-user/board", json=board)

    assert response.status_code == 422
    assert client.get("/api/users/demo-user/board").json() == saved_board
