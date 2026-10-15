import json
from copy import deepcopy

from fastapi.testclient import TestClient

from app.main import create_app
from app.openrouter import OpenRouterConfigurationError, OpenRouterProviderError


class StubOpenRouterClient:
    def __init__(self, reply: str | Exception):
        self.reply = reply
        self.call_count = 0
        self.messages = None
        self.response_format = None

    async def complete_messages(self, messages, response_format=None) -> str:
        self.call_count += 1
        self.messages = messages
        self.response_format = response_format
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


def make_client(tmp_path, reply: str | Exception) -> tuple[TestClient, StubOpenRouterClient]:
    openrouter = StubOpenRouterClient(reply)
    client = TestClient(
        create_app(tmp_path / "kanban.sqlite3", openrouter_client=openrouter)
    )
    client.__enter__()
    return client, openrouter


def test_chat_uses_persisted_board_question_and_history_without_changing_board(tmp_path):
    reply = json.dumps({"message": "Your board has eight tasks.", "board_update": None})
    client, openrouter = make_client(tmp_path, reply)
    try:
        board = client.get("/api/users/demo-user/board").json()
        board["columns"][0]["title"] = "Current backlog"
        board["project"] = {
            "name": "Customer insights",
            "description": "Turn customer feedback into product improvements.",
        }
        client.put("/api/users/demo-user/board", json=board)
        history = [
            {"role": "user", "content": "How many tasks are there?"},
            {"role": "assistant", "content": "I can check the board."},
        ]

        response = client.post(
            "/api/users/demo-user/chat",
            json={"question": "Summarize the board.", "history": history},
        )

        assert response.status_code == 200
        assert response.json() == {"message": "Your board has eight tasks."}
        assert client.get("/api/users/demo-user/board").json() == board
        system_message = openrouter.messages[0]["content"]
        assert json.dumps(board, ensure_ascii=False) in system_message
        assert openrouter.messages[1:3] == history
        assert openrouter.messages[-1] == {
            "role": "user",
            "content": "Summarize the board.",
        }
        assert openrouter.response_format["type"] == "json_schema"
        assert openrouter.response_format["json_schema"]["strict"] is True
    finally:
        client.__exit__(None, None, None)


def test_chat_valid_board_update_is_saved_and_returned(tmp_path):
    client, _ = make_client(tmp_path, "")
    try:
        board = client.get("/api/users/demo-user/board").json()
        updated_board = deepcopy(board)
        updated_board["cards"]["card-1"]["title"] = "Updated by assistant"
        client.app.state.openrouter_client.reply = json.dumps(
            {"message": "I renamed it.", "board_update": updated_board}
        )
        response = client.post(
            "/api/users/demo-user/chat", json={"question": "Rename the first task."}
        )

        assert response.status_code == 200
        assert response.json() == {"message": "I renamed it.", "board": updated_board}
        assert client.get("/api/users/demo-user/board").json() == updated_board
    finally:
        client.__exit__(None, None, None)


def test_chat_rejects_malformed_output_without_changing_board(tmp_path):
    client, _ = make_client(tmp_path, "not json")
    try:
        before = client.get("/api/users/demo-user/board").json()
        response = client.post(
            "/api/users/demo-user/chat", json={"question": "Move task one."}
        )
        assert response.status_code == 502
        assert "malformed structured output" in response.json()["detail"]
        assert client.get("/api/users/demo-user/board").json() == before
    finally:
        client.__exit__(None, None, None)


def test_chat_rejects_invalid_board_update_without_changing_board(tmp_path):
    client, openrouter = make_client(tmp_path, "")
    try:
        before = client.get("/api/users/demo-user/board").json()
        invalid_board = deepcopy(before)
        invalid_board["columns"].pop()
        openrouter.reply = json.dumps(
            {"message": "Done.", "board_update": invalid_board}
        )
        response = client.post(
            "/api/users/demo-user/chat", json={"question": "Change the board."}
        )
        assert response.status_code == 502
        assert "invalid response or board update" in response.json()["detail"]
        assert client.get("/api/users/demo-user/board").json() == before
    finally:
        client.__exit__(None, None, None)


def test_chat_provider_failure_and_unknown_user_do_not_change_board(tmp_path):
    client, openrouter = make_client(
        tmp_path, OpenRouterProviderError("OpenRouter returned HTTP 503")
    )
    try:
        before = client.get("/api/users/demo-user/board").json()
        failed = client.post(
            "/api/users/demo-user/chat", json={"question": "Help with my board."}
        )
        assert failed.status_code == 502
        assert "HTTP 503" in failed.json()["detail"]
        assert client.get("/api/users/demo-user/board").json() == before
        calls_before_unknown_user = openrouter.call_count

        missing = client.post(
            "/api/users/missing-user/chat", json={"question": "Help."}
        )
        assert missing.status_code == 404
        assert openrouter.call_count == calls_before_unknown_user
    finally:
        client.__exit__(None, None, None)


def test_chat_missing_provider_configuration_is_actionable(tmp_path):
    client, _ = make_client(
        tmp_path,
        OpenRouterConfigurationError(
            "OPENROUTER_API_KEY is not configured. Set it in the backend environment."
        ),
    )
    try:
        before = client.get("/api/users/demo-user/board").json()
        response = client.post(
            "/api/users/demo-user/chat", json={"question": "Help with my board."}
        )
        assert response.status_code == 503
        assert "OPENROUTER_API_KEY" in response.json()["detail"]
        assert client.get("/api/users/demo-user/board").json() == before
    finally:
        client.__exit__(None, None, None)


def test_chat_bounds_history_before_calling_provider(tmp_path):
    client, openrouter = make_client(tmp_path, "")
    try:
        response = client.post(
            "/api/users/demo-user/chat",
            json={
                "question": "Help.",
                "history": [{"role": "user", "content": "hi"}] * 21,
            },
        )
        assert response.status_code == 422
        assert openrouter.messages is None
    finally:
        client.__exit__(None, None, None)
