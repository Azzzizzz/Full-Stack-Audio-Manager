# Architecture

## High-level overview

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                            MEEAMI  —  SYSTEM OVERVIEW                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  USER BROWSER                                                            │
  │                                                                          │
  │  ┌─────────────────────────────────────────────────────────────────┐    │
  │  │  React + TypeScript  (served from Vercel CDN)                   │    │
  │  │                                                                  │    │
  │  │  /register  /login        /audio (list)        /upload          │    │
  │  │  ──────────────────       ──────────────────   ──────────────   │    │
  │  │  RHF + Zod forms          paginated table      file picker      │    │
  │  │  JWT → Zustand store      <audio controls>     progress bar     │    │
  │  └──────────┬──────────────────────┬──────────────────┬───────────┘    │
  │             │ REST/JSON            │ REST/JSON         │ multipart      │
  └─────────────┼──────────────────────┼───────────────────┼────────────────┘
                │                      │                   │
                ▼  HTTPS               ▼  HTTPS            ▼  HTTPS
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  RENDER  (Docker · FastAPI · uvicorn)                                   │
  │                                                                         │
  │  Public routes           JWT-protected routes                           │
  │  ─────────────           ──────────────────────────────────────────    │
  │  POST /register          POST /audio/upload  → validate → S3 put       │
  │  POST /login             GET  /audio         → query DB → presign URLs  │
  │  GET  /health            GET  /audio/{id}/play → fresh presigned URL    │
  │                          DELETE /audio/{id}  → S3 delete + DB remove   │
  │                                                                         │
  │  ┌───────────┐  ┌───────────────┐  ┌──────────────┐  ┌─────────────┐  │
  │  │  routers  │→ │   services    │→ │ repositories │→ │   models    │  │
  │  │ (HTTP I/O)│  │(business logic│  │ (Mongo only) │  │  (Beanie)   │  │
  │  └───────────┘  │ + S3 calls)   │  └──────┬───────┘  └─────────────┘  │
  │                 └───────┬───────┘         │                            │
  └─────────────────────────┼─────────────────┼────────────────────────────┘
                            │ boto3 (SigV4)   │ Motor (async)
                            ▼                 ▼
           ┌────────────────────┐    ┌────────────────────────┐
           │  AWS S3            │    │  MONGODB ATLAS         │
           │  ──────────────    │    │  ──────────────────    │
           │  meeami-audio-prod │    │  users collection      │
           │  ap-south-1        │    │  · _id, email          │
           │                    │    │  · hashed_password     │
           │  Private bucket    │    │                        │
           │  Audio bytes only  │    │  files collection      │
           │                    │    │  · user_id (indexed)   │
           │  Access:           │    │  · bucket + key        │
           │  presigned URLs    │    │    (NO stored URLs)     │
           │  (TTL 60 min list  │    │  · file_metadata       │
           │   TTL 15 min play) │    │    duration, size      │
           └─────────┬──────────┘    └────────────────────────┘
                     │  presigned GET URL (direct stream)
                     ▼
           ┌──────────────────┐
           │  USER BROWSER    │
           │  <audio> element │
           │  streams MP3/WAV │
           └──────────────────┘


╔══════════════════════════════════════════════════════════════════════════════╗
║                            KEY FLOWS                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

  1. REGISTER / LOGIN
  ───────────────────
  Browser  ──POST /register──►  hash password (bcrypt)  ──►  users (MongoDB)
  Browser  ──POST /login────►  verify password          ──►  JWT (HS256, 60 min)
                              ◄── { access_token }

  2. UPLOAD AUDIO
  ───────────────
  Browser  ──POST /audio/upload (multipart + Bearer)──►
           [1] validate: audio/* MIME, ≤ 50 MB
           [2] generate key: users/{uid}/audio/{uuid}.ext
           [3] stream file ──► S3 PutObject
           [4] extract duration (mutagen, best-effort)
           [5] save { bucket, key, metadata } ──► files (MongoDB)
           ◄── 201 { file_url: presigned GET (60 min) }

  3. LIST & PLAY
  ──────────────
  Browser  ──GET /audio?limit=20&offset=0 (Bearer)──►
           [1] find user's files, newest-first
           [2] generate presigned GET URL per file (60 min)
           ◄── { items: [...], total, limit, offset }
  Browser  <audio src="{presigned_url}">  ──►  S3 (direct, no proxy)

  4. DELETE
  ─────────
  Browser  ──DELETE /audio/{id} (Bearer)──►
           [1] ownership check (404 if wrong user)
           [2] S3 DeleteObject
           [3] remove files doc from MongoDB
           ◄── 200 { success }
```

---

## Stack overview

| Layer      | Local                        | Production                        |
|------------|------------------------------|-----------------------------------|
| Frontend   | Vite dev server (:5173)      | Vercel (CDN)                      |
| Backend    | uvicorn (:8000)              | Render (Docker web service)       |
| Database   | MongoDB container (:27017)   | MongoDB Atlas (M0 free tier)      |
| Storage    | AWS S3                       | AWS S3 (`meeami-audio-prod`)      |

---

## Request flow

### Auth flow

```
Browser
  │
  ├─ POST /register ──► FastAPI router
  │                         └─► AuthService.register()
  │                               └─► UserRepository.create()
  │                                     └─► bcrypt hash → users collection
  │                         ◄── 201 { success, data: user }
  │
  └─ POST /login ───► FastAPI router
                          └─► AuthService.login()
                                └─► UserRepository.find_by_email()
                                      └─► bcrypt verify
                          ◄── 200 { success, data: { access_token } }
                                     (JWT HS256, 60-min TTL)
```

### Upload flow

```
Browser
  │
  └─ POST /audio/upload  (multipart, Bearer token)
         │
         ├─ get_current_user dep ──► decode JWT → User
         │
         └─► AudioService.upload_audio()
               ├─ validate MIME (audio/*) + size (≤ 50 MB)
               ├─ StorageService.upload_fileobj()
               │     └─► boto3 ──► S3 (ap-south-1)
               ├─ mutagen duration (best-effort)
               └─► FileRepository.create()
                     └─► files collection (bucket + key, no file_url)
         ◄── 201 { success, data: FileResponse }
                   (file_url = presigned GET, TTL 60 min)
```

### List + playback flow

```
Browser
  │
  └─ GET /audio?limit&offset  (Bearer token)
         │
         └─► AudioService.list_audio()
               ├─ FileRepository.find_by_user()   ← newest-first
               ├─ FileRepository.count_by_user()
               └─ StorageService.generate_presigned_get(key, ttl=3600)
                     └─► boto3 → presigned URL (s3.ap-south-1.amazonaws.com)
         ◄── 200 { items, total, limit, offset }

  <audio controls src="{file_url}"> ──► GET presigned URL ──► S3
```

### Delete flow

```
Browser
  │
  └─ DELETE /audio/{id}  (Bearer token)
         │
         └─► AudioService.delete_audio()
               ├─ FileRepository.find_by_id_and_user()  ← ownership check
               ├─ StorageService.delete_object(key)
               │     └─► boto3 ──► S3 delete
               └─► FileRepository.delete()
                     └─► files collection remove
         ◄── 200 { success, message }
```

---

## Backend layer map

```
routers/          ← HTTP I/O only (validate request, return response)
  auth.py
  audio.py
    │
services/         ← business logic, ownership, S3 orchestration
  auth_service.py
  audio_service.py
  storage_service.py
    │
repositories/     ← all MongoDB access (no Beanie calls outside here)
  user_repository.py
  file_repository.py
    │
models/           ← Beanie documents (schema + indexes + hooks)
  user.py
  file.py
```

---

## Production topology

```
User browser
     │  HTTPS
     ▼
Vercel CDN  (React + Vite build)
     │  HTTPS   VITE_API_URL
     ▼
Render  (Docker · uvicorn · FastAPI)
     │                        │
     │  Motor/Beanie          │  boto3 (SigV4)
     ▼                        ▼
MongoDB Atlas            AWS S3
(ap-south-1 cluster)   (meeami-audio-prod · ap-south-1)
```

---

## Local topology (docker-compose)

```
Browser (:5173 or :8080)
     │
     ▼
nginx container (:8080)   ← serves React build
     │
     ▼
uvicorn container (:8000) ← FastAPI
     │                  │
     ▼                  ▼
MongoDB container    AWS S3 (real, via .env credentials)
(:27017)
```

---

## Security notes

- JWT HS256, 60-min TTL, shared secret in env — no refresh token.
- S3 bucket is **private** (Block All Public Access on). Audio is accessed only via presigned GET URLs.
- Presigned URL TTL: 3 600 s on list, 900 s on `/play`.
- IAM user `meeami-backend` has least-privilege policy: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `meeami-audio-prod/*` only.
- CORS origins are env-driven; secrets are never committed (`.env` in `.gitignore`).
- SlowAPI rate limits: 5 req/15 min on auth routes, 20 uploads/hour.
