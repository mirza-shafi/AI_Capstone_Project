from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    channel: str


class MessageCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=120)
    channel: str = Field(default="messenger", pattern="^(messenger|whatsapp)$")
    body: str = Field(min_length=1)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    intent: str | None
    intent_confidence: float | None
    urgency: str | None
    urgency_confidence: float | None
    suggested_reply: str | None
    sent_reply: str | None
    status: str
    created_at: datetime
    replied_at: datetime | None
    customer: CustomerOut


class ReplyIn(BaseModel):
    reply_text: str = Field(min_length=1)


class AnalyticsSummary(BaseModel):
    total: int
    pending: int
    replied: int
    by_intent: dict[str, int]
    by_urgency: dict[str, int]
