from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from groq import APIError
from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.ai.classifier import classify_message
from app.ai.reply_gen import generate_reply
from app.db import get_db
from app.models import Customer, Message
from app.schemas import MessageCreate, MessageOut, ReplyIn

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=MessageOut, status_code=201)
def create_message(payload: MessageCreate, db: Session = Depends(get_db)):
    customer = db.scalar(
        select(Customer).where(
            Customer.name == payload.customer_name, Customer.channel == payload.channel
        )
    )
    if customer is None:
        customer = Customer(name=payload.customer_name, channel=payload.channel)
        db.add(customer)
        db.flush()

    prediction = classify_message(payload.body)
    message = Message(customer_id=customer.id, body=payload.body, **prediction)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("", response_model=list[MessageOut])
def list_messages(
    status: str | None = "pending",
    intent: str | None = None,
    db: Session = Depends(get_db),
):
    urgency_rank = case(
        (Message.urgency == "High", 0),
        (Message.urgency == "Medium", 1),
        (Message.urgency == "Low", 2),
        else_=3,
    )
    query = select(Message).order_by(urgency_rank, Message.created_at)
    if status:
        query = query.where(Message.status == status)
    if intent:
        query = query.where(Message.intent == intent)
    return db.scalars(query).all()


@router.get("/{message_id}", response_model=MessageOut)
def get_message(message_id: int, db: Session = Depends(get_db)):
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.post("/{message_id}/classify", response_model=MessageOut)
def reclassify_message(message_id: int, db: Session = Depends(get_db)):
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    prediction = classify_message(message.body)
    for field, value in prediction.items():
        setattr(message, field, value)
    db.commit()
    db.refresh(message)
    return message


@router.post("/{message_id}/suggest-reply", response_model=MessageOut)
def suggest_reply(message_id: int, db: Session = Depends(get_db)):
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    try:
        message.suggested_reply = generate_reply(message.body, message.intent)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except APIError as exc:
        raise HTTPException(status_code=502, detail=f"AI provider error: {exc}") from exc

    db.commit()
    db.refresh(message)
    return message


@router.post("/{message_id}/reply", response_model=MessageOut)
def send_reply(message_id: int, payload: ReplyIn, db: Session = Depends(get_db)):
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    message.sent_reply = payload.reply_text
    message.status = "replied"
    message.replied_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)
    return message
