#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="${ROOT_DIR}/.backend.pid"
STDOUT_LOG="${ROOT_DIR}/backend.stdout.log"
STDERR_LOG="${ROOT_DIR}/backend.stderr.log"

if [ ! -f "${PID_FILE}" ]; then
  echo "No backend PID file found. Nothing to stop."
  exit 0
fi

PID="$(cat "${PID_FILE}")"
if kill -0 "${PID}" 2>/dev/null; then
  kill "${PID}"
  echo "Stopped backend with PID ${PID}"
else
  echo "Backend with PID ${PID} is not running."
fi

rm -f "${PID_FILE}" "${STDOUT_LOG}" "${STDERR_LOG}"
