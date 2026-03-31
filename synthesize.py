#!/usr/bin/env python3
"""Synthesize daily harvested data into a briefing using Claude API."""

import json
import os
from datetime import date

import anthropic


OUTPUT_DIR = "briefings"
DATA_DIR = "data"
MODEL = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """You are an intelligence analyst for the Great Canadian Treasure Hunt ($1.5M gold prize, run by The Northern Miner magazine).

Context about the hunt:
- The treasure is hidden somewhere in Canada on public land accessible on foot.
- Key poem elements: Shield geology, birch/cedar/pine trees, near water (shore), a weathered old marker, tall grass off-trail, "the compass turns" as final clue.
- Known red herrings: Rocky Mountains, Bay Street Toronto, Big Nickel Sudbury (as destination not region), Flin Flon statue.
- Bonus prizes already found: Dawson City YK, Cobalt ON, Southern BC, Newfoundland.
- Bonus prizes released but unclaimed: BC Golden Triangle.
- Recent bonus: New Brunswick / Bathurst Mining Camp.
- Current leading hypothesis: Cobalt-Temiskaming arc in Northern Ontario.

Your job is to analyze raw scraped data from Reddit, YouTube, Twitter, and web sources, then produce a clean daily intelligence briefing."""

USER_PROMPT_TEMPLATE = """Analyze the following scraped data from today's harvest and produce a daily intelligence briefing.

{data_sections}

Please produce a briefing with these sections:

## Location Theories
Extract ALL unique location theories mentioned across all sources. For each, note the source and any supporting reasoning.

## New Clues & Hints
Flag any new clues, hints, or official releases from The Northern Miner or related sources.

## Top Discussed Locations
Identify the most frequently discussed candidate locations, ranked by mention frequency and community engagement.

## Contrarian & Contradicting Arguments
Surface any arguments that contradict mainstream theories (especially the Cobalt-Temiskaming hypothesis).

## Key Insights & Patterns
Notable patterns, emerging consensus shifts, or interesting analytical observations.

## Source Summary
Brief stats: how many posts/videos/tweets were analyzed, which sources were most active.

Format as clean markdown suitable for daily review."""


def load_data(today):
    """Load all four data files for today."""
    sources = {
        "Reddit": f"reddit_{today}.json",
        "YouTube": f"youtube_{today}.json",
        "Twitter": f"twitter_{today}.json",
        "Web": f"web_{today}.json",
    }

    data_sections = []
    for source_name, filename in sources.items():
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath) as f:
                data = json.load(f)
            data_sections.append(f"### {source_name} Data ({len(data)} items)\n```json\n{json.dumps(data, indent=1, default=str)[:15000]}\n```")
            print(f"[synthesize] Loaded {source_name}: {len(data)} items")
        else:
            print(f"[synthesize] Warning: {filepath} not found, skipping")
            data_sections.append(f"### {source_name} Data\nNo data available.")

    return "\n\n".join(data_sections)


def synthesize():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    today = date.today().isoformat()
    output_path = os.path.join(OUTPUT_DIR, f"{today}.md")

    print(f"[synthesize] Loading data for {today}...")
    data_sections = load_data(today)

    print("[synthesize] Sending to Claude for analysis...")
    client = anthropic.Anthropic()

    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": USER_PROMPT_TEMPLATE.format(data_sections=data_sections),
            }
        ],
    )

    briefing_text = message.content[0].text
    header = f"# Daily Intelligence Briefing — {today}\n\n"

    with open(output_path, "w") as f:
        f.write(header + briefing_text)

    print(f"[synthesize] Briefing saved to {output_path}")
    return output_path


if __name__ == "__main__":
    synthesize()
