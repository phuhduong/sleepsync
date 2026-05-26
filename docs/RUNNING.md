# Running SleepSync locally

Complete one full night in the app: **Tonight → Apply → Live → Debrief → History**.

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

## 3. Tonight tab

1. Open **Tonight** — status should show personalized plan or offline fallback.
2. Optionally **Connect Google Health** (sandbox works without Google Cloud credentials when OAuth env is unset).
3. Adjust **Bedtime** / **Wake** if needed.

## 4. Fast-forward time (dev builds only)

The overnight profile is ~8 hours. In `__DEV__` builds, open the **circadian debug panel** (dev overlay) and scrub or accelerate simulated time:

1. Move time to **before bedtime**.
2. Tap **Apply Patch Tonight** → **Live** opens.
3. Advance time through the sleep window until the session ends (auto-opens **Debrief**).

## 5. Complete the loop

1. **Debrief** — answer woke / grogginess, tap save.
2. **History** — confirm the night appears with curve and summary.
3. Return to **Tonight** — plan should refresh; a second night may reflect last debrief rollups when using mock features.

## Dev reset

In `__DEV__`, the circadian debug panel **Clear all history** (confirm twice) removes:

- Local History (`AsyncStorage` sessions)
- Cached tonight plan on device
- Backend SQLite for your user (`POST /v1/dev/purge` — nights, feature sets, Google Health connection)

Restart the API after manually deleting `backend/data/sleepsync.db` if you want a full file reset without the app.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Plan stuck loading | Start backend; check `EXPO_PUBLIC_API_URL` |
| Apply disabled | Set simulated time **before** bedtime |
| CORS on web | Backend allows localhost; use LAN IP for odd setups |
| `nightId` missing after restart | Ensure backend uses SQLite (`data/sleepsync.db` exists) |

## Google Health (optional)

Live OAuth needs a **Web server** client and `https://` redirect URI on your API host. See [backend/README.md](../backend/README.md).

Without Google credentials, the backend runs in **sandbox** mode (synthetic sleep data).

## Tests

```bash
cd backend && uv run pytest
cd mobile && npm test -- --watchAll=false
```
