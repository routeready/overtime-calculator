#!/usr/bin/env python3
"""Harvest Reddit posts and comments about the Great Canadian Treasure Hunt."""

import json
import os
from datetime import date

from agentreach import Reddit


SEARCH_QUERIES = [
    "great canadian treasure hunt",
    "northern miner treasure",
    "treasure hunt poem",
]

OUTPUT_DIR = "data"


def harvest():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    today = date.today().isoformat()
    output_path = os.path.join(OUTPUT_DIR, f"reddit_{today}.json")

    reddit = Reddit()
    all_results = []

    for query in SEARCH_QUERIES:
        print(f"[reddit] Searching: {query}")
        posts = reddit.search(query, limit=50)

        for post in posts:
            entry = {
                "query": query,
                "subreddit": post.get("subreddit", ""),
                "title": post.get("title", ""),
                "body": post.get("selftext", ""),
                "url": post.get("url", ""),
                "score": post.get("score", 0),
                "num_comments": post.get("num_comments", 0),
                "created_utc": post.get("created_utc", ""),
                "author": post.get("author", ""),
                "top_comments": [],
            }

            comments = post.get("comments", [])
            for comment in comments[:10]:
                entry["top_comments"].append({
                    "author": comment.get("author", ""),
                    "body": comment.get("body", ""),
                    "score": comment.get("score", 0),
                })

            all_results.append(entry)

    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)

    print(f"[reddit] Saved {len(all_results)} posts to {output_path}")
    return output_path


if __name__ == "__main__":
    harvest()
