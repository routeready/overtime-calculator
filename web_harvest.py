#!/usr/bin/env python3
"""Harvest web pages from sources.txt using Jina Reader via Agent-Reach."""

import json
import os
from datetime import date

from agentreach import JinaReader


SOURCES_FILE = "sources.txt"
OUTPUT_DIR = "data"


def harvest():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    today = date.today().isoformat()
    output_path = os.path.join(OUTPUT_DIR, f"web_{today}.json")

    if not os.path.exists(SOURCES_FILE):
        print(f"[web] Error: {SOURCES_FILE} not found")
        return None

    with open(SOURCES_FILE) as f:
        urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]

    reader = JinaReader()
    all_results = []

    for url in urls:
        print(f"[web] Fetching: {url}")
        try:
            content = reader.read(url)
            entry = {
                "url": url,
                "title": content.get("title", ""),
                "text": content.get("text", ""),
                "fetched_at": today,
            }
            all_results.append(entry)
        except Exception as e:
            print(f"[web] Error fetching {url}: {e}")
            all_results.append({
                "url": url,
                "error": str(e),
                "fetched_at": today,
            })

    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)

    print(f"[web] Saved {len(all_results)} pages to {output_path}")
    return output_path


if __name__ == "__main__":
    harvest()
