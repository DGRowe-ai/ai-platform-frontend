# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

LokiAI is a multi-tenant SaaS platform for branded AI customer-support chatbots. This repo (`ai-platform-frontend`) contains the **frontend** (vanilla HTML/JS + Vite). The **backend** is a separate FastAPI app (`DGRowe-ai/ai-platform-backend`); the `backend/` path in this repo is an empty git submodule placeholder with no `.gitmodules` URL.

### One-time backend setup (not in update script)

If `backend/` is empty, clone the backend before running the API locally:

```bash
git clone --depth 1 -b backend https://github.com/DGRowe-ai/ai-platform-backend.git backend
pip install -r backend/requirements.txt
sudo mkdir -p /var/data
sudo cp backend/platform.db /var/data/database.db
sudo chmod 777 /var/data
sudo chmod 666 /var/data/database.db
```

The backend branch uses `sqlite:////var/data/database.db` (see `backend/database.py`). Without `/var/data` and a writable DB file, Uvicorn will fail on startup.

### Services

| Service | Command | URL |
|---------|---------|-----|
| Frontend (Vite) | `cd frontend && npm run dev -- --host 0.0.0.0 --port 3000` | http://localhost:3000 |
| Backend (FastAPI) | `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000` | http://localhost:8000 |

**Use port 3000 for Vite**, not the default 5173. Backend CORS only allows `localhost:3000` and `localhost:5500`.

### Lint / test / build

There are no project-level lint or test scripts. Use:

- **Build:** `cd frontend && npm run build`
- **Preview production build:** `cd frontend && npm run preview`

### API URLs and environments

Most frontend files hardcode `https://ai-platform-backend-uaaa.onrender.com` (currently **down**). A working hosted backend is `https://ai-platform-backend-ulqs.onrender.com` (used in `index.js`, `chat.html`, some admin pages).

For local full-stack development, point `API_URL` at `http://localhost:8000` across frontend files, or use pages that already target the `ulqs` host.

### Required secrets (local backend chat)

- `OPENAI_API_KEY` — required for `/business/chat` AI responses
- `SECRET_KEY` — JWT signing (has a dev fallback in code)

Optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, SMTP variables.

### Key entry points

| Page | Purpose |
|------|---------|
| `frontend/index.html` | Widget demo (iframe) |
| `frontend/chat.html?b=<business_id>` | Standalone public chat |
| `frontend/login.html` / `register.html` | Auth |
| `frontend/dashboard/index.html` | Business owner dashboard |
| `frontend/admin.html` | Admin panel |

### Gotchas

- `node_modules` may contain Windows-native bindings if copied from another OS; run `npm install` inside `frontend/` on Linux.
- `backend/` submodule cannot be initialized via `git submodule update` (no `.gitmodules` URL); clone manually as above.
- Local backend sample business folder: `my_biz` (in cloned backend repo under `businesses/`).
- Remote demo business id for hosted API: `rowe_ai`.
