#!/usr/bin/env bash
# Quick launcher for QA Assessment Platform
set -e

PORT=${PORT:-8000}
echo "=========================================================="
echo " Starting QA Tester Hiring Assessment Platform"
echo " Target Store: ShopPulse (Seeded with 20 QA Defects)"
echo " Server URL:   http://localhost:$PORT"
echo " Candidate Onboarding: http://localhost:$PORT/brief"
echo " Evaluator Dashboard:  http://localhost:$PORT/admin"
echo "=========================================================="

python3 app.py
