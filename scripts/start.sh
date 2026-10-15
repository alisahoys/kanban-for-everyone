#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="${ROOT_DIR}/.backend.pid"
STDOUT_LOG="${ROOT_DIR}/backend.stdout.log"
STDERR_LOG="${ROOT_DIR}/backend.stderr.log"

if [ -f "${PID_FILE}" ] && kill -0 "$(cat "${PID_FILE}")" 2>/dev/null; then
  echo "Backend already running with PID $(cat "${PID_FILE}")"
  exit 0
fi

cd "${ROOT_DIR}/backend"
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 > "${STDOUT_LOG}" 2> "${STDERR_LOG}" &
PID=$!

echo "${PID}" > "${PID_FILE}"
echo "Backend started with PID ${PID}"
