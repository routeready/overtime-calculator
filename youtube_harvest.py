#!/usr/bin/env python3
"""Harvest YouTube video transcripts about the Great Canadian Treasure Hunt."""

import json
import os
import subprocess
from datetime import date


SEARCH_QUERIES = [
    "great canadian treasure hunt",
    "northern miner gold poem",
]

OUTPUT_DIR = "data"
MAX_RESULTS_PER_QUERY = 20


def search_videos(query, max_results):
    """Use yt-dlp to search YouTube and return video metadata."""
    cmd = [
        "yt-dlp",
        f"ytsearch{max_results}:{query}",
        "--dump-json",
        "--no-download",
        "--flat-playlist",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    videos = []
    for line in result.stdout.strip().split("\n"):
        if line:
            try:
                videos.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return videos


def get_transcript(video_id):
    """Use yt-dlp to download auto-generated subtitles as transcript."""
    cmd = [
        "yt-dlp",
        f"https://www.youtube.com/watch?v={video_id}",
        "--write-auto-sub",
        "--sub-lang", "en",
        "--skip-download",
        "--sub-format", "json3",
        "-o", f"/tmp/yt_{video_id}",
    ]
    subprocess.run(cmd, capture_output=True, text=True)

    sub_path = f"/tmp/yt_{video_id}.en.json3"
    if not os.path.exists(sub_path):
        return ""

    with open(sub_path) as f:
        try:
            subs = json.load(f)
        except json.JSONDecodeError:
            return ""

    segments = subs.get("events", [])
    text_parts = []
    for seg in segments:
        for s in seg.get("segs", []):
            text = s.get("utf8", "")
            if text.strip():
                text_parts.append(text.strip())

    os.remove(sub_path)
    return " ".join(text_parts)


def harvest():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    today = date.today().isoformat()
    output_path = os.path.join(OUTPUT_DIR, f"youtube_{today}.json")

    all_results = []

    for query in SEARCH_QUERIES:
        print(f"[youtube] Searching: {query}")
        videos = search_videos(query, MAX_RESULTS_PER_QUERY)

        for video in videos:
            video_id = video.get("id", "")
            title = video.get("title", "")
            print(f"[youtube] Processing: {title}")

            transcript = get_transcript(video_id)

            entry = {
                "query": query,
                "video_id": video_id,
                "title": title,
                "channel": video.get("channel", video.get("uploader", "")),
                "url": video.get("url", f"https://www.youtube.com/watch?v={video_id}"),
                "duration": video.get("duration", 0),
                "view_count": video.get("view_count", 0),
                "upload_date": video.get("upload_date", ""),
                "description": video.get("description", ""),
                "transcript": transcript,
            }
            all_results.append(entry)

    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)

    print(f"[youtube] Saved {len(all_results)} videos to {output_path}")
    return output_path


if __name__ == "__main__":
    harvest()
