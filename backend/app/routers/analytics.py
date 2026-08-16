from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Message
from app.schemas import AnalyticsSummary

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def summary(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count(Message.id))) or 0
    pending = db.scalar(
        select(func.count(Message.id)).where(Message.status == "pending")
    ) or 0

    by_intent = dict(
        db.execute(
            select(Message.intent, func.count(Message.id))
            .where(Message.intent.is_not(None))
            .group_by(Message.intent)
        ).all()
    )
    by_urgency = dict(
        db.execute(
            select(Message.urgency, func.count(Message.id))
            .where(Message.urgency.is_not(None))
            .group_by(Message.urgency)
        ).all()
    )

    return AnalyticsSummary(
        total=total,
        pending=pending,
        replied=total - pending,
        by_intent=by_intent,
        by_urgency=by_urgency,
    )
