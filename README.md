# Ramayana Guide

Describe a problem from your life; get guidance grounded in the **Valmiki Ramayana** — the Sanskrit shloka,
its transliteration and word-by-word meaning, the story context, and practical steps.

An advanced RAG (retrieval-augmented generation) application: **React** frontend, **Express** API,
**MongoDB Atlas** (Vector Search + Atlas Search) for hybrid search.

## Architecture

```
frontend (React + Vite) ──SSE──▶ backend (Express)
                                   │
        ┌──────────────────────────┴───────────────────────────┐
        │ 1. Query transformation   rewrite into epic themes   │  LLM
        │    + HyDE                 hypothetical passage       │
        │ 2. Hybrid search          dense (Atlas Vector Search)│  MongoDB
        │                           + sparse (Atlas Search)    │
        │                           fused with RRF             │
        │ 3. Reranking              cross-encoder (Cohere)     │  optional
        │ 4. Corrective RAG         grade passages; if weak,   │  LLM
        │                           step-back query + re-search│
        │ 5. Grounded generation    streamed, cites verses     │  LLM
        └──────────────────────────────────────────────────────┘
```

| Technique | Where | Why |
|---|---|---|
| Structure-aware chunking | `backend/scripts/ingest/2-parse.js` | Chunks are runs of whole verses within one sarga; a shloka is never split from its translation |
| Contextual chunk headers | `scripts/ingest/3-embed-load.js` | Kanda, sarga and sarga summary are embedded with each chunk |
| Query rewriting + HyDE | `src/services/retrieval/queryTransform.js` | "I was passed over for promotion" shares no words with the epic; the query is restated as its theme and a hypothetical passage is embedded |
| Hybrid search + RRF | `src/services/retrieval/hybridSearch.js`, `fusion.js` | Dense finds meaning, BM25 finds names and exact terms; rank fusion (done in the API, so it works on the free M0 tier) needs no score calibration |
| Reranking | `src/services/retrieval/reranker.js` | Cross-encoder precision on the fused candidates |
| Corrective RAG (CRAG) | `src/services/retrieval/grader.js`, `src/services/rag/pipeline.js` | Passages are graded; weak retrieval triggers a step-back search, and if nothing relevant is found the answer says so instead of inventing a verse |
| Streaming | `src/controllers/chat.controller.js` | Server-Sent Events: pipeline stages, sources, then tokens |

### Backend layout

```
backend/
  src/
    config/         env validation (zod), logger
    db/             MongoDB client, search index definitions
    routes/         → controllers/ → services/ → repositories/
    middlewares/    validation, rate limiting, error handling
    schemas/        request schemas
    services/
      llm/          OpenAI-compatible client (Gemini, Groq, …)
      embedding/    local ONNX model or API
      retrieval/    query transform, hybrid search, fusion, reranker, grader
      rag/          pipeline + prompts
  scripts/ingest/   1-extract → 2-parse → 3-embed-load
  tests/
```

### Ingestion

The source is the Gita Press edition (Sanskrit with English translation), typeset in legacy non-Unicode fonts.
The pipeline decodes them: Chanakya glyph codes → Unicode Devanagari (`lib/chanakya.js`), Nalanda → IAST
(`lib/nalanda.js`), then rebuilds reading order from the two-column layout and aligns each shloka with its
translation and verse number. Result: 644 of 647 sargas, ~4,150 chunks.

## Run locally

Requires Node 20+ and a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (M0). In Atlas, allow
your IP under Network Access.

```bash
# 1. Backend
cd backend
cp .env.example .env            # add MONGODB_URI and LLM_API_KEY (free: https://aistudio.google.com/apikey)
npm install
# put Valmiki_Ramayana.pdf in backend/data/raw/, then:
npm run ingest                  # extract → parse → embed + load into Atlas (~5 min)
npm run dev                     # http://localhost:8080

# 2. Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev                     # http://localhost:5173
```

`npm test` in `backend/` runs the unit tests.

### API

| Method | Path | |
|---|---|---|
| `POST` | `/api/v1/chat` | `{ message, history? }` → SSE stream (`stage`, `sources`, `token`, `done`, `error`) |
| `POST` | `/api/v1/search` | `{ query, limit? }` → retrieval only, with per-retriever ranks |
| `GET` | `/api/v1/health` | index size and configuration status |

## Deploy (free tier)

1. **Database — MongoDB Atlas**: the same M0 cluster used locally. Under Network Access allow `0.0.0.0/0`
   so Render can connect (its free instances have no fixed IP).
2. **API — [Render](https://render.com)**: New → Blueprint → this repo (`render.yaml`). Set `MONGODB_URI`,
   `LLM_API_KEY`, `CORS_ORIGIN` (your frontend URL) and optionally `COHERE_API_KEY`.
3. **Frontend — [Vercel](https://vercel.com)**: import the repo, root directory `frontend`,
   env `VITE_API_URL=https://<your-render-app>.onrender.com/api/v1`.

Notes: Render's free instance sleeps when idle, so the first request after a pause takes ~1 minute.
The embedding model runs in-process (~250 MB RAM); if the 512 MB instance runs out of memory, switch to
`EMBEDDING_PROVIDER=api` and re-run `ingest:load` with the same setting.

### Cold starts and cost control

- **Cold start**: the frontend pings `/api/v1/health` on load, which starts the wake-up, and shows a notice until the
  API answers. To avoid the sleep altogether, point a free uptime monitor (e.g. UptimeRobot) at the health URL every
  10 minutes.
- **Usage limits**: every question costs LLM tokens, so `/chat` is limited three ways — per minute per IP (in memory),
  per day per visitor (`DAILY_QUESTIONS_PER_VISITOR`, default 5) and per day for the whole site
  (`DAILY_QUESTIONS_SITE_WIDE`, default 200). Daily counters live in MongoDB keyed by a hash of the IP and expire on
  their own. Set a monthly budget with your LLM provider as the final backstop.

## Configuration

See [`backend/.env.example`](backend/.env.example). The LLM is any OpenAI-compatible endpoint
(`LLM_BASE_URL`, `LLM_MODEL`), so Gemini, Groq or another provider can be swapped without code changes.

## Disclaimer

Guidance is generated by an AI from scripture and is not a substitute for professional medical, legal or
mental-health advice. The source translation is © Gita Press; the PDF and derived data are not part of this
repository.
