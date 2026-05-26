"""FastAPI app — SleepSync personalization backend."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

    return app


app = create_app()
