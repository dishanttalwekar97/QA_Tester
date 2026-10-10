#!/usr/bin/env bash
# Quick launcher for MERN QA Assessment Platform
set -e

PORT=${PORT:-8000}
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo " 🚀 Launching MERN QA Tester Hiring Assessment Platform"
echo " Stack:        MongoDB + Express + React (SPA) + Node.js"
echo " Target Store: ShopPulse (Seeded with 20 QA Defects)"
echo " Server URL:   http://localhost:$PORT"
echo " Candidate:    http://localhost:$PORT/ (or /brief)"
echo " Evaluator:    http://localhost:$PORT/admin"
echo "=========================================================="

if command -v node >/dev/null 2>&1; then
  node "$DIR/server/server.js"
elif [ -f "$DIR/bin/node" ]; then
  "$DIR/bin/node" "$DIR/server/server.js"
else
  echo "Error: Node.js runtime not found."
  exit 1
fi
