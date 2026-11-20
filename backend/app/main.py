import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .config import UPLOAD_DIR, COMPANY_NAME, COMPANY_TAGLINE, BASE_DIR
from .database import engine, Base, SessionLocal
from .seed import seed_data
from .routers import (
    auth, users, customers, orders, inventory, printers,
    expenses, salaries, workshops, gst, reports, settings, audit, backup
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed default records
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_data(db)
    yield
    # Shutdown

app = FastAPI(
    title="Veoma Labs — Business Management System",
    description=f"{COMPANY_NAME} — {COMPANY_TAGLINE}. Complete ERP and Financial Management Application.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for receipt uploads and model images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include API Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(inventory.router)
app.include_router(printers.router)
app.include_router(expenses.router)
app.include_router(salaries.router)
app.include_router(workshops.router)
app.include_router(gst.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(audit.router)
app.include_router(backup.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "company": COMPANY_NAME,
        "tagline": COMPANY_TAGLINE,
        "app": "Veoma Labs Business Management System"
    }

# Serve Frontend static assets if built
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't intercept API or upload routes
        if full_path.startswith("api") or full_path.startswith("uploads") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
