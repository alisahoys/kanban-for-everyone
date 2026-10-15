import asyncio
import re

from app.openrouter import OpenRouterClient, OpenRouterError


async def main() -> int:
    try:
        answer = await OpenRouterClient().complete(
            "What is 2+2? Reply with just the number."
        )
    except OpenRouterError as error:
        print(f"OpenRouter smoke test failed: {error}")
        return 1

    print(f"OpenRouter answered: {answer}")
    is_four = re.fullmatch(
        r"\s*(?:the answer is\s+)?4[.!]?\s*", answer, re.IGNORECASE
    )
    if is_four:
        print("OpenRouter smoke test passed.")
        return 0

    print("OpenRouter smoke test failed: expected an answer equivalent to 4.")
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
