from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.entities import Notification, User
from app.schemas import NotificationResponse

router = APIRouter()

@router.get("", response_model=List[NotificationResponse])
@router.get("/", response_model=List[NotificationResponse], include_in_schema=False)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns dispatch logs for all automated Email and SMS notifications.
    """
    return db.query(Notification).order_by(Notification.sent_at.desc()).all()

