# Meeami — Full-Stack Audio Manager

Authenticated audio upload, listing, and inline playback.  
Users register and log in (JWT), upload audio to AWS S3, browse their own files (paginated), and play them inline. Only metadata + S3 references live in MongoDB; the audio bytes live in S3.

## Live demo

| | URL |
|---|---|
| Frontend | https://full-stack-audio-manager.vercel.app |
| Backend API | https://full-stack-audio-manager.onrender.com |
| Health check | https://full-stack-audio-manager.onrender.com/health |

**Seeded credentials:** `testuser1@test.com` / `12345678`

> **Cold-start note:** Render's free tier spins down after ~15 min of inactivity. The first request after idle may take 30–50 seconds to respond. Subsequent requests are fast.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 · FastAPI · Beanie (MongoDB ODM) · boto3 (S3) · python-jose (JWT HS256) · passlib[bcrypt] · SlowAPI · mutagen |
| Frontend | React + TypeScript + Vite · React Router · Zustand (persist) · React Hook Form + Zod · axios · Tailwind + shadcn/ui |
| Database | MongoDB (container local / Atlas prod) |
| Storage | AWS S3 (private bucket, presigned URLs) |
| Infra | Docker + Docker Compose · Vercel · Render |

---

## Local run (Docker Compose)

### Prerequisites

- Docker + Docker Compose
- AWS S3 bucket + IAM credentials (see [AWS setup](#aws-setup))

### 1. Clone and configure

```bash
git clone https://github.com/Azzzizzz/Full-Stack-Audio-Manager.git
cd Full-Stack-Audio-Manager
cp .env.example .env
```

Open `.env` and fill in these **required** values:

```
JWT_SECRET=<any long random string — run: openssl rand -hex 32>
AWS_ACCESS_KEY_ID=<your IAM access key>
AWS_SECRET_ACCESS_KEY=<your IAM secret key>
AWS_REGION=<your bucket region, e.g. ap-south-1>
AWS_BUCKET=<your S3 bucket name>
```

> `MONGO_URI` is automatically set by Docker Compose — you do not need to change it.

### 2. Start all services

```bash
docker compose up --build
```

Services:
- MongoDB on `localhost:27017`
- Backend API on `http://localhost:8000`
- Frontend on `http://localhost:8080`

### 3. Open the app

Navigate to `http://localhost:8080` and log in with `testuser1@test.com` / `12345678`.

> The demo user is seeded automatically on startup.

---

## Environment variables

Copy `.env.example` to `.env` and fill in all values before running.

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string (`mongodb://mongo:27017/meeami` for local compose) |
| `JWT_SECRET` | Long random string for signing JWTs — generate with `openssl rand -hex 32` |
| `JWT_TTL_MINUTES` | JWT expiry in minutes (default `60`) |
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_REGION` | S3 bucket region (e.g. `ap-south-1`) |
| `AWS_BUCKET` | S3 bucket name |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |

---

## AWS setup

### S3 bucket

1. Create a private S3 bucket (Block All Public Access: **On**).
2. Set bucket CORS (Permissions → CORS):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:8080",
      "https://<your-vercel-domain>"
    ],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3600
  }
]
```

### IAM user (least-privilege)

Create an IAM user and attach this inline policy (replace `<bucket>` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::<bucket>/*"
    }
  ]
}
```

Generate an access key for the IAM user and add it to `.env`.

---

## API reference

All `/audio*` routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Health check |
| `POST` | `/register` | Public | Create account → `{ success, data: user }` |
| `POST` | `/login` | Public | Issue JWT → `{ success, data: { access_token, token_type } }` |
| `POST` | `/audio/upload` | JWT | Upload audio file (multipart) → 201 `{ success, data: file }` |
| `GET` | `/audio` | JWT | List own files paginated `?limit&offset` → `{ items, total, limit, offset }` |
| `GET` | `/audio/{id}/play` | JWT | Presigned playback URL (~15 min) |
| `DELETE` | `/audio/{id}` | JWT | Delete file from S3 + DB |

**Constraints:** audio MIME types only · max 50 MB per file · rate limits: 30 req/15 min on auth, 20 uploads/hour.

**Response envelope:**
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "...", "code": "..." }
```

### Example curl calls

```bash
# 1. Register a new user
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"you@example.com","password":"yourpass"}'

# 2. Login — copy access_token from the response
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser1@test.com","password":"12345678"}'

# Set the token (replace with value from step 2)
TOKEN=<paste_access_token_here>

# 3. List audio files
curl http://localhost:8000/audio \
  -H "Authorization: Bearer $TOKEN"

# 4. Upload an audio file
curl -X POST http://localhost:8000/audio/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.mp3"

# 5. Get presigned playback URL (replace FILE_ID)
curl http://localhost:8000/audio/FILE_ID/play \
  -H "Authorization: Bearer $TOKEN"

# 6. Delete a file (replace FILE_ID)
curl -X DELETE http://localhost:8000/audio/FILE_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Project structure

```
├── backend/
│   ├── app/
│   │   ├── core/          # config, db, security, deps, limiter, middleware
│   │   ├── models/        # Beanie documents (User, File)
│   │   ├── repositories/  # all MongoDB access
│   │   ├── routers/       # thin HTTP layer
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # business logic + S3 orchestration
│   │   ├── main.py
│   │   └── seed.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/         # Login, Register, AudioList, Upload
│   │   ├── components/    # shared UI
│   │   ├── stores/        # Zustand auth store
│   │   ├── services/      # axios client + API calls
│   │   ├── routes/        # router + ProtectedRoute
│   │   └── types/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vercel.json
├── docs/
│   ├── db-model.md
│   └── architecture.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Running tests

```bash
# Backend
cd backend
python -m pytest

# Frontend (type check)
cd frontend
npm run build
```

---

## Docs

- [Database model & ERD](docs/db-model.md)
- [Architecture diagrams](docs/architecture.md)
