# Treasure Hunt Intelligence Scraper

Multi-platform intelligence scraper for the **Great Canadian Treasure Hunt** ($1.5M gold prize, run by The Northern Miner). Harvests community theories, new clues, and location discussions from across the internet and synthesizes them into a daily briefing.

## Architecture

```
reddit_harvest.py    → data/reddit_YYYY-MM-DD.json
youtube_harvest.py   → data/youtube_YYYY-MM-DD.json
twitter_harvest.py   → data/twitter_YYYY-MM-DD.json
web_harvest.py       → data/web_YYYY-MM-DD.json
                           ↓
synthesize.py        → briefings/YYYY-MM-DD.md
```

## Modules

| Module | Source | Method |
|--------|--------|--------|
| `reddit_harvest.py` | Reddit (all subreddits) | Agent-Reach Reddit API — searches for treasure hunt discussions, extracts posts + top comments |
| `youtube_harvest.py` | YouTube | yt-dlp — searches for videos, extracts auto-generated transcripts |
| `twitter_harvest.py` | Twitter/X | Agent-Reach Twitter (cookie auth via xreach CLI) — searches for tweets and engagement |
| `web_harvest.py` | Web pages | Agent-Reach Jina Reader — fetches and cleans text from URLs listed in `sources.txt` |
| `synthesize.py` | All of the above | Claude API (claude-sonnet-4-20250514) — analyzes all data and produces a daily markdown briefing |

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Install Agent-Reach data layer
agent-reach install

# Set up Twitter auth (required for twitter_harvest.py)
# Follow Agent-Reach xreach CLI setup for cookie auth

# Set Anthropic API key (required for synthesize.py)
export ANTHROPIC_API_KEY="your-key-here"
```

## Usage

Run all harvesters and generate the daily briefing:

```bash
./run_all.sh
```

Or run individual modules:

```bash
python3 reddit_harvest.py
python3 youtube_harvest.py
python3 twitter_harvest.py
python3 web_harvest.py
python3 synthesize.py
```

## Output

- `data/` — Raw JSON harvests (gitignored, local only)
- `briefings/` — Daily markdown briefings (gitignored, local only)

## Target Host

Designed to run on Mac Mini (hostname: therobotmachine, IP: 192.168.2.252).
