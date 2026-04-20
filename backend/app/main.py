from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import ai_models, reservations

# Tworzy tabele jeśli nie istnieją (dev). Na produkcji używaj Alembic.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Portal AI – Rezerwacja Modeli",
    description="Backend REST API dla rezerwacji modeli AI w BGK",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://portal-ai.bank.com.pl",
        "http://10.112.32.19",
        "http://localhost:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_models.router,   prefix="/api")
app.include_router(reservations.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
