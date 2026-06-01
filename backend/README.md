# SleepSync backend

```
google_health feature sets (K≤7) OR mock_sleep_week fixtures
        + debrief rollups (K≤7)
        → wake-risk classifier → risk curve → constrained optimizer → Profile ("Tonight's Plan")
```

`POST /v1/tonight/plan` ignores client-uploaded mock feature sets for fusion; mock path uses `ml/mock_sleep_bank.py`. Dose is normalized intensity in `[0, 1]`, not clinical mg. HTTP shapes: `models/schemas.py` and OpenAPI `/docs`.

**Plan metadata:** `sleepDataSource` (`google_health` | `mock`), `sleepDataReason` (`using_google`, `insufficient_data`, `not_connected`, `connect_failed`), `coldStart` (internal flag; UI no longer shows limited-history boilerplate).

## Layout

```
backend/
├── app/              # FastAPI routes + plan orchestration
├── integrations/     # Google Health OAuth + REST
├── ml/               # features, risk_model, optimizer, mock_sleep_bank, plan_inputs
├── fixtures/mock_sleep_week/   # shared 7-night JSON for mock path
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

Without OAuth env vars, **Connect Google Health** returns 503; tonight's plan still uses the **mock sleep week**.

**Live sleep data:** follow [`docs/GOOGLE_HEALTH.md`](../docs/GOOGLE_HEALTH.md). Quick checklist:

1. Copy `backend/.env.example` → `.env` and set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`.
2. Register `GOOGLE_HEALTH_REDIRECT_URI` on your **Web application** OAuth client (local default: `http://127.0.0.1:8000/v1/google-health/oauth/callback`).
3. Add test users and **sleep** + **health_metrics** readonly scopes on **Data access**.
4. Restart uvicorn; authorize should return a Google consent URL (not 503).
5. Mobile: `EXPO_PUBLIC_API_URL` points at the API; connect on Tonight.

| Variable | Purpose |
|----------|---------|
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Web server OAuth client |
| `GOOGLE_HEALTH_REDIRECT_URI` | Google redirect (must match Cloud Console) |
| `GOOGLE_HEALTH_APP_RETURN_URI` | App/web URL after token exchange |
| `TOKEN_ENCRYPTION_KEY` | Encrypts refresh tokens in SQLite |

## Night record fields

- `GET /v1/nights/recent` — debrief-complete nights for History (`X-User-Id`)
- `POST /v1/nights/{id}/debrief` — morning questionnaire
- `POST /v1/nights/{id}/wearable-outcome` — post-wake wearable sleep summary
- `POST /v1/nights/{id}/delivery` — dose log from Live
- `POST /v1/google-health/outcome-sync` — pull last night from Google Health after debrief
