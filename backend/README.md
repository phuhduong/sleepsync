# SleepSync backend

```
features → wake-risk classifier → risk curve → constrained optimizer → Profile
```

Dose is normalized intensity in `[0, 1]`, not clinical mg. HTTP shapes: `models/schemas.py` and OpenAPI `/docs`.

## Layout

```
backend/
├── app/              # FastAPI routes + plan orchestration
├── integrations/     # Google Health OAuth + REST + sandbox
├── ml/               # features, risk_model, optimizer
├── models/schemas.py
├── storage/          # SQLite (SLEEPSYNC_DB_PATH)
└── tests/
```

## Run

```bash
cd backend
uv venv --python 3.11 && uv pip install -e ".[dev]"
uv run uvicorn app.main:app --reload --port 8000
```

Set `EXPO_PUBLIC_API_URL=http://localhost:8000` on mobile. Data persists in `./data/sleepsync.db` by default.

## Tests

```bash
uv run pytest
```

## Quickstart

```bash
curl -s http://localhost:8000/healthz
curl -s -X POST http://localhost:8000/v1/dev/mock-features \
  -H 'content-type: application/json' -d '{"userId":"demo-user"}'
curl -s -X POST http://localhost:8000/v1/tonight/plan \
  -H 'content-type: application/json' -H 'X-User-Id: demo-user' \
  -d '{"userId":"demo-user","bedtimeMinutes":1380,"wakeMinutes":420,
       "timezone":"America/New_York","referenceNow":"2026-05-25T22:00:00-04:00"}'
```

## Google Health

Without OAuth env vars, the backend runs in **sandbox** mode (synthetic `google_health` data). For live OAuth, copy `.env.example` → `.env` and set:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Web server OAuth client |
| `GOOGLE_HEALTH_REDIRECT_URI` | `https://<api-host>/v1/google-health/oauth/callback` |
| `GOOGLE_HEALTH_APP_RETURN_URI` | `sleepsync://google-health/callback` |
| `TOKEN_ENCRYPTION_KEY` | Encrypts refresh tokens in SQLite |

Mobile: `EXPO_PUBLIC_API_URL`; optional `EXPO_PUBLIC_GOOGLE_HEALTH_ENABLED=1`.

## Night record fields

- `POST /v1/nights/{id}/debrief` — morning questionnaire
- `POST /v1/nights/{id}/wearable-outcome` — post-wake wearable sleep summary
- `POST /v1/nights/{id}/delivery` — dose log from Live
- `POST /v1/google-health/outcome-sync` — pull last night from Google Health after debrief
