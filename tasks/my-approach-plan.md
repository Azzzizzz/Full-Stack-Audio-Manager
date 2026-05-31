# Meeami Fullstack Engineer Assignment — Finalized Blueprint (Phases 1–10)

> Design authority for the build. Spec: `assignment.md` · Task list: `todo.md`.
> Changes from the original draft: backend-proxied multipart upload (no presigned-PUT
> state machine), `files` collection with snake_case fields, **exact spec route paths**
> (no `/api/v1` prefix), **JWT HS256**, **localStorage** token storage, and deployment via
> **Vercel + Render + Atlas** (no EC2/Nginx/Let's-Encrypt/manual CI-deploy).

---

# Executive Summary

| Area                | Final Decision                                             |
| ------------------- | ---------------------------------------------------------- |
| Architecture        | Modular Layered Monolith                                   |
| Repository Strategy | Monorepo                                                   |
| Backend             | FastAPI + Python 3.12                                      |
| Frontend            | React + TypeScript + Vite                                  |
| Database            | MongoDB — local container (dev/grading) · Atlas M0 (prod)  |
| ODM                 | Beanie                                                     |
| Storage             | AWS S3 (Private Bucket)                                    |
| Authentication      | JWT (**HS256**, shared secret)                             |
| State Management    | Zustand (token persisted to **localStorage**)              |
| Styling             | Tailwind + shadcn/ui                                       |
| Local Run           | Docker Compose (frontend[nginx] + backend + mongo)         |
| Live Deployment     | **Vercel (FE) + Render (BE) + Atlas (DB) + S3**            |
| TLS / Routing       | Managed by Vercel + Render (no manual Nginx/Let's Encrypt) |
| Testing             | Pytest (API + ownership) · Vitest (optional)               |
| CI/CD               | Auto-deploy on push (Vercel/Render); optional test CI      |

---

# Phase 1 — Requirements Analysis

## Functional Requirements

| ID    | Requirement                          |
| ----- | ------------------------------------ |
| FR-1  | User Registration                    |
| FR-2  | User Login (JWT issue)               |
| FR-3  | JWT Authentication on protected APIs |
| FR-4  | Upload Audio (multipart/form-data)   |
| FR-5  | Store Audio in S3                    |
| FR-6  | Store Metadata in MongoDB            |
| FR-7  | List User Audio                      |
| FR-8  | Playback Audio (presigned URL)       |
| FR-9  | Ownership-Based Authorization        |
| FR-10 | Delete Audio                         |
| FR-11 | Health API                           |
| FR-12 | Markdown Documentation + Diagrams    |

---

## Non-Functional Requirements

| Area        | Decision                                  |
| ----------- | ----------------------------------------- |
| Security    | Production-grade basics (headers, limits) |
| Deployment  | Live URL via managed PaaS (free tier)     |
| Testing     | Unit + API/Integration (ownership-focused)|
| Logging     | Structured logging                        |
| UI          | Modern responsive UI                      |
| Portability | Runs locally via Docker Compose           |

---

# Phase 2 — Scope & Engineering Decisions

## Architecture

| Area                   | Decision                      |
| ---------------------- | ----------------------------- |
| Architecture Style     | Modular Layered Monolith      |
| Repository Pattern     | Yes                           |
| API Style              | Resource-Oriented REST        |
| Dependency Flow        | Router → Service → Repository |
| Internal Communication | Direct Service Calls          |
| Route Paths            | **Exact spec paths**, no prefix |

---

## Backend

| Area             | Decision         |
| ---------------- | ---------------- |
| Language         | Python 3.12      |
| Framework        | FastAPI          |
| ODM              | Beanie           |
| Validation       | Pydantic         |
| Password Hashing | bcrypt           |
| JWT Algorithm    | **HS256**        |
| Session Model    | Stateless JWT    |
| Rate Limiting    | SlowAPI          |
| Logging          | Structured JSON  |

---

## Frontend

| Area        | Decision                          |
| ----------- | --------------------------------- |
| Framework   | React                             |
| Language    | TypeScript                        |
| Build Tool  | Vite                              |
| Router      | React Router                      |
| State       | Zustand                           |
| Token Store | **localStorage** (survives refresh) |
| Styling     | Tailwind                          |
| Components  | shadcn/ui                         |
| Forms       | React Hook Form                   |
| Validation  | Zod                               |
| HTTP Client | Axios                             |

---

## Infrastructure

| Area      | Decision                                  |
| --------- | ----------------------------------------- |
| Database  | Mongo container (local) · Atlas M0 (prod) |
| Storage   | AWS S3                                     |
| Bucket    | Private                                    |
| Frontend  | Vercel                                     |
| Backend   | Render                                     |
| CI/CD     | Auto-deploy on push (Vercel/Render)        |

---

# Phase 3 — High-Level Architecture Design

## Production Topology

```txt
Frontend (Vercel)
        │  HTTPS
        ▼
Backend (Render, Docker)
   │            │
   ▼            ▼
MongoDB Atlas   AWS S3 (Private)
```

## Local Topology (Docker Compose)

```txt
Frontend container (nginx serves React build)
        │
        ▼
Backend container (FastAPI / uvicorn)
   │            │
   ▼            ▼
mongo container   AWS S3 (Private)
```

---

## Backend Modules

| Module         |
| -------------- |
| Auth           |
| Users          |
| Audio          |
| Storage        |
| Health         |
| Core           |

---

## JWT Architecture

| Area            | Decision              |
| --------------- | --------------------- |
| Algorithm       | **HS256**             |
| Access Tokens   | Yes                   |
| Refresh Tokens  | No                    |
| Expiry          | 60 min (configurable) |
| Session Storage | None (stateless)      |
| Auth Guard      | FastAPI Dependencies  |

---

## Upload Flow (backend-proxied multipart)

```txt
Client selects file
       ↓
POST /audio/upload  (multipart/form-data, JWT)
       ↓
Backend validates MIME + size
       ↓
Backend streams file to S3 (private)  ──► put_object(users/{user_id}/audio/{uuid}.{ext})
       ↓
Backend saves File metadata in MongoDB
       ↓
201 + file details
```

> No presigned-PUT, no init/complete round-trip, no upload state machine — the spec asks
> for a single multipart endpoint that uploads to cloud storage.

---

## Storage Architecture

| Area                | Decision                                |
| ------------------- | --------------------------------------- |
| Bucket              | Private                                 |
| List URL TTL        | ~60 min (presigned GET in `GET /audio`) |
| Playback URL TTL    | ~15 min (presigned GET in `/play`)      |
| Object Key          | users/{user_id}/audio/{uuid}.{ext}      |
| Ownership           | Backend Controlled                      |
| Raw S3 Keys Exposed | No                                      |
| CORS                | Allow GET from all frontend origins (5173 + 8080 + Vercel) |

---

## Playback Architecture

| Area            | Decision           |
| --------------- | ------------------ |
| Delivery        | Direct S3 (signed) |
| Streaming Proxy | No                 |
| URL Generation  | Presigned at read time (both list + play) |
| Audio List API  | Metadata **+ presigned `file_url` per item** (spec: GET /audio must include file_url) |
| Delete Strategy | Hard Delete (S3 + DB) |

---

## Runtime Architecture

| Area           | Decision                            |
| -------------- | ----------------------------------- |
| Runtime        | Uvicorn                             |
| TLS / Routing  | Managed by Render (prod) / Vercel   |
| Containers     | Docker                              |
| Orchestration  | Docker Compose (local)              |
| Restart Policy | unless-stopped (local)              |

---

## Health Check

| Endpoint |
| -------- |
| /health  |

---

## Rate Limiting

| Endpoint | Limit             |
| -------- | ----------------- |
| Login    | 5 / 15 min / IP   |
| Register | 5 / hour / IP     |
| Upload   | 20 / hour / User  |
| Global   | 100 / min / IP    |

---

# Phase 4 — Technology Mapping & Project Structure

## Monorepo

```txt
project-root/
├── backend/
├── frontend/
├── docs/
├── docker-compose.yml
├── README.md
└── .env.example
```

---

## Backend Structure (layered)

```txt
backend/app/
├── routers/         # HTTP layer (thin)
├── services/        # business logic + ownership checks
├── repositories/    # Beanie/Mongo data access
├── models/          # Beanie documents (User, File)
├── schemas/         # Pydantic request/response
├── core/            # config, security, middleware, logging
└── main.py
```

---

## Frontend Structure

```txt
frontend/src/
├── app/
├── pages/
├── components/
├── layouts/
├── services/        # axios API clients
├── stores/          # Zustand (auth/token)
├── routes/          # router + ProtectedRoute
├── types/
└── lib/
```

---

## Documentation

```txt
docs/
├── db-model.md       # ERD / schema
├── architecture.md   # local + prod topology, API/auth/storage flow
├── aws-setup.md      # IAM policy + bucket CORS
└── deployment.md     # Render + Vercel + Atlas steps
```

---

# Phase 5 — Database & API Design

## Collections

### users

| Field           |
| --------------- |
| _id             |
| first_name      |
| last_name       |
| email           |
| hashed_password |
| created_at      |
| updated_at      |

Index: `email (unique)`

---

### files

| Field         | Stored? |
| ------------- | ------- |
| _id           | yes     |
| user_id       | yes     |
| file_type     | yes     |
| file_name     | yes     |
| bucket        | yes     |
| key           | yes     |
| file_metadata | yes — { duration, size } |
| created_at    | yes     |
| updated_at    | yes     |
| file_url      | **computed at read time** (presigned from bucket+key) — NOT persisted |

> Spec allows "file_url **or** bucket-keys". Because the bucket is private, a persisted
> presigned URL would expire and go stale, so we store **bucket + key** and generate
> `file_url` on every read. `duration` is extracted best-effort via **mutagen** at upload
> (never blocks the upload if it fails).

Indexes: `user_id`, `created_at`

---

## ERD

```txt
users
  │ 1:N
  ▼
files
```

---

## API Endpoints (exact spec paths)

### Auth

| Method | Endpoint   | Protected |
| ------ | ---------- | --------- |
| POST   | /register  | No        |
| POST   | /login     | No        |
| GET    | /me        | JWT (optional convenience) |

### Audio

| Method | Endpoint          | Protected |
| ------ | ----------------- | --------- |
| POST   | /audio/upload     | JWT       |
| GET    | /audio            | JWT       | (paginated: `?limit&offset`) |
| GET    | /audio/{id}/play  | JWT       |
| DELETE | /audio/{id}       | JWT       |

### Health

| Method | Endpoint | Protected |
| ------ | -------- | --------- |
| GET    | /health  | No        |

> **On "all APIs must be JWT protected":** every *data* endpoint (`/audio*`, `/me`) is JWT
> protected. `/register`, `/login`, and `/health` are necessarily public (you can't hold a
> token before logging in, and `/health` is the container/Render probe). This is called out
> in the README so the exception reads as deliberate.

#### `GET /audio` — paginated, spec-aligned
Query params: `limit` (default 20, max 100), `offset` (default 0); newest-first by `created_at`.
```json
GET /audio?limit=20&offset=0
{ "success": true, "data": {
    "items": [
      { "id": "...", "file_name": "...", "file_type": "audio/mpeg",
        "file_url": "<presigned GET, ~60m>", "created_at": "...",
        "file_metadata": { "duration": 12.3, "size": 204800 } }
    ],
    "total": 57, "limit": 20, "offset": 0
} }
```

---

## Response Standard

### Success
```json
{ "success": true, "data": {} }
```

### Error
```json
{ "success": false, "message": "Error message", "code": "ERROR_CODE" }
```

---

# Phase 6 — Security & Infrastructure Design

## Security

| Area               | Decision           |
| ------------------ | ------------------ |
| JWT                | **HS256**          |
| Password Hash      | bcrypt (12 rounds) |
| Refresh Tokens     | No                 |
| Email Verification | No                 |
| Token Storage      | localStorage via Zustand `persist`; rehydrated on load (refresh keeps session — guard waits on `hasHydrated`). XSS tradeoff noted in README |
| Authorization      | Ownership Based    |

---

## Security Headers

```txt
X-Content-Type-Options
X-Frame-Options
Referrer-Policy
Content-Security-Policy
```

---

## CORS (backend `CORS_ORIGINS`, env-driven)

| Environment | Allowed Origin(s) |
| ----------- | ----------------- |
| Local (Vite dev)        | http://localhost:5173 |
| Local (docker-compose)  | http://localhost:8080 (dockerized nginx frontend) |
| Production              | the Vercel domain |

> All active frontend origins must be listed, **including the dockerized nginx port** —
> otherwise the `docker compose up` UI (the primary grading path) is CORS-blocked.

---

## S3 Security

| Area          | Decision        |
| ------------- | --------------- |
| Bucket        | Private         |
| IAM           | Least Privilege |
| Public Access | Disabled        |
| CORS          | GET from all frontend origins (localhost:5173, localhost:8080, Vercel) — needed for `<audio>` to fetch presigned URLs |

---

## Docker Security

| Area        | Decision      |
| ----------- | ------------- |
| User        | Non-root      |
| Secrets     | Env Variables |
| Base Images | Slim          |

---

# Phase 7 — Low-Level Design

## Dependency Flow

```txt
Router → Service → Repository → Beanie Model
```

## BaseDocument

| Field      |
| ---------- |
| created_at |
| updated_at |

## MIME Whitelist

```txt
audio/mpeg
audio/wav
audio/x-wav
audio/mp4
audio/aac
audio/ogg
```

## Upload Limits

| Area            | Value |
| --------------- | ----- |
| Max Upload Size | 50 MB |

---

## Repositories

### UserRepository
* create
* find_by_id
* find_by_email
* exists_by_email
* update

### FileRepository
* create
* find_by_id
* find_by_id_and_user
* find_by_user          # paginated: limit, offset, sorted newest-first
* count_by_user         # total for pagination metadata
* delete

---

## Services

### AuthService
* register
* login
* get_current_user

### AudioService
* upload_audio          # validate → storage.upload → repo.create
* list_audio
* get_playback_url      # ownership check → presigned GET
* delete_audio          # ownership check → storage.delete + repo.delete

### StorageService
* upload_fileobj
* generate_playback_url
* delete_object

### HealthService
* basic liveness/DB-reachable check

---

# Phase 8 — Implementation Plan

## Build Order

| Order | Module                          |
| ----- | ------------------------------- |
| 1     | Repo skeleton + backend foundation (config, middleware, /health) |
| 2     | Database models (User, File)    |
| 3     | Auth module (HS256, register/login) |
| 4     | Storage service (S3)            |
| 5     | Audio module (upload/list/play/delete) |
| 6     | Frontend foundation (Vite, router, axios, Zustand) |
| 7     | Login + Register UI + protected routes |
| 8     | Audio list UI (playback + delete) |
| 9     | Upload UI                       |
| 10    | Docker + Compose + seed         |
| 11    | Deploy (Atlas, Render, Vercel)  |
| 12    | Tests + docs                    |

---

## Milestones

| Milestone | Deliverable             |
| --------- | ----------------------- |
| M1        | Backend foundation      |
| M2        | Authentication          |
| M3        | Audio (upload/list/play/delete) |
| M4        | Frontend end-to-end     |
| M5        | Dockerized local run    |
| M6        | Live deployment         |
| M7        | Docs + tests            |

---

# Phase 9 — Testing Strategy

## Backend

| Area        | Tool           |
| ----------- | -------------- |
| Unit Tests  | Pytest         |
| Async Tests | pytest-asyncio |
| API Tests   | httpx          |
| Mocking     | pytest-mock    |

Focus: auth (register/login/JWT) and **ownership enforcement** (user A cannot access
user B's files on play/delete).

## Frontend (optional)

| Area       | Tool                  |
| ---------- | --------------------- |
| Unit Tests | Vitest                |
| Components | React Testing Library |

> No Playwright E2E and no coverage gates — out of scope for this assignment.

---

## Critical Flow

```txt
Register → Login → Upload → List → Playback → Delete
```

---

# Phase 10 — Deployment & CI/CD

## Local (Docker Compose)

Services:
```txt
frontend   (nginx serving React build, exposed on :8080)
backend    (FastAPI / uvicorn, exposed on :8000)
mongodb    (local container, volume-backed)
```

> **Vite env is build-time:** `VITE_API_URL` is baked into the React bundle when the image
> is built — set it as a Docker build-arg (e.g. `http://localhost:8000`) for the
> compose build, and to the Render URL for the Vercel build. It is **not** a runtime var.
>
> **Seed user:** the seed script creates a known demo account (email + password) so a
> reviewer can log in immediately — credentials are listed in the README. A **Register
> screen** (wired to `POST /register`, linked from Login) is also provided so the live
> demo is self-serve.

## Production

```txt
Vercel   → React build (static, CDN, HTTPS)
Render   → backend Docker image (HTTPS, auto-deploy on push)
Atlas    → MongoDB M0
AWS S3   → audio storage (private)
```

## CI/CD

```txt
Vercel + Render auto-deploy on git push (no manual pipeline)
Optional: GitHub Actions test workflow (lint + pytest + vitest)
```

> Cold-start note: Render free tier sleeps after ~15 min idle → first request ~50s.
> Documented in README.

---

# Final Production Architecture

```txt
Frontend (Vercel)
        │  HTTPS
        ▼
Backend (Render)
   │           │
   ▼           ▼
MongoDB Atlas  AWS S3 (Private)
```

---

# Appendix A — ASCII Architecture & Flow Diagrams

> Covers Deliverable #2: API flow, auth flow, and storage structure.

## A1. System Architecture (component + layered view)

```txt
┌───────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                               │
│   React + TS SPA · Zustand (JWT in localStorage) · axios · RHF + Zod        │
│   Pages:  Register → Login → Audio List (paginated, <audio>) → Upload       │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                   │  HTTPS  ·  Authorization: Bearer <JWT>
                                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          FastAPI Backend (layered)                          │
│                                                                             │
│   Middleware:  CORS  ·  Security Headers  ·  Rate Limit (SlowAPI)           │
│        │                                                                    │
│        ▼                                                                    │
│   Routers   ──►   Services   ──►   Repositories   ──►   Beanie Models       │
│  (HTTP I/O)     (logic +          (Mongo access)        (User, File)        │
│                  ownership)                                                 │
│        ▲              │                                                     │
│        │              └──────────────► StorageService (boto3) ───┐          │
│   Auth dep:                                                       │          │
│   get_current_user (decode JWT HS256, load User)                  │          │
└────────────────┬──────────────────────────────────────────────────┼─────────┘
                 │                                                    │
        ┌────────▼─────────┐                              ┌───────────▼─────────┐
        │     MongoDB        │                              │      AWS S3          │
        │  users · files     │                              │  private bucket      │
        │  (metadata only)   │                              │  (audio bytes)       │
        └────────────────────┘                              └──────────────────────┘
```

## A2. Auth — Registration  (`POST /register`)

```txt
Client                Router          AuthService        UserRepo        Mongo
  │ POST /register       │                │                 │              │
  │ {first,last,email,pw}│                │                 │              │
  │─────────────────────►│ register(dto)  │                 │              │
  │                      │───────────────►│ exists_by_email?│              │
  │                      │                │────────────────►│─────────────►│
  │                      │                │     false       │◄─────────────│
  │                      │                │ hash pw (bcrypt)│              │
  │                      │                │ create(user) ──►│─────────────►│
  │                      │ 201 user (no hash)               │   inserted   │
  │◄─────────────────────┤◄───────────────┤                 │              │
  │   409 if email already exists                           │              │
```

## A3. Auth — Login + JWT issue  (`POST /login`)

```txt
Client            Router          AuthService        UserRepo       Mongo
  │ POST /login      │                │                 │             │
  │ {email,password} │                │                 │             │
  │─────────────────►│ login(dto)     │                 │             │
  │                  │───────────────►│ find_by_email ─►│────────────►│
  │                  │                │     user        │◄────────────│
  │                  │                │ verify pw (bcrypt)            │
  │                  │                │ create_access_token (HS256)   │
  │                  │ 200 {access_token, token_type}                │
  │◄─────────────────┤◄───────────────┤                 │             │
  │ store JWT → Zustand → localStorage │                 │             │
  │   401 on bad credentials           │                 │             │
```

## A4. Protected request — JWT guard  (every `/audio*`)

```txt
Client                          Auth dependency                 Handler
  │ <verb> /audio*  Bearer<JWT>      │                             │
  │─────────────────────────────────►│ decode+verify (HS256, exp)  │
  │                                  │  valid   → load User ───────►│ proceed
  │                                  │  invalid/expired → 401 ──────┼──► FE redirects to /login
```

## A5. Upload  (`POST /audio/upload`, multipart)

```txt
Client        Router      AudioService     StorageService   FileRepo    S3       Mongo
  │ POST /audio/upload│        │                 │             │        │         │
  │ multipart(file)   │        │                 │             │        │         │
  │ Bearer<JWT>       │        │                 │             │        │         │
  │──────────────────►│ (auth) │                 │             │        │         │
  │                   │ upload(file,user)         │             │        │         │
  │                   │───────►│ validate MIME+size│            │        │         │
  │                   │        │ key=users/{uid}/audio/{uuid}.ext         │         │
  │                   │        │ upload_fileobj ─►│ put_object ──────────►│         │
  │                   │        │ duration via mutagen (best-effort)      │         │
  │                   │        │ create(File: bucket,key,meta) ─►│───────────────►│
  │                   │        │ presign file_url►│             │        │         │
  │  201 {id, file_name, file_url, file_metadata} │             │        │         │
  │◄──────────────────┤◄───────┤                 │             │        │         │
```

## A6. List  (`GET /audio?limit&offset`, paginated)

```txt
Client          Router      AudioService      FileRepo        S3          Mongo
  │ GET /audio?limit&offset   │                 │             │            │
  │ Bearer<JWT>   │ (auth)     │                 │             │            │
  │──────────────►│ list(user,limit,offset)      │             │            │
  │               │───────────►│ find_by_user ──►│────────────────────────►│
  │               │            │ count_by_user ─►│────────────────────────►│
  │               │            │◄ items, total   │             │            │
  │               │            │ presign file_url per item ───►│ (signed GET)│
  │  200 { items:[{…, file_url}], total, limit, offset }       │            │
  │◄──────────────┤◄───────────┤                 │             │            │
  │ render list; <audio src=file_url> streams directly from S3 ►│            │
```

## A7. Playback  (`GET /audio/:id/play`)

```txt
Client         Router      AudioService      FileRepo       S3        Mongo
  │ GET /audio/{id}/play     │                 │           │          │
  │ Bearer<JWT>  │ (auth)     │                 │           │          │
  │─────────────►│ get_playback_url(id,user)    │           │          │
  │              │───────────►│ find_by_id_and_user ───────►│─────────►│
  │              │            │  not owner / none → 404     │◄─────────│
  │              │            │ presign GET (~15m) ────────►│          │
  │  200 {file_url}  (signed URL for the <audio> element)   │          │
  │◄─────────────┤◄───────────┤                 │           │          │
```

## A8. Delete  (`DELETE /audio/:id`)

```txt
Client         Router      AudioService      FileRepo       S3        Mongo
  │ DELETE /audio/{id} Bearer<JWT>            │           │          │
  │─────────────►│ delete(id,user)            │           │          │
  │              │───────────►│ find_by_id_and_user ─────►│─────────►│
  │              │            │  not owner / none → 404               │
  │              │            │ delete_object(key) ──────►│ (S3 del)  │
  │              │            │ repo.delete(id) ──────────────────────►│
  │  204 No Content│          │                │           │          │
  │◄─────────────┤◄───────────┤                │           │          │
```

## A9. Deployment topology (prod)

```txt
        Browser
           │ HTTPS
           ▼
   Vercel (React static, CDN)
           │ HTTPS  (VITE_API_URL)
           ▼
   Render (FastAPI Docker, auto-deploy on push)
        │                    │
        ▼                    ▼
  MongoDB Atlas (M0)    AWS S3 (private)
  metadata               audio bytes + presigned URLs
```

---

# Final Status

| Phase                               | Status |
| ----------------------------------- | ------ |
| Phase 1 — Requirements              | ✅      |
| Phase 2 — Engineering Decisions     | ✅      |
| Phase 3 — HLD                       | ✅      |
| Phase 4 — Technology Mapping        | ✅      |
| Phase 5 — Database & API Design     | ✅      |
| Phase 6 — Security & Infrastructure | ✅      |
| Phase 7 — LLD                       | ✅      |
| Phase 8 — Implementation Plan       | ✅      |
| Phase 9 — Testing Strategy          | ✅      |
| Phase 10 — Deployment & CI/CD       | ✅      |

This blueprint is consistent with `assignment.md` (spec) and `todo.md` (task list).
First coding task: **backend foundation (config + middleware + /health)**.
