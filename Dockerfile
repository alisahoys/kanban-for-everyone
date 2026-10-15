FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM python:3.11-slim AS app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN python -m pip install --no-cache-dir uv

COPY backend/pyproject.toml ./backend/pyproject.toml
COPY backend/uv.lock ./backend/uv.lock
COPY backend/README.md ./backend/README.md
COPY backend/app ./backend/app
COPY backend/tests ./backend/tests
COPY --from=frontend-build /app/frontend/out ./frontend/out

WORKDIR /app/backend
RUN uv sync --frozen --extra dev --no-install-project

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
