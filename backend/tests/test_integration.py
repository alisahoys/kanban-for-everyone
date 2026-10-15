"""Integration checks against a real Uvicorn process and HTTP listener."""

import re
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _available_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


@pytest.fixture
def running_server():
    port = _available_port()
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--log-level",
            "warning",
        ],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base_url = f"http://127.0.0.1:{port}"
    deadline = time.monotonic() + 10

    try:
        while time.monotonic() < deadline:
            if process.poll() is not None:
                pytest.fail(f"Uvicorn exited during startup with code {process.returncode}")
            try:
                response = httpx.get(f"{base_url}/api/health", timeout=0.25)
                if response.status_code == 200:
                    break
            except httpx.TransportError:
                time.sleep(0.05)
        else:
            pytest.fail("Uvicorn did not become ready within 10 seconds")

        yield base_url
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def test_server_serves_html_and_api_over_http(running_server: str) -> None:
    with httpx.Client(base_url=running_server, timeout=2) as client:
        page = client.get("/")
        health = client.get("/api/health")
        hello = client.get("/api/hello")
        missing = client.get("/api/missing")
        static_paths = re.findall(r'(?:src|href)="(/_next/static/[^"]+)"', page.text)
        asset = client.get(static_paths[0]) if static_paths else None

    assert page.status_code == 200
    assert page.headers["content-type"].startswith("text/html")
    assert "Kanban Studio" in page.text
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "service": "pm-backend"}
    assert hello.status_code == 200
    assert hello.json() == {"message": "hello from the PM backend"}
    assert static_paths
    assert asset is not None and asset.status_code == 200
    assert missing.status_code == 404
