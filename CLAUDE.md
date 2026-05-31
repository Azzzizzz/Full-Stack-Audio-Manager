# CLAUDE.md

Guidance for working in this repository.

## Project
**Meeami Full-Stack Audio Manager** — authenticated audio upload / list / playback.
Users register and log in (JWT), upload audio to AWS S3, browse their own files
(paginated), and play them inline. Only metadata + S3 references live in MongoDB; the
audio bytes live in S3.

- Spec (source of truth): `tasks/assignment.md`
- Design authority (decisions + ASCII flow diagrams): `tasks/my-approach-plan.md`
- Task list (build order + acceptance criteria + checkpoints): `tasks/todo.md`

## Stack
- **Backend:** Python 3.12 · FastAPI · Beanie (MongoDB ODM) · boto3 (S3) ·
  python-jose (JWT HS256) · passlib[bcrypt] · SlowAPI (rate limit) · mutagen (duration)
- **Frontend:** React + TypeScript + Vite · React Router · Zustand (`persist`) ·
  React Hook Form + Zod · axios · Tailwind + shadcn/ui
- **Infra:** Docker + Docker Compose (local) · MongoDB (container local / Atlas prod) · AWS S3
- **Deploy:** Vercel (frontend) · Render (backend) · MongoDB Atlas (prod DB)

## Architecture
Layered backend: **router → service → repository → Beanie model**.
- `routers/` — thin HTTP I/O only
- `services/` — business logic, ownership checks, S3 orchestration
- `repositories/` — all Mongo access (no Beanie calls outside repositories)

## Conventions (do not drift)
- **Exact spec route paths**, no `/api/v1` prefix: `POST /register`, `POST /login`,
  `GET /audio`, `GET /audio/{id}/play`, `POST /audio/upload`, `DELETE /audio/{id}`, `GET /health`
- **snake_case** DB fields (`first_name`, `user_id`, `file_type`, `file_name`, `file_metadata`)
- Files store **`bucket` + `key`**, never a persisted `file_url`; `file_url` is presigned at read time
- Private S3 bucket; presigned GET (~60 min in list, ~15 min in play); **backend-proxied multipart upload**
- JWT **HS256**, shared secret, 60-min TTL, no refresh token
- `GET /audio` is **paginated**: `?limit&offset` → `{ items, total, limit, offset }` (offset-based, newest-first)
- Response envelope: `{ success, data }` / `{ success, message, code }`
- `register` / `login` / `health` are public; all `/audio*` are JWT-protected (documented exception)
- Frontend token in Zustand `persist` → localStorage; route guard waits on `hasHydrated`
  so a **refresh does NOT log the user out**
- Config is 100% env-driven (pydantic-settings); secrets are never committed

## Target structure
```
backend/app/{routers,services,repositories,models,schemas,core}/ + main.py
frontend/src/{pages,components,layouts,services,stores,routes,types,lib}/
docs/{db-model,architecture,aws-setup,deployment}.md
docker-compose.yml · README.md · .env.example
```

## Commands (filled in as the build progresses)
- Backend (from `backend/`): `uvicorn app.main:app --reload`
- Frontend (from `frontend/`): `npm run dev`
- Tests: `pytest` (backend) · `npm test` (frontend)
- Full local stack: `docker compose up`

## Git / commit conventions
- **Atomic commits** — one logical change per commit, building from the initial commit.
- **No Claude attribution** — do NOT add `Co-Authored-By: Claude` or
  `🤖 Generated with Claude Code` trailers. Commits are authored by the repo owner only.
- Imperative, conventional messages (e.g. `Add S3 storage service`, `Fix refresh logout race`).
- Never commit secrets (`.env`), virtualenvs, `node_modules`, or build artifacts.

## Workflow
Work through `tasks/todo.md` in order. Each task must leave the system runnable. Verify at
the checkpoints (A–G) before moving to the next phase.
