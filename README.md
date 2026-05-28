# SleepSync

Personalized overnight melatonin delivery. Expo app, FastAPI backend, optional ESP8266 patch.

## Team

- Charles Muehlberger ([@charlespers](https://github.com/charlespers))
- Phu Duong ([@phuhduong](https://github.com/phuhduong))
- Jaime Nunez ([@Jaimenunez10](https://github.com/Jaimenunez10))
- Tom Wang ([@tom05919](https://github.com/tom05919))

## Quick start

[`docs/RUNNING.md`](docs/RUNNING.md) for the full loop. [`backend/README.md`](backend/README.md) for the API. [`docs/GOOGLE_HEALTH.md`](docs/GOOGLE_HEALTH.md) for Google Health setup.

```bash
# API
cd backend && python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]" && uvicorn app.main:app --reload --port 8000

# App
cd mobile && npm install && cp .env.example .env && npm start
```

Copy [`mobile/.env.example`](mobile/.env.example) and [`backend/.env.example`](backend/.env.example) as needed.

## Sleep data

**Default:** mock sleep week + your debriefs. No Google account needed for Tonight → Live → Debrief → History.

**Google Health (optional):** connect in the app to personalize from your sleep and vitals. Set `GOOGLE_OAUTH_CLIENT_ID` and `SECRET` in `backend/.env` ([setup](docs/GOOGLE_HEALTH.md)). Without OAuth, plans stay on mock sleep data. Real API access is a small beta: [sign up](https://forms.gle/1Ae3kLFhcMLq6JDi9) with the Gmail you will use to connect.
