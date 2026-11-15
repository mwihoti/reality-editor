#!/usr/bin/env bash
# Reality Editor regression suite.
#   1. deterministic mechanics + puzzle suite (tests.html)
#   2. real requestAnimationFrame loop check (loop.html, driven over CDP)
set -uo pipefail

cd "$(dirname "$0")/.."
SRV_PORT="${REALITY_TEST_PORT:-8137}"
ROOT="$(pwd)"

python3 -m http.server "$SRV_PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT

READY=0
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:$SRV_PORT/src/level.js"; then READY=1; break; fi
  sleep 0.15
done
if [ "$READY" -ne 1 ]; then
  echo "FAIL could not start the local test server on port $SRV_PORT"
  exit 1
fi

fail=0

echo "== deterministic suite (tests.html) =="
OUT=$(chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --window-size=1920,1080 --virtual-time-budget=20000 --dump-dom \
  "http://127.0.0.1:$SRV_PORT/tests/tests.html" 2>/dev/null)

TITLE=$(printf '%s' "$OUT" | sed -n 's:.*<title>\(.*\)</title>.*:\1:p' | head -1)
case "$TITLE" in
  "TESTS PASS"*)
    echo "ok   $TITLE"
    ;;
  *)
    echo "FAIL $TITLE"
    printf '%s' "$OUT" | python3 -c '
import re, sys
h = sys.stdin.read()
m = re.search(r"<pre id=\"out\">(.*?)</pre>", h, re.S)
if m:
    for line in m.group(1).split("\n"):
        if line.startswith("FAIL"):
            print("     " + line)
'
    fail=1
    ;;
esac

echo "== real animation-frame loop (loop.html) =="
LOOP=$(node "$ROOT/tests/cdp.mjs" "http://127.0.0.1:$SRV_PORT/tests/loop.html" 9000 "document.title")
echo "     $LOOP"
if printf '%s' "$LOOP" | grep -q "state=playing" \
  && printf '%s' "$LOOP" | grep -q "moved=true" \
  && printf '%s' "$LOOP" | grep -q "cut=true" \
  && printf '%s' "$LOOP" | grep -q "rewinding=true"; then
  echo "ok   the game runs on real requestAnimationFrame frames"
else
  echo "FAIL the real frame loop did not play the scripted sequence"
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "RESULT: FAIL"
  exit 1
fi
echo "RESULT: PASS"
