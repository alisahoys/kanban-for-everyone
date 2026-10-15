import re

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_serves_kanban_html() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Kanban Studio" in response.text
    assert "Backlog" in response.text


def test_health_endpoint_returns_ok() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pm-backend"}


def test_hello_endpoint_returns_message() -> None:
    response = client.get("/api/hello")

    assert response.status_code == 200
    assert response.json() == {"message": "hello from the PM backend"}


def test_next_static_assets_are_served() -> None:
    page = client.get("/")
    assets = re.findall(r'(?:src|href)="(/_next/static/[^"]+)"', page.text)

    assert assets
    response = client.get(assets[0])
    assert response.status_code == 200


def test_unknown_route_returns_not_found() -> None:
    response = client.get("/api/missing")

    assert response.status_code == 404
