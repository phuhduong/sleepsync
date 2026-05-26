# SleepSync

Personalized overnight melatonin delivery — Expo app, FastAPI backend, optional ESP8266 patch.

## Team

- Charles Muehlberger — [@charlespers](https://github.com/charlespers)
- Phu Duong — [@phuhduong](https://github.com/phuhduong)
- Jaime Nunez — [@Jaimenunez10](https://github.com/Jaimenunez10)
- Tom Wang — [@tom05919](https://github.com/tom05919)

## Quick start

See [`docs/RUNNING.md`](docs/RUNNING.md). API setup and Google OAuth: [`backend/README.md`](backend/README.md).

```bash
# API
cd backend && python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]" && uvicorn app.main:app --reload --port 8000

# App
cd mobile && npm install && cp .env.example .env && npm start
```

Copy [`mobile/.env.example`](mobile/.env.example) and [`backend/.env.example`](backend/.env.example) as needed.
