from contextlib import asynccontextmanager
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from app.chat import STRUCTURED_REPLY_FORMAT, build_chat_messages
from app.database import (
    DATABASE_PATH,
    DEMO_USER_ID,
    initialize_database,
    load_board,
    save_board,
)
from app.openrouter import (
    OpenRouterClient,
    OpenRouterConfigurationError,
    OpenRouterError,
)
from app.schemas import BoardData, ChatRequest, ChatResponse, StructuredChatReply

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parents[1] / "frontend" / "out"


def create_app(
    database_path: Path = DATABASE_PATH,
    openrouter_client: OpenRouterClient | None = None,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        initialize_database(database_path)
        yield

    application = FastAPI(title="PM Backend", lifespan=lifespan)
    application.state.database_path = database_path
    application.state.openrouter_client = openrouter_client or OpenRouterClient()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_methods=["GET", "PUT", "POST"],
        allow_headers=["Content-Type"],
    )

    @application.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "pm-backend"}

    @application.get("/api/hello")
    async def hello() -> dict[str, str]:
        return {"message": "hello from the PM backend"}

    @application.get("/api/users/{user_id}/board", response_model=BoardData)
    def read_user_board(user_id: str, request: Request) -> BoardData:
        board = load_board(request.app.state.database_path, user_id)
        if board is None:
            raise HTTPException(status_code=404, detail="Board not found")
        return BoardData.model_validate(board)

    @application.put("/api/users/{user_id}/board", response_model=BoardData)
    def replace_user_board(
        user_id: str, board: BoardData, request: Request
    ) -> BoardData:
        saved = save_board(request.app.state.database_path, user_id, board)
        if not saved:
            raise HTTPException(status_code=404, detail="Board not found")
        return board

    @application.post(
        "/api/users/{user_id}/chat",
        response_model=ChatResponse,
        response_model_exclude_unset=True,
    )
    async def chat_with_board(
        user_id: str, chat_request: ChatRequest, request: Request
    ) -> ChatResponse:
        if user_id != DEMO_USER_ID:
            raise HTTPException(status_code=404, detail="Board not found")

        current_board_data = load_board(request.app.state.database_path, user_id)
        if current_board_data is None:
            raise HTTPException(status_code=404, detail="Board not found")
        current_board = BoardData.model_validate(current_board_data)
        messages = build_chat_messages(current_board, chat_request)

        try:
            raw_reply = await request.app.state.openrouter_client.complete_messages(
                messages, response_format=STRUCTURED_REPLY_FORMAT
            )
        except OpenRouterConfigurationError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
        except OpenRouterError as error:
            raise HTTPException(status_code=502, detail=str(error)) from error

        try:
            decoded_reply = json.loads(raw_reply)
        except json.JSONDecodeError as error:
            raise HTTPException(
                status_code=502,
                detail="AI provider returned malformed structured output",
            ) from error

        if isinstance(decoded_reply, dict):
            board_update = decoded_reply.get("board_update")
            if isinstance(board_update, dict):
                board_update.setdefault(
                    "project", current_board.project.model_dump(mode="json")
                )
                update_cards = board_update.get("cards")
                if isinstance(update_cards, dict):
                    for card_id, card_update in update_cards.items():
                        if not isinstance(card_update, dict):
                            continue
                        current_card = current_board.cards.get(card_id)
                        card_update.setdefault(
                            "priority", current_card.priority if current_card else None
                        )
                        card_update.setdefault(
                            "dueDate",
                            current_card.dueDate.isoformat()
                            if current_card and current_card.dueDate
                            else None,
                        )

        try:
            model_reply = StructuredChatReply.model_validate(decoded_reply)
        except ValidationError as error:
            raise HTTPException(
                status_code=502,
                detail="AI provider returned an invalid response or board update",
            ) from error

        resulting_board = None
        if model_reply.board_update is not None:
            if not save_board(
                request.app.state.database_path, user_id, model_reply.board_update
            ):
                raise HTTPException(status_code=404, detail="Board not found")
            resulting_board = model_reply.board_update

        if resulting_board is None:
            return ChatResponse(message=model_reply.message)
        return ChatResponse(message=model_reply.message, board=resulting_board)

    application.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIR, html=True, check_dir=False),
        name="frontend",
    )
    return application


app = create_app()
