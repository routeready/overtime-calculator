# Mining Bible — Claude Code Instructions

## What this project is
A RAG-powered regulatory Q&A platform. Users ask questions about Canadian mining
health and safety regulations and receive precise, cited answers drawn from the
actual regulation text.

## Critical accuracy requirement
This is a compliance-grade tool. Answers must be grounded in retrieved chunks only.
Claude MUST NOT answer from training knowledge alone when a corpus is loaded.
Always pass retrieved chunks as context. If no relevant chunks are found, say so
explicitly rather than guessing.

## Stack
- Backend: FastAPI + Python, PostgreSQL + pgvector, JWT auth
- Frontend: React + Vite
- Embeddings: Voyage AI, model voyage-law-2 (1024-dimensional vectors)
- Answer model: Claude (CLAUDE_MODEL env var, default claude-opus-4-8)
- Payments: Stripe
- Host: Mac Mini via launchd, Cloudflare tunnel to mineready.io

## Ports
- This app: 8001 (do not use 8000 — occupied by Tool 4)

## Environment
- All secrets in .env — never hardcode
- Config loaded via pydantic-settings in config.py
- launchd plists in /launchd/ — update if new services added

## Database
- PostgreSQL via OrbStack
- pgvector extension required: CREATE EXTENSION IF NOT EXISTS vector;
- The chunk embedding column is vector(1024) to match voyage-law-2
- Run migrations with Alembic

## Document ingestion
- Drop files into /corpus/
- Run: python scripts/ingest_corpus.py
- Supported formats: PDF (pdfplumber), .txt, .md
- Chunking must preserve section numbers — these are the citations

## Users and roles
- role "admin" — full access including admin panel, document management
- role "user" — Q&A access only, gated by active subscription
- Subscription status checked on every /ask request

## Key design decisions
- Hybrid retrieval: run keyword (FTS) search AND semantic search, merge the
  candidates, re-rank by embedding similarity, send top-k to Claude
- Never fall back to training data — if the corpus has no relevant sections,
  return the no-corpus message
- Section numbers must survive chunking — they are the citation source
- Chunk metadata: {province, act_name, section_number, section_title, text, source_file}
- Answer format enforced via system prompt: ANSWER / CITATION / NOTE structure

## Reg monitoring (FUTURE)
- Scaffold monitor.py and monitor_worker.py but do not build yet
- Leave clear TODO comments for the monitoring feature
- When built: monitor CanLII for Ontario Reg. 854 changes, diff against stored
  chunks, email + dashboard alert to admin, admin approves, re-ingest updated sections

## Do not
- Do not answer regulatory questions from training data when corpus is loaded
- Do not use port 8000
- Do not use Docker (use OrbStack if containers needed, launchd for process management)
- Do not build OpenAI or Ollama embedding paths — Voyage only
- Do not build the reg monitoring feature yet — scaffold only
