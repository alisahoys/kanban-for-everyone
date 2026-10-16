import os
from typing import Any

import httpx

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "openrouter/free"
REQUEST_TIMEOUT_SECONDS = 20.0


class OpenRouterError(Exception):
    """A safe, user-facing error from the OpenRouter integration."""


class OpenRouterConfigurationError(OpenRouterError):
    """OpenRouter cannot be called because its configuration is missing."""


class OpenRouterProviderError(OpenRouterError):
    """OpenRouter failed or returned an unusable response."""


class OpenRouterClient:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else os.getenv("OPENROUTER_API_KEY")
        self.model = model or os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)
        self.transport = transport

    async def complete(self, prompt: str) -> str:
        return await self.complete_messages([{"role": "user", "content": prompt}])

    async def complete_messages(
        self,
        messages: list[dict[str, str]],
        response_format: dict[str, Any] | None = None,
    ) -> str:
        if not self.api_key:
            raise OpenRouterConfigurationError(
                "OPENROUTER_API_KEY is not configured. Set it in the backend environment."
            )

        request_body: dict[str, Any] = {"model": self.model, "messages": messages}
        if response_format is not None:
            request_body["response_format"] = response_format
            request_body["provider"] = {"require_parameters": True}

        try:
            async with httpx.AsyncClient(
                timeout=REQUEST_TIMEOUT_SECONDS, transport=self.transport
            ) as client:
                response = await client.post(
                    OPENROUTER_API_URL,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=request_body,
                )
                response.raise_for_status()
                payload = response.json()
        except httpx.TimeoutException as error:
            raise OpenRouterProviderError(
                "OpenRouter request timed out. Try again shortly."
            ) from error
        except httpx.HTTPStatusError as error:
            raise OpenRouterProviderError(
                f"OpenRouter returned HTTP {error.response.status_code}. Check provider access and try again."
            ) from error
        except (httpx.RequestError, ValueError) as error:
            raise OpenRouterProviderError(
                "OpenRouter could not complete the request. Check provider access and try again."
            ) from error

        try:
            content = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as error:
            raise OpenRouterProviderError(
                "OpenRouter returned an unexpected response. Try again or check the selected model."
            ) from error

        if not isinstance(content, str) or not content.strip():
            raise OpenRouterProviderError(
                "OpenRouter returned an empty response. Try again or check the selected model."
            )
        return content.strip()
