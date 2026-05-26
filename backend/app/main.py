"""FastAPI app — SleepSync personalization backend."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from models.schemas import HealthResponse

from .config import get_config
from .routes import dev, features, google_health, nights, plan


def create_app() -> FastAPI:
    config = get_config()
    app = FastAPI(
        title="SleepSync backend",
        version="0.1.0",
        description=(
            "Wake-risk classifier + constrained release optimizer. "
            "Dose values are normalized release "
            "intensity in [0, 1] — not clinical mg."
        ),
    )

    if config.cors.allow_all:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origin_regex=config.cors.allow_origin_regex,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(features.router)
    app.include_router(plan.router)
    app.include_router(nights.router)
    app.include_router(google_health.router)
    app.include_router(dev.router)

    @app.get("/healthz", response_model=HealthResponse, tags=["meta"])
    def healthz() -> HealthResponse:
        return HealthResponse(
            status="ok",
            riskModel=config.versions.risk_model,
            optimizer=config.versions.optimizer,
        )

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def root() -> str:
        """Avoid a blank browser tab when someone opens the API port by mistake."""
        return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SleepSync API</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0c10; color: #e8e6e3;
           max-width: 36rem; margin: 3rem auto; padding: 0 1.25rem; line-height: 1.5; }
    a { color: #9b8cff; }
    code { background: #1a1c24; padding: 0.15em 0.4em; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>SleepSync API</h1>
  <p>This port serves the JSON backend only — not the mobile UI.</p>
  <p>Open the Expo app at <a href="http://localhost:8081">http://localhost:8081</a>
     after <code>cd mobile &amp;&amp; npm start</code> (press <strong>w</strong> for web).</p>
  <p>API docs: <a href="/docs">/docs</a> · health: <a href="/healthz">/healthz</a></p>
</body>
</html>"""

    return app


app = create_app()
