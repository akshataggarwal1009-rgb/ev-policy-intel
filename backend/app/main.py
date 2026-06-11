import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import policies, incentives, admin, chat, map_data, compare, ingestion, analytics

app = FastAPI(
    title="EV Policy Intelligence Platform",
    version="0.1.0",
    description="Query, browse, compare, and benchmark EV policies across Indian jurisdictions and global markets.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = int((time.perf_counter() - start) * 1000)
    response.headers["X-Process-Time-Ms"] = str(ms)
    return response


app.include_router(policies.router, prefix="/api/v1")
app.include_router(incentives.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(map_data.router, prefix="/api/v1")
app.include_router(compare.router, prefix="/api/v1")
app.include_router(ingestion.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
