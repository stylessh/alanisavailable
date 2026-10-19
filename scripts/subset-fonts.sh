#!/bin/sh
# Downloads display fonts from Google Fonts with only the characters the
# site actually renders in them (Google's `text=` parameter). Re-run after
# changing the words in src/components/available-for.tsx.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/src/fonts"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"

subset() { # output file, Google Fonts css2 query
  url=$(curl -fsS -A "$UA" "https://fonts.googleapis.com/css2?$2" |
    grep -o 'https://fonts.gstatic.com/[^)]*' | tail -1)
  curl -fsS -o "$1" "$url"
  echo "$1: $(wc -c <"$1" | tr -d ' ') bytes"
}

# "frontend" (the DevTools-inspect word)
subset geist-mono-subset.woff2 "family=Geist+Mono:wght@400&text=frontend"
# "UI engineering" (the pixel word)
subset pixelify-sans-subset.woff2 "family=Pixelify+Sans:wght@600&text=UI%20engineering"

# Superlogical: Rex's terminal font, printable ASCII plus the symbols its
# panes draw (box drawing, bullets, snake board, agent and dev-server marks). Re-run if content.ts gains
# new symbols.
cd "$ROOT/src/products/superlogical/fonts"
REX_TEXT=$(python3 -I -c 'import urllib.parse; print(urllib.parse.quote("".join(chr(c) for c in range(32, 127)) + "─│╭╮╰╯▐▼■●◆└•×…·›✓▲"))')
subset jetbrains-mono-400.woff2 "family=JetBrains+Mono:wght@400&text=$REX_TEXT"
subset jetbrains-mono-700.woff2 "family=JetBrains+Mono:wght@700&text=$REX_TEXT"
