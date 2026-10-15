from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.chat import (
    STRUCTURED_REPLY_FORMAT,
    InvalidReplyError,
    build_chat_messages,
    parse_reply,
)
from app.database import DATABASE_PATH, initialize_database, load_board, save_board
from app.openrouter import (
    OpenRouterClient,
    OpenRouterConfigurationError,
    OpenRouterError,
)
from app.schemas import BoardData, ChatRequest, ChatResponse

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
        database_path = request.app.state.database_path
        board_data = await run_in_threadpool(load_board, database_path, user_id)
        if board_data is None:
            raise HTTPException(status_code=404, detail="Board not found")
        current_board = BoardData.model_validate(board_data)

        try:
            raw_reply = await request.app.state.openrouter_client.complete_messages(
                build_chat_messages(current_board, chat_request),
                response_format=STRUCTURED_REPLY_FORMAT,
            )
            reply = parse_reply(raw_reply, current_board)
        except OpenRouterConfigurationError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
        except (OpenRouterError, InvalidReplyError) as error:
            raise HTTPException(status_code=502, detail=str(error)) from error

        if reply.board_update is None:
            return ChatResponse(message=reply.message)
        if not await run_in_threadpool(
            save_board, database_path, user_id, reply.board_update
        ):
            raise HTTPException(status_code=404, detail="Board not found")
        return ChatResponse(message=reply.message, board=reply.board_update)

    application.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIR, html=True, check_dir=False),
        name="frontend",
    )
    return application


app = create_app()
