#!/usr/bin/env bash
# Builds index.html from src/. Run: ./build.sh
set -e
cd "$(dirname "$0")"
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  echo '<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
  cat src/01-head.html
  echo '</head><body><script>'
  cat src/02-scripts.js src/03-engine.js src/04-ai.js src/05-views.js src/07-v2.js src/09-panel.js src/06-actions.js src/08-v2-actions.js src/10-panel-actions.js
  echo '</script></body></html>'
} > index.html
echo "Built index.html ($(wc -c < index.html) bytes)"
