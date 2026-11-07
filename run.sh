#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  printf 'Python 3.9 이상이 필요합니다. python3를 설치한 뒤 다시 실행해 주세요.\n' >&2
  exit 1
fi

PREVIEW_PORT=4173
ARGS=("$@")
for ((i = 0; i < $#; i++)); do
  case "${ARGS[i]}" in
    -h|--help)
      exec python3 "$PROJECT_ROOT/tools/preview_server.py" --root "$PROJECT_ROOT" "$@"
      ;;
    --port)
      PREVIEW_PORT="${ARGS[i + 1]:-}"
      i=$((i + 1))
      ;;
    --port=*)
      PREVIEW_PORT="${ARGS[i]#*=}"
      ;;
  esac
done

# Let the server report invalid ports without stopping a running process.
if ! [[ "$PREVIEW_PORT" =~ ^[0-9]{1,5}$ ]] ||
   ((10#$PREVIEW_PORT < 1 || 10#$PREVIEW_PORT > 65535)); then
  exec python3 "$PROJECT_ROOT/tools/preview_server.py" --root "$PROJECT_ROOT" "$@"
fi
PREVIEW_PORT=$((10#$PREVIEW_PORT))

if ! command -v lsof >/dev/null 2>&1; then
  printf '기존 서버를 종료하려면 lsof가 필요합니다.\n' >&2
  exit 1
fi

PREVIOUS_PIDS="$(lsof -nP -t -iTCP:"$PREVIEW_PORT" -sTCP:LISTEN || true)"
for pid in $PREVIOUS_PIDS; do
  printf '기존 프로세스 종료: PID %s (포트 %s)\n' "$pid" "$PREVIEW_PORT"
  kill -TERM "$pid" 2>/dev/null || true
done

for pid in $PREVIOUS_PIDS; do
  for ((attempt = 0; attempt < 30; attempt++)); do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 0.1
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill -KILL "$pid" 2>/dev/null || {
      printf '기존 프로세스를 종료하지 못했습니다: PID %s\n' "$pid" >&2
      exit 1
    }
    sleep 0.1
  fi
done

exec python3 "$PROJECT_ROOT/tools/preview_server.py" --root "$PROJECT_ROOT" "$@"
