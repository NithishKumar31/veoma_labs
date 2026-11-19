import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..auth import require_super_admin, log_audit
from ..config import BACKUP_DIR, DATABASE_URL, BASE_DIR

router = APIRouter(prefix="/api/backup", tags=["Database Backup & Restore"])

@router.get("")
def list_backups(admin: User = Depends(require_super_admin)) -> List[Dict[str, Any]]:
    backups = []
    for f in sorted(BACKUP_DIR.glob("*.db"), reverse=True):
        stat = f.stat()
        backups.append({
            "filename": f.name,
            "size_bytes": stat.st_size,
            "size_kb": round(stat.st_size / 1024, 2),
            "created_at": datetime.fromtimestamp(stat.st_ctime).strftime("%d-%m-%Y %H:%M:%S")
        })
    return backups

@router.post("/create")
def create_backup(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"veoma_backup_{timestamp_str}.db"
    backup_path = BACKUP_DIR / backup_filename

    if "sqlite" in DATABASE_URL:
        # Perform safe SQLite online backup
        source_db_path = BASE_DIR / "veoma_business.db"
        if not source_db_path.exists():
            raise HTTPException(status_code=500, detail="Source database file not found")

        src = sqlite3.connect(source_db_path)
        dst = sqlite3.connect(backup_path)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()
    else:
        # Fallback file copy
        shutil.copyfile(BASE_DIR / "veoma_business.db", backup_path)

    log_audit(
        db=db,
        user=admin,
        action="BACKUP",
        module="SYSTEM",
        remarks=f"Created database backup: {backup_filename}"
    )
    db.commit()

    stat = backup_path.stat()
    return {
        "message": "Database backup created successfully",
        "filename": backup_filename,
        "size_kb": round(stat.st_size / 1024, 2),
        "timestamp": timestamp_str
    }

@router.get("/download/{filename}")
def download_backup(
    filename: str,
    admin: User = Depends(require_super_admin)
):
    clean_filename = Path(filename).name
    filepath = BACKUP_DIR / clean_filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Backup file not found")
    return FileResponse(filepath, filename=clean_filename, media_type="application/octet-stream")
