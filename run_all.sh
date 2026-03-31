#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Treasure Hunt Intelligence Harvester ==="
echo "Date: $(date -I)"
echo ""

echo "[1/5] Harvesting Reddit..."
python3 reddit_harvest.py

echo "[2/5] Harvesting YouTube..."
python3 youtube_harvest.py

echo "[3/5] Harvesting Twitter/X..."
python3 twitter_harvest.py

echo "[4/5] Harvesting Web sources..."
python3 web_harvest.py

echo "[5/5] Synthesizing daily briefing..."
python3 synthesize.py

echo ""
echo "=== Done! Check briefings/ for today's report ==="
