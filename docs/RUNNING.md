# Local development

## Prerequisites

- Node 18+ and npm
- Python 3.11+
- Optional: [uv](https://github.com/astral-sh/uv)

## Backend

```bash
cd backend
uv venv --python 3.11 && uv pip install -e ".[dev]"
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

API: [http://localhost:8000](http://localhost:8000) (`/healthz`). SQLite database: `./data/sleepsync.db`.

## Mobile

```bash
cd mobile
npm install
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL=http://localhost:8000` in `mobile/.env`. Use your computer's LAN IP when testing on a physical device.

```bash
npm start
```

App UI: [http://localhost:8081](http://localhost:8081). Port 8000 is the JSON API only.

### iOS or Android device (BLE)

Native `ios/` and `android/` folders are generated locally and gitignored. After cloning, or after changing Expo SDK, `app.json` plugins, or any dependency with native code:

```bash
cd mobile
npm install
npm run native:prebuild        # or: npm run native:prebuild:clean
npm run ios             # or: npm run android
```

Use `npx expo install <package>` when adding or upgrading Expo-related dependencies so versions stay aligned with the SDK. Re-run `native:prebuild:clean` when native configuration changes.

Expo Go does not include BLE. Use a dev build (`expo run:ios` / `expo run:android`) or EAS Build.

## Optional configuration

- Google Health: [`GOOGLE_HEALTH.md`](GOOGLE_HEALTH.md), `backend/.env.example`
- BLE patch: [`BLE_PATCH.md`](BLE_PATCH.md), `EXPO_PUBLIC_BLE_ENABLED=1` in `mobile/.env`

## Tests

```bash
cd backend && uv run pytest
cd mobile && npm test -- --watchAll=false
```
