# Task List: Meeami Full-Stack Audio Manager

Stack: Python/FastAPI (layered router→service→repository) · MongoDB/Beanie · AWS S3 (boto3)
· React + Vite + **TypeScript** + **Zustand** + React Hook Form + Zod + shadcn/ui · Docker Compose
Design authority: `my-approach-plan.md`. Spec: `assignment.md`. Each task leaves the system runnable.

## Dependency Graph (build order)
```
Config/env  ─┐
MongoDB conn ─┼─► User model ─► UserRepository ─► hashing+JWT(HS256) ─► /register,/login ─► auth dep ─┐
             │                                                                                        │
             └─► File model ─► FileRepository ──────────────────────────────────────► GET /audio (paginated)
                                   │                                                                  │
                       S3 (StorageService) ─► POST /audio/upload ─► /audio/{id}/play ─► DELETE /audio/{id} ◄┘
                                                       │
React+TS scaffold ─► Zustand auth + protected routes ─► Register/Login UI ─► Audio List UI (paginated) ─► Upload UI
                                                                     │
                                              Dockerfiles + compose + seed
                                                                     │
                              live deploy (Atlas/S3 → Render → Vercel) ─► ERD + arch diagram + README
```

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Reviewer lacks AWS credentials → can't run locally | High | Live Vercel URL works with no setup; README documents env + IAM for local runs; keep `S3_ENDPOINT_URL` override as local-S3 fallback. |
| Private bucket / presigned URL misconfig | Med | Test presigned GET in browser at Checkpoint C; sane TTL; S3 bucket CORS for `<audio>` from **both** localhost and the Vercel origin. |
| CORS between React and API | Med | FastAPI CORSMiddleware, explicit origins from env: localhost:5173 (local) + Vercel domain (prod). |
| Render free-tier cold start (~50s after idle) | Med | Document in README; optional lightweight keep-alive ping. |
| Atlas / Render secrets management | Med | AWS keys, `JWT_SECRET`, `MONGO_URI` set in Render + Vercel dashboards (never committed); `.env.example` lists all vars. |
| Large audio uploads / timeouts | Low | Body-size limit (50 MB); stream to S3; document max size. |
| Audio duration extraction | Low | Best-effort via mutagen — never blocks upload. |
| `created_at/updated_at` consistency | Low | Centralize timestamps in Beanie model hooks. |
| Offset pagination shifts items after delete | Low | Refresh current page after delete (already in T10). |

---

## Phase 1 — Foundation

### Task 1: Backend skeleton + config + health + hardening
**Description:** Create the repo layout and a minimal runnable FastAPI app with env-driven settings, layered package structure, security headers, and rate limiting.
**Acceptance criteria:**
- [ ] Layered package layout: `routers/`, `services/`, `repositories/`, `models/`, `schemas/`, `core/`
- [ ] `pydantic-settings` loads config from env/`.env` (`MONGO_URI`, `JWT_SECRET`, S3 vars, `CORS_ORIGINS`)
- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] Security-headers middleware (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP)
- [ ] SlowAPI rate limiter wired (global default; tighter on login/upload added with those routes)
**Verification:**
- [ ] `uvicorn app.main:app` starts; `curl /health` → 200; response carries security headers
**Dependencies:** None
**Files:** `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/core/middleware.py`, `backend/requirements.txt`, `backend/.env.example`
**Scope:** M

### Task 2: MongoDB connection + User & File models
**Description:** Initialize Beanie/Motor on startup and define the two document models per spec.
**Acceptance criteria:**
- [ ] Beanie initializes against `MONGO_URI` on app startup (lifespan), with graceful error if down
- [ ] `User` doc: first_name, last_name, email (unique index), hashed_password, created_at, updated_at
- [ ] `File` doc: user_id (indexed), file_type, file_name, **bucket, key** (NOT a persisted file_url), file_metadata{duration,size}, created_at, updated_at
- [ ] `file_url` is **computed at read time** (presigned from bucket+key), never stored
- [ ] Timestamps auto-set on insert/update
**Verification:**
- [ ] App starts and connects to a local Mongo; inserting a test doc persists and round-trips
**Dependencies:** Task 1
**Files:** `backend/app/core/db.py`, `backend/app/models/user.py`, `backend/app/models/file.py`
**Scope:** M

### Task 3: React + Vite + TypeScript scaffold
**Description:** Bootstrap the frontend (TS) with routing, axios, Zustand, Tailwind/shadcn, and base layout.
**Acceptance criteria:**
- [ ] Vite React+**TypeScript** app runs; routes registered for `/register`, `/login`, `/audio`, `/upload`
- [ ] Tailwind + shadcn/ui configured; base layout renders
- [ ] Central axios instance reads API base URL from `VITE_API_URL`
- [ ] Folder structure: `src/{pages,components,layouts,services,stores,routes,types,lib}`
- [ ] Placeholder pages render per route
**Verification:**
- [ ] `npm run dev` serves; navigating routes shows correct placeholder
**Dependencies:** None (parallelizable with 1–2)
**Files:** `frontend/` (Vite TS scaffold), `frontend/src/services/client.ts`, `frontend/src/routes/router.tsx`
**Scope:** M

### ☑ Checkpoint A — Foundation
- [ ] Backend serves `/health`; connects to Mongo on startup
- [ ] Frontend routes render
- [ ] Review before proceeding

---

## Phase 2 — Auth (vertical slice)

### Task 4: Hashing + JWT utils + auth dependency + UserRepository
**Description:** Password hashing, JWT (HS256) encode/decode, the `get_current_user` dependency, and the user data-access layer.
**Acceptance criteria:**
- [ ] bcrypt hash + verify helpers
- [ ] `create_access_token` (sub=user id, exp=TTL, **HS256**) + decode/verify
- [ ] `get_current_user` dependency returns the User or raises 401
- [ ] `UserRepository` (create, find_by_id, find_by_email, exists_by_email) — services never touch Beanie directly
**Verification:**
- [ ] Unit test: hash/verify round-trips; valid token resolves a user; tampered/expired token → 401
**Dependencies:** Task 2
**Files:** `backend/app/core/security.py`, `backend/app/core/deps.py`, `backend/app/repositories/user_repository.py`, `backend/tests/test_security.py`
**Scope:** M

### Task 5: /register and /login endpoints
**Description:** User creation and JWT issuance.
**Acceptance criteria:**
- [ ] `POST /register` validates email uniqueness, hashes password, returns created user (no hash)
- [ ] `POST /login` accepts email+password, returns `{access_token, token_type}` on success
- [ ] Wrong credentials → 401; duplicate email → 409
- [ ] Rate limits applied: tighter on `/login` and `/register` (brute-force protection)
**Verification:**
- [ ] API test: register → login → receive decodable JWT; failure paths return correct codes
**Dependencies:** Task 4
**Files:** `backend/app/routers/auth.py`, `backend/app/services/auth_service.py`, `backend/app/schemas/auth.py`, `backend/tests/test_auth.py`
**Scope:** M

### Task 6: Login screen + Zustand auth store + protected routes
**Description:** Login form (RHF+Zod), JWT persistence in a Zustand store, axios interceptors, and the route guard.
**Acceptance criteria:**
- [ ] Login form (email, password) via RHF+Zod calls `/login`; on success stores JWT in a **Zustand** store persisted to **localStorage** (`persist` middleware)
- [ ] **Refresh keeps the user logged in:** store rehydrates the token from localStorage on app load; the guard waits on a `hasHydrated` flag and shows a brief loader instead of redirecting while rehydrating (no false logout on refresh)
- [ ] axios interceptors: request attaches `Authorization: Bearer`; a 401 response logs out + redirects to `/login`
- [ ] Protected routes redirect to `/login` only when, after hydration, the JWT is missing or expired
**Verification:**
- [ ] Manual: log in → **hard-refresh on `/audio` stays logged in** (no bounce to login); deep-link to `/audio` in a new tab stays in; clear token / let it expire → redirected to `/login`
**Dependencies:** Task 5, Task 3
**Files:** `frontend/src/pages/Login.tsx`, `frontend/src/stores/auth.ts`, `frontend/src/services/client.ts` (interceptors), `frontend/src/routes/ProtectedRoute.tsx`
**Scope:** M

### Task 6b: Register screen
**Description:** Signup form wired to `POST /register`, linked from the Login screen.
**Acceptance criteria:**
- [ ] Register form (first_name, last_name, email, password) via RHF+Zod calls `/register`
- [ ] On success → redirect to `/login` (or auto-login); a duplicate email surfaces the 409 error
- [ ] Login ↔ Register cross-links
**Verification:**
- [ ] Manual: register a new user → log in with those creds → reach `/audio`
**Dependencies:** Task 5, Task 6
**Files:** `frontend/src/pages/Register.tsx`
**Scope:** S

### ☑ Checkpoint B — Auth
- [ ] Register + login via API issue a working JWT; protected stub returns 401 without token
- [ ] Frontend redirects unauthenticated users to login
- [ ] Review before proceeding

---

## Phase 3 — Audio backend

### Task 7: S3 service module
**Description:** Wrap boto3 for upload + presigned URL generation, env-driven with endpoint override.
**Acceptance criteria:**
- [ ] S3 client built from env (region, keys, bucket, optional `S3_ENDPOINT_URL`)
- [ ] `upload_fileobj(file, key, content_type)` puts object to private bucket
- [ ] `generate_presigned_get(key, ttl)` returns a time-limited GET URL (used for both list ~60m and play ~15m)
- [ ] `delete_object(key)` removes an object
**Verification:**
- [ ] Integration (against real bucket or local S3): upload object, fetch presigned URL → 200
**Dependencies:** Task 1
**Files:** `backend/app/services/storage_service.py`, `backend/tests/test_storage.py`
**Scope:** M

### Task 8: POST /audio/upload
**Description:** Accept multipart upload, push to S3, persist metadata.
**Acceptance criteria:**
- [ ] JWT-protected; accepts `multipart/form-data` audio file
- [ ] Validates audio MIME type + max size (50 MB); generates unique key `users/{user_id}/audio/{uuid}.{ext}`
- [ ] Uploads to S3, extracts size + best-effort duration (**mutagen**, never blocks upload), saves `File` doc with **bucket+key** (no persisted file_url)
- [ ] Returns 201 with file details (including a freshly-presigned `file_url`)
- [ ] `FileRepository` (create) + `AudioService.upload_audio` orchestrate; router stays thin
**Verification:**
- [ ] API test: upload → object in S3 + `File` doc in Mongo + correct response; non-audio rejected
**Dependencies:** Task 7, Task 5
**Files:** `backend/app/routers/audio.py`, `backend/app/services/audio_service.py`, `backend/app/repositories/file_repository.py`, `backend/app/schemas/file.py`, `backend/tests/test_audio_upload.py`
**Scope:** M

### Task 9: GET /audio (paginated list)
**Description:** List the caller's files, paginated, each item carrying a presigned `file_url`.
**Acceptance criteria:**
- [ ] `GET /audio?limit&offset` paginated (limit default 20, max 100; offset 0; newest-first) → `{ items, total, limit, offset }`
- [ ] Each item: presigned `file_url` (~60m) from bucket+key, plus id, file_name, file_type, created_at, file_metadata
- [ ] JWT-protected; returns only the caller's files via `FileRepository.find_by_user`/`count_by_user`
**Verification:**
- [ ] API test: pagination returns correct slice + total; user A never sees user B's files
**Dependencies:** Task 8
**Files:** `backend/app/routers/audio.py`, `backend/app/services/audio_service.py`, `backend/app/repositories/file_repository.py`, `backend/tests/test_audio_list.py`
**Scope:** M

### Task 9b: GET /audio/{id}/play + DELETE /audio/{id} (ownership)
**Description:** Presigned playback URL and hard delete, both ownership-enforced.
**Acceptance criteria:**
- [ ] `GET /audio/{id}/play` returns a fresh presigned URL (~15m); another user's id → 404
- [ ] `DELETE /audio/{id}` removes the S3 object + the `File` doc; another user's id → 404
- [ ] JWT-protected; ownership checks in `AudioService` via `FileRepository.find_by_id_and_user`
**Verification:**
- [ ] API test: user A cannot play/delete user B's files; presigned URL resolves; delete removes object + doc
**Dependencies:** Task 9
**Files:** `backend/app/routers/audio.py`, `backend/app/services/audio_service.py`, `backend/tests/test_audio_access.py`
**Scope:** M

### ☑ Checkpoint C — Audio backend
- [ ] Upload → object in S3 + metadata in Mongo
- [ ] List returns only caller's files; play enforces ownership (404 cross-user)
- [ ] Presigned URL plays in a browser
- [ ] Review before proceeding

---

## Phase 4 — Audio frontend

### Task 10: Audio List screen
**Description:** Fetch and display the user's files with inline playback.
**Acceptance criteria:**
- [ ] On mount, fetches `/audio?limit&offset` with stored JWT; renders **paginated** results
- [ ] Page controls (prev/next or infinite scroll) driven by `total`/`limit`/`offset`; shows empty + loading states
- [ ] Lists each file's name with an `<audio controls>` element sourced from the **`file_url` in the list response** (no extra per-file /play call needed)
- [ ] Per-file delete control calls `DELETE /audio/{id}` and refreshes the current page
- [ ] "Upload" button navigates to `/upload`; missing/expired JWT → redirect to login
**Verification:**
- [ ] Manual: list shows seeded/uploaded files across pages; navigation works; audio plays inline
**Dependencies:** Task 9, Task 9b, Task 6
**Files:** `frontend/src/pages/AudioList.tsx`, `frontend/src/services/audio.ts`, `frontend/src/types/audio.ts`
**Scope:** M

### Task 11: Upload screen
**Description:** Select and upload an audio file, then return to the list.
**Acceptance criteria:**
- [ ] File picker + submit posts `multipart/form-data` to `/audio/upload`
- [ ] On success: redirect to `/audio` and refresh the list
- [ ] Shows upload progress/error states; missing/expired JWT → redirect to login
**Verification:**
- [ ] Manual: upload a file → redirected → new file appears and plays
**Dependencies:** Task 10
**Files:** `frontend/src/pages/Upload.tsx`
**Scope:** S

### ☑ Checkpoint D — Full UI flow
- [ ] Login → list → upload → see new file → play, end-to-end against real backend
- [ ] Expired/missing JWT redirects to login everywhere
- [ ] Review before proceeding

---

## Phase 5 — Containerization & seed

### Task 12: Dockerfiles (backend + frontend)
**Description:** Containerize both apps.
**Acceptance criteria:**
- [ ] Backend Dockerfile (python:3.12-slim, installs reqs, runs uvicorn)
- [ ] Frontend Dockerfile (multi-stage: node build → nginx serve, SPA fallback config)
**Verification:**
- [ ] Each image builds and runs standalone
**Dependencies:** Phases 1–4
**Files:** `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`
**Scope:** M

### Task 13: docker-compose + seed + env example
**Description:** Orchestrate mongo + backend + frontend; seed a demo user.
**Acceptance criteria:**
- [ ] `docker-compose.yml` runs mongo (with volume), backend (:8000), frontend nginx (:8080) with wired env + healthchecks
- [ ] Backend `CORS_ORIGINS` includes the dockerized frontend origin (`http://localhost:8080`), not just Vite's 5173
- [ ] Frontend image built with `VITE_API_URL` build-arg pointing at the backend (`http://localhost:8000`)
- [ ] Seed script creates a demo user (idempotent), runnable via documented command
- [ ] `.env.example` documents every required variable
**Verification:**
- [ ] `docker compose up` → all healthy; seeded user logs in from containerized frontend; full flow works
**Dependencies:** Task 12
**Files:** `docker-compose.yml`, `backend/app/seed.py`, `.env.example`
**Scope:** M

### ☑ Checkpoint E — Containers
- [ ] `docker compose up` brings up all three services and the full flow works in containers
- [ ] Review before proceeding

---

## Phase 6 — Live deployment (Vercel + Render + Atlas)

### Task 14: Provision Atlas + production S3
**Description:** Stand up the managed prod dependencies.
**Acceptance criteria:**
- [ ] MongoDB Atlas M0 cluster created; connection string captured; network access allows Render
- [ ] Production S3 bucket created, public access blocked, IAM user with least-privilege policy
- [ ] S3 bucket CORS allows `GET` from localhost + the Vercel origin (for `<audio>` presigned URLs)
**Verification:**
- [ ] Backend run locally against Atlas URI connects; presigned GET works from a browser
**Dependencies:** Phase 3
**Files:** `docs/aws-setup.md` (IAM policy + bucket CORS JSON), `.env.example`
**Scope:** S

### Task 15: Deploy backend to Render
**Description:** Run the backend Docker image as a Render web service.
**Acceptance criteria:**
- [ ] Render service builds from `backend/Dockerfile`; env vars set (`MONGO_URI`=Atlas, `JWT_SECRET`, S3 vars, `CORS_ORIGINS`)
- [ ] Health check endpoint configured; auto-deploy on push enabled
- [ ] Seed runs against Atlas (one-off command or documented step)
**Verification:**
- [ ] Public Render URL serves `/health`; `POST /login` with seeded creds returns a JWT
**Dependencies:** Task 14, Task 13
**Files:** `render.yaml` (optional blueprint), `docs/deployment.md`
**Scope:** M

### Task 16: Deploy frontend to Vercel + wire CORS
**Description:** Serve the React build on Vercel pointed at the Render API.
**Acceptance criteria:**
- [ ] Vercel project builds `frontend/`; `VITE_API_URL` set to the Render URL
- [ ] Backend `CORS_ORIGINS` includes the Vercel domain; S3 CORS includes the Vercel domain
- [ ] SPA routing works (deep links / refresh don't 404)
**Verification:**
- [ ] Opening the Vercel URL loads the app and login succeeds (no CORS errors in console)
**Dependencies:** Task 15
**Files:** `frontend/vercel.json` (SPA rewrites), `docs/deployment.md`
**Scope:** S

### Task 17: Live smoke test
**Description:** Verify the full flow against the deployed stack.
**Acceptance criteria:**
- [ ] Register → login → upload → list → inline playback all work on the live URL
- [ ] Cold-start behaviour observed and noted
**Verification:**
- [ ] End-to-end run on the public URL from a clean browser session
**Dependencies:** Task 16
**Files:** —
**Scope:** S

### ☑ Checkpoint F — Live
- [ ] Public Vercel URL works end-to-end against Render + Atlas + S3
- [ ] CORS verified from the real origin; cold-start documented
- [ ] Review before proceeding

---

## Phase 7 — Deliverable docs

### Task 18: DB model deliverable
**Acceptance criteria:**
- [ ] ERD / schema definition for Users + Files (fields, types, indexes, relationship)
**Verification:**
- [ ] Diagram/schema renders; every field listed in `assignment.md` §1 is present and matches the Beanie models
**Files:** `docs/db-model.md` (+ diagram image or mermaid)
**Dependencies:** Task 2
**Scope:** S

### Task 19: Architecture diagram
**Acceptance criteria:**
- [ ] Diagram of API flow, auth (JWT) flow, and storage (S3) structure
- [ ] Both topologies shown: local (docker-compose) and prod (Vercel → Render → Atlas/S3)
**Verification:**
- [ ] Diagram renders; a reviewer can trace register→login→upload→list→play from it end to end
**Files:** `docs/architecture.md` (+ mermaid/diagram)
**Dependencies:** Phases 2–6
**Scope:** S

### Task 20: README
**Acceptance criteria:**
- [ ] Local run (docker-compose), env var reference, AWS bucket/IAM + CORS setup, API reference, project structure
- [ ] **Live demo URL + seeded credentials**, plus Render cold-start note
- [ ] Note that `/register`, `/login`, `/health` are intentionally public; all data endpoints are JWT-protected
**Verification:**
- [ ] Fresh-clone dry run: following only the README brings the app up locally with `docker compose up`
**Files:** `README.md`
**Dependencies:** All
**Scope:** M

### ☑ Checkpoint G — Complete
- [ ] All four deliverables present (DB model, architecture diagram, source, docker)
- [ ] Fresh-clone reviewer can run locally AND open the live URL
- [ ] Final review before zipping for submission
