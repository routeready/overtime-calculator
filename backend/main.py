from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.routers import auth, ask, admin, billing


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path("corpus").mkdir(exist_ok=True)
    yield


app = FastAPI(
    title="Mining Bible API",
    description="Canadian mining regulations Q&A platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ask.router)
app.include_router(admin.router)
app.include_router(billing.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mining-bible", "port": settings.app_port}


# Serve the built React frontend as static files in production.
# In development, the Vite dev server handles frontend (proxied via CORS above).
_frontend_dist = Path("frontend/dist")
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")
