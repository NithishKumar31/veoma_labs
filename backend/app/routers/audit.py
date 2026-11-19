from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import AuditLog, User
from ..schemas import AuditLogResponse
from ..auth import require_super_admin

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    query = db.query(AuditLog)
    if module:
        query = query.filter(AuditLog.module == module.upper().strip())
    if action:
        query = query.filter(AuditLog.action == action.upper().strip())
    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
