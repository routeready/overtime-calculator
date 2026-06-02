#!/usr/bin/env python3
"""
Ingest all documents in the /corpus/ directory into the database.

Usage:
    python scripts/ingest_corpus.py
    python scripts/ingest_corpus.py --file corpus/ON_Reg854_MinesMiningPlants.pdf
    python scripts/ingest_corpus.py --province ON --act "Regulation 854"

Supported formats: .pdf, .txt, .md
Files are named with a province prefix: ON_*, BC_*, etc.
"""
import argparse
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import settings
from backend.database import AsyncSessionLocal, engine, Base
from backend.services.ingest import ingest_document, SUPPORTED_EXTENSIONS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

PROVINCE_MAP = {
    "ON": "Ontario",
    "BC": "British Columbia",
    "AB": "Alberta",
    "SK": "Saskatchewan",
    "MB": "Manitoba",
    "QC": "Quebec",
    "NS": "Nova Scotia",
    "NB": "New Brunswick",
    "PE": "Prince Edward Island",
    "NL": "Newfoundland and Labrador",
    "NT": "Northwest Territories",
    "YT": "Yukon",
    "NU": "Nunavut",
}


def _infer_province(filename: str) -> str | None:
    prefix = filename.split("_")[0].upper()
    return PROVINCE_MAP.get(prefix)


async def run(files: list[Path], province: str | None = None, act_name: str | None = None):
    async with AsyncSessionLocal() as db:
        for path in files:
            if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                logger.warning("Skipping unsupported file: %s", path.name)
                continue

            inferred_province = province or _infer_province(path.stem)
            logger.info("Ingesting: %s (province=%s, act=%s)", path.name, inferred_province, act_name)

            doc = await ingest_document(
                db,
                path,
                province=inferred_province,
                act_name=act_name,
            )
            await db.commit()

            if doc.ingestion_status == "complete":
                logger.info("  ✓ %s — %d chunks", path.name, doc.chunk_count)
            else:
                logger.error("  ✗ %s — ERROR: %s", path.name, doc.ingestion_error)


def main():
    parser = argparse.ArgumentParser(description="Ingest regulation documents into Mining Bible")
    parser.add_argument("--file", type=Path, help="Ingest a specific file (default: all in corpus/)")
    parser.add_argument("--province", help="Province code or name (e.g. ON, Ontario)")
    parser.add_argument("--act", dest="act_name", help="Act/regulation name")
    args = parser.parse_args()

    corpus_dir = Path("corpus")
    corpus_dir.mkdir(exist_ok=True)

    if args.file:
        if not args.file.exists():
            logger.error("File not found: %s", args.file)
            sys.exit(1)
        files = [args.file]
    else:
        files = sorted(
            f for f in corpus_dir.iterdir()
            if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
        )
        if not files:
            logger.info("No supported files found in corpus/ directory.")
            logger.info("Drop .pdf, .txt, or .md files into corpus/ and run again.")
            return

    logger.info("Found %d file(s) to ingest", len(files))
    asyncio.run(run(files, province=args.province, act_name=args.act_name))
    logger.info("Done.")


if __name__ == "__main__":
    main()
