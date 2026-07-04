#!/usr/bin/env bash
set -e

echo "=== Installing Node.js dependencies and building React frontend ==="
cd gharkazaiqa
npm install --legacy-peer-deps
npm run build
cd ..

echo "=== Installing Python dependencies ==="
pip install -r backend/requirements.txt

echo "=== Build complete ==="
