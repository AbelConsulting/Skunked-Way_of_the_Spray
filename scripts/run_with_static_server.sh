#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <command> [<command> ...]" >&2
  exit 64
fi

PORT="${TEST_SERVER_PORT:-8000}"
HOST="${TEST_SERVER_HOST:-127.0.0.1}"
SERVER_URL="http://${HOST}:${PORT}/"

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

python3 -m http.server "$PORT" --bind "$HOST" >/tmp/skunkfu-static-server.log 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 20); do
  if curl -sSf "$SERVER_URL" >/dev/null; then
    export TEST_SERVER="$SERVER_URL"
    for cmd in "$@"; do
      echo "Running: $cmd"
      bash -lc "$cmd"
    done
    exit 0
  fi
  sleep 1
done

echo "Static server failed to start on $SERVER_URL" >&2
cat /tmp/skunkfu-static-server.log >&2 || true
exit 1