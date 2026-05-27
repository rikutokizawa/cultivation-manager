from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.api import router as api_router
from backend.app.core.config import get_settings
from backend.app.db.schema import ensure_schema
from backend.app.db.session import engine

settings = get_settings()
settings.ensure_directories()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.ensure_directories()
    ensure_schema(engine)
    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{settings.frontend_port}",
        "http://127.0.0.1:3000",
        *settings.frontend_allowed_origin_list,
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/images",
    StaticFiles(directory=str(settings.resolved_image_storage_path)),
    name="images",
)

app.include_router(api_router)
