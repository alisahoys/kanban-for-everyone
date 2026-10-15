from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parents[1] / "frontend" / "out"

app = FastAPI(title="PM Backend")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "pm-backend"}


@app.get("/api/hello")
async def hello() -> dict[str, str]:
    return {"message": "hello from the PM backend"}


app.mount(
    "/",
    StaticFiles(directory=FRONTEND_DIR, html=True, check_dir=False),
    name="frontend",
)
