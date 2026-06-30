# Backend

FastAPI service that produces tonight's plan: a wake-risk curve and an optimized dose profile. See [../README.md](../README.md).

## Plan pipeline

```
google_health feature sets (≤7 nights)  OR  mock_sleep_week fixtures
        + debrief rollups (≤7 mornings)
        → wake-risk classifier
        → risk curve
        → constrained optimizer (SLSQP)
        → Profile (keyframes + phases)
```

`POST /v1/tonight/plan` fuses feature sets server-side. Clients do not upload sleep data for optimization. Without Google Health rows, `ml/mock_sleep_bank.py` reschedules shared fixtures onto the user's bed/wake grid.

Dose is normalized `[0, 1]`. Default risk model: `heuristic-v0`. Optional weights file: `RISK_MODEL_ARTIFACT`.

## Layout

| Path | Role |
|------|------|
| `app/routes/` | HTTP handlers |
| `app/services.py` | Plan orchestration |
| `ml/` | Features, risk model, optimizer, mock fixtures |
| `integrations/google_health.py` | OAuth + Health API |
| `storage/` | SQLAlchemy + Alembic |
| `models/schemas.py` | Shared API types |

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/tonight/plan` | Generate or reuse an open night |
| GET | `/v1/nights/recent` | Debrief-complete nights |
| GET | `/v1/nights/{id}` | Single night record |
| POST | `/v1/nights/{id}/debrief` | Morning debrief |
| POST | `/v1/nights/{id}/delivery` | Dose samples from Live |
| POST | `/v1/nights/{id}/wearable-outcome` | Wearable summary |
| GET | `/v1/google-health/status` | Connection state |
| GET | `/v1/google-health/oauth/authorize` | Start OAuth |
| POST | `/v1/google-health/sync` | Pull sleep features |
| POST | `/v1/google-health/outcome-sync` | Post-debrief outcome |
| DELETE | `/v1/google-health/connection` | Revoke tokens |
| GET | `/healthz` | Liveness |

Google Health behavior: [../docs/GOOGLE_HEALTH.md](../docs/GOOGLE_HEALTH.md). OpenAPI `/docs` when `SLEEPSYNC_ENV=development`.

## Auth and storage

Production uses Supabase JWT (`SUPABASE_JWT_SECRET`). Local dev without that secret accepts `X-User-Id`. Night routes check `night.userId`.

JSON documents in SQLAlchemy tables. SQLite locally, Postgres via `DATABASE_URL`.

## Run and test

[../docs/RUNNING.md](../docs/RUNNING.md). Tests: `uv run pytest`
