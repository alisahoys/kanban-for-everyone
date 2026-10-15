import asyncio
import json
from typing import Callable

import httpx
import pytest

from app import openrouter_smoke
from app.openrouter import (
    DEFAULT_MODEL,
    OPENROUTER_API_URL,
    OpenRouterClient,
    OpenRouterConfigurationError,
    OpenRouterProviderError,
)


class MockAsyncTransport(httpx.AsyncBaseTransport):
    def __init__(self, handler: Callable[[httpx.Request], httpx.Response]):
        self.handler = handler

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        return self.handler(request)


def test_complete_returns_model_text_and_uses_free_model():
    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == OPENROUTER_API_URL
        assert request.headers["Authorization"] == "Bearer test-secret"
        body = json.loads(request.content)
        assert body["model"] == DEFAULT_MODEL
        assert body["messages"] == [{"role": "user", "content": "2+2?"}]
        return httpx.Response(
            200, json={"choices": [{"message": {"content": "  4  "}}]}
        )

    client = OpenRouterClient(
        api_key="test-secret", transport=MockAsyncTransport(handler)
    )
    assert asyncio.run(client.complete("2+2?")) == "4"


def test_complete_reports_missing_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(OpenRouterConfigurationError, match="OPENROUTER_API_KEY"):
        asyncio.run(OpenRouterClient().complete("2+2?"))


def test_complete_maps_provider_error_without_including_response_body():
    secret = "test-secret"
    transport = MockAsyncTransport(
        lambda _request: httpx.Response(401, text=f"invalid token {secret}")
    )
    with pytest.raises(OpenRouterProviderError, match="HTTP 401") as error:
        asyncio.run(
            OpenRouterClient(api_key=secret, transport=transport).complete("2+2?")
        )
    assert secret not in str(error.value)


def test_complete_maps_timeout_without_disclosing_key():
    def handler(_request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("request timed out")

    secret = "test-secret"
    with pytest.raises(OpenRouterProviderError, match="timed out") as error:
        asyncio.run(
            OpenRouterClient(
                api_key=secret, transport=MockAsyncTransport(handler)
            ).complete("2+2?")
        )
    assert secret not in str(error.value)


@pytest.mark.parametrize(
    ("answer", "expected_exit"), [("4", 0), ("The answer is 4.", 0), ("4.5", 1)]
)
def test_smoke_command_checks_the_answer_without_live_network(
    monkeypatch, capsys, answer, expected_exit
):
    class StubClient:
        async def complete(self, _prompt: str) -> str:
            return answer

    monkeypatch.setattr(openrouter_smoke, "OpenRouterClient", StubClient)
    assert asyncio.run(openrouter_smoke.main()) == expected_exit
    output = capsys.readouterr().out
    assert ("smoke test passed" in output) == (expected_exit == 0)
