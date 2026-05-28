# Running SleepSync locally

Complete one full loop in the app: **Tonight → Apply → Live → Debrief → History** (past sessions).

Estimated time: ~15 minutes (a few minutes with dev time controls).

## Prerequisites

- Node 18+ and npm
- Python 3.11+
- Optional: [uv](https://github.com/astral-sh/uv) for the backend venv

## 1. Backend API

```bash
cd backend
uv venv --python 3.11 && uv pip install -e ".[dev]"
# or: python3.11 -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"

cp .env.example .env   # optional — Google OAuth not required for first run

uv run uvicorn app.main:app --reload --port 8000
```

Verify: [http://localhost:8000/healthz](http://localhost:8000/healthz) returns `{"status":"ok"}`.

Night records and feature sets persist under `./data/sleepsync.db` by default (`SLEEPSYNC_DB_PATH` in `.env`).

## 2. Mobile app

```bash
cd mobile
npm install
cp .env.example .env
```

Edit `mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000
```

On a **physical device**, use your computer’s LAN IP instead of `localhost` (e.g. `http://192.168.1.42:8000`).

```bash
npm start
# then press i (iOS sim), a (Android), or w (web)
```

**Web UI URL:** [http://localhost:8081](http://localhost:8081) — not port 8000.  
Port **8000** is the API only (`/healthz`, `/docs`). Opening `http://localhost:8000/` in a browser shows API metadata, not the app.

## 3. Tonight tab

1. Open **Tonight** — hero shows **Tonight's Plan** and a provenance line (mock sleep data by default, or Google Health when synced).
2. **Connect Google Health** is optional and needs OAuth credentials in `backend/.env` (see [`docs/GOOGLE_HEALTH.md`](GOOGLE_HEALTH.md)). Without them, skip connect; the plan uses the mock sleep week. **Disconnect Google Health** clears the cached plan and refetches.
3. Adjust **Bedtime** / **Wake** if needed.

## 4. Fast-forward time (dev builds only)

The overnight profile is ~8 hours. In `__DEV__` builds, open the **circadian debug panel** (dev overlay) and scrub or accelerate simulated time:

1. Move time to **before bedtime**.
2. Tap **Apply Patch Tonight** → **Live** opens.
3. Advance time through the sleep window until the session ends (auto-opens **Debrief**).

## 5. Complete the loop

1. **Debrief** — answer woke / grogginess, tap save (**Good Morning** screen).
2. **History** — confirm the session appears under **Recent sessions** (grogginess chart needs two+ sessions for a trend line).
3. Return to **Tonight** — plan refetches; debriefs on the server adjust the next curve (mock week or Google nights + debrief K).

## Dev reset

In `__DEV__`, the circadian debug panel **Clear all history** (confirm twice) removes:

- Local History (`AsyncStorage` sessions)
- Cached tonight plan on device
- Backend SQLite for your user (`POST /v1/dev/purge` — nights, feature sets, Google Health connection)

Restart the API after manually deleting `backend/data/sleepsync.db` if you want a full file reset without the app.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Black / empty browser | Use **http://localhost:8081** (Expo), not :8000 (API). Wait for Metro “Web Bundled”, then reload. |
| Plan stuck loading | Start backend; check `EXPO_PUBLIC_API_URL` |
| Apply disabled | Set simulated time **before** bedtime |
| CORS on web | Backend allows localhost; use LAN IP for odd setups |
| `nightId` missing after restart | Ensure backend uses SQLite (`data/sleepsync.db` exists) |

## Google Health (optional)

**No OAuth configured:** Connect returns 503; plans still work on the mock sleep week.

**Live data:** [`docs/GOOGLE_HEALTH.md`](GOOGLE_HEALTH.md) (Cloud Console, `.env`, connect on Tonight).

## Tests

```bash
cd backend && uv run pytest
cd mobile && npm test -- --watchAll=false
```
