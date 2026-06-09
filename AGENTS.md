# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

LokiAI is a multi-tenant SaaS platform for embedding branded AI chatbots on business websites. This repo contains the **frontend only** (vanilla HTML/JS/CSS served by Vite). The FastAPI backend lives in a separate repo: [DGRowe-ai/ai-platform-backend](https://github.com/DGRowe-ai/ai-platform-backend). The `backend/` directory in this repo is empty (submodule not initialized).

### Services

| Service | Port | Start command |
|---|---|---|
| Frontend (Vite) | 5173 | `cd frontend && npm run dev -- --host 0.0.0.0 --port 5173` |
| Backend (FastAPI, optional local) | 8000 | Clone backend repo, `pip install -r requirements.txt`, `uvicorn main:app --host 0.0.0.0 --port 8000` |

Use **tmux** for long-running dev servers (see cloud agent tooling conventions).

### Frontend commands

All commands run from `frontend/`:

- **Install deps:** `npm install` (required on Linux — committed `node_modules` contains Windows native bindings)
- **Dev server:** `npm run dev`
- **Production build:** `npm run build`
- **Preview build:** `npm run preview`

There are **no project-level lint or test scripts**. Do not run lint/test in `node_modules`.

### Backend (local, optional)

1. `git clone https://github.com/DGRowe-ai/ai-platform-backend.git` (outside or into `backend/`)
2. `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
3. Create `../businesses/template/` with `profile.json`, `settings.json`, and `knowledge.txt`
4. Set `OPENAI_API_KEY` in a `.env` file (required — backend crashes on startup without it)
5. Run from the backend directory so `../businesses/` and `../platform.db` resolve correctly

`platform.db` at the repo root is an empty SQLite schema (0 rows).

### API URL gotcha (important)

Frontend files hardcode backend URLs to Render deployments:

- **`uaaa`** (`https://ai-platform-backend-uaaa.onrender.com`) — used by most pages; currently returns **404**
- **`ulqs`** (`https://ai-platform-backend-ulqs.onrender.com`) — live; used by `chat.html`, `index.js`, and `admin/businesses.html`

When testing chat from the browser on `localhost:5173`, the `ulqs` backend may block requests due to **CORS** (OPTIONS preflight returns 400). Workarounds for manual testing (do not commit unless asked):

- Run a temporary CORS proxy under `/tmp` forwarding to `ulqs`
- Or point frontend `API_URL` values at a local backend on port 8000

### Hello-world smoke test

1. Start the Vite dev server (port 5173)
2. Open `http://localhost:5173/chat.html?b=rowe_ai`
3. Send a message and confirm a bot reply appears

If CORS blocks the browser request, verify the API directly:

```bash
curl -X POST https://ai-platform-backend-ulqs.onrender.com/business/chat \
  -H "Content-Type: application/json" \
  -d '{"business_id":"rowe_ai","message":"Hello"}'
```

### System dependencies

- **Node.js** v22+ and **npm** (for frontend)
- **Python 3.12** with `python3.12-venv` apt package (for local backend only)
