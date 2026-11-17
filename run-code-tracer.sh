#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

CODETRACER_PORT="${CODETRACER_PORT:-4280}"
export CODETRACER_PORT

if [ ! -d "node_modules" ]; then
  echo "[Code Tracer] Instalando dependencias npm..."
  npm install
fi

if [ ! -f "dist/code-tracer/browser/index.html" ] && [ ! -f "dist/code-tracer/index.html" ]; then
  echo "[Code Tracer] Compilando aplicación Angular..."
  npm run build
fi

if [ "${1:-}" = "--setup-only" ]; then
  echo "[Code Tracer] Build Angular listo."
  exit 0
fi

(
  for _ in $(seq 1 30); do
    if node -e "const n=require('net');const s=n.connect(Number(process.env.CODETRACER_PORT||4280),'127.0.0.1',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));" 2>/dev/null; then
      if command -v xdg-open >/dev/null 2>&1 && [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
        xdg-open "http://127.0.0.1:${CODETRACER_PORT}" >/dev/null 2>&1 || true
      fi
      break
    fi
    sleep 0.5
  done
) >/dev/null 2>&1 &

exec node serve-code-tracer.mjs
