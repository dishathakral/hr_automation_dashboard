from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.entities import AuditLog, User
from app.schemas import AuditLogResponse

router = APIRouter()

@router.get("", response_model=List[AuditLogResponse])
@router.get("/", response_model=List[AuditLogResponse], include_in_schema=False)
def list_audit_logs(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the immutable audit log for compliance, HR overrides, and data governance.
    """
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type.upper())
    if action:
        query = query.filter(AuditLog.action == action.upper())
    return query.order_by(AuditLog.timestamp.desc()).all()

