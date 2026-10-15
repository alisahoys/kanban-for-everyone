from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import DATABASE_PATH, initialize_database, load_board, save_board
from app.schemas import BoardData

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parents[1] / "frontend" / "out"


def create_app(database_path: Path = DATABASE_PATH) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        initialize_database(database_path)
        yield

    application = FastAPI(title="PM Backend", lifespan=lifespan)
    application.state.database_path = database_path
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_methods=["GET", "PUT"],
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

    application.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIR, html=True, check_dir=False),
        name="frontend",
    )
    return application


app = create_app()
