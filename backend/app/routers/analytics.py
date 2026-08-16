from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Customer, Message
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
    by_channel = dict(
        db.execute(
            select(Customer.channel, func.count(Message.id))
            .join(Customer, Message.customer_id == Customer.id)
            .group_by(Customer.channel)
        ).all()
    )

    # Computed in Python rather than a DB-side date-diff function, since SQLite and
    # Postgres (dev vs. production, see render.yaml) don't share one portable syntax
    # for it — this table is small enough that it's not a real cost either way.
    response_times = db.execute(
        select(Message.created_at, Message.replied_at).where(Message.replied_at.is_not(None))
    ).all()
    avg_response_minutes = None
    if response_times:
        deltas_minutes = [(replied - created).total_seconds() / 60 for created, replied in response_times]
        avg_response_minutes = round(sum(deltas_minutes) / len(deltas_minutes), 1)

    return AnalyticsSummary(
        total=total,
        pending=pending,
        replied=total - pending,
        by_intent=by_intent,
        by_urgency=by_urgency,
        by_channel=by_channel,
        avg_response_minutes=avg_response_minutes,
    )
