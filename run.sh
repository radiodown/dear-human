#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  printf 'Python 3.9 이상이 필요합니다. python3를 설치한 뒤 다시 실행해 주세요.\n' >&2
  exit 1
fi

exec python3 "$PROJECT_ROOT/tools/preview_server.py" --root "$PROJECT_ROOT" "$@"
