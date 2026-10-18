#!/bin/sh
# Downloads display fonts from Google Fonts with only the characters the
# site actually renders in them (Google's `text=` parameter). Re-run after
# changing the words in src/components/available-for.tsx.
set -eu
cd "$(dirname "$0")/../src/fonts"
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
