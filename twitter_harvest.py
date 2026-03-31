#!/usr/bin/env python3
"""Harvest Twitter/X posts about the Great Canadian Treasure Hunt via Agent-Reach."""

import json
import os
from datetime import date

from agentreach import Twitter


SEARCH_QUERIES = [
    "great canadian treasure hunt",
    "@northernminer treasure",
]

OUTPUT_DIR = "data"


def harvest():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    today = date.today().isoformat()
    output_path = os.path.join(OUTPUT_DIR, f"twitter_{today}.json")

    twitter = Twitter()
    all_results = []

    for query in SEARCH_QUERIES:
        print(f"[twitter] Searching: {query}")
        tweets = twitter.search(query, limit=100)

        for tweet in tweets:
            entry = {
                "query": query,
                "author": tweet.get("author", ""),
                "handle": tweet.get("handle", ""),
                "text": tweet.get("text", ""),
                "url": tweet.get("url", ""),
                "likes": tweet.get("likes", 0),
                "retweets": tweet.get("retweets", 0),
                "replies": tweet.get("replies", 0),
                "created_at": tweet.get("created_at", ""),
            }
            all_results.append(entry)

    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)

    print(f"[twitter] Saved {len(all_results)} tweets to {output_path}")
    return output_path


if __name__ == "__main__":
    harvest()
