"""Seed the database with a handful of demo messages for local testing / first-run UX.

For best results, run after training the classifier (ml/train_classifier.py) so the
seeded messages get real intent/urgency tags instead of nulls:

    python -m app.seed
"""

from sqlalchemy import func, select

from app.ai.classifier import classify_message
from app.db import Base, SessionLocal, engine
from app.models import Customer, Message

DEMO_MESSAGES = [
    ("Rafiq Ahmed", "whatsapp", "Hi, do you have the black hoodie in size L? How much is it?"),
    ("Nadia Islam", "messenger", "This is the third time my order hasn't arrived. I want a refund NOW."),
    ("Tanvir Hasan", "whatsapp", "My payment went through but the order still shows pending, can you check?"),
    ("Promo Bot", "messenger", "CONGRATULATIONS!! You won a free iPhone, click here to claim!!!"),
    ("Sadia Rahman", "whatsapp", "What are your delivery charges outside Dhaka?"),
    ("Kamal Hossain", "messenger", "The product I received is broken and doesn't turn on at all. Very disappointed."),
    ("Farhana Akter", "whatsapp", "Do you offer any discount for bulk orders of 20+ pieces?"),
    ("Imran Chowdhury", "messenger", "Is anyone there? I've been waiting 2 hours for a reply about my exchange."),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.scalar(select(func.count(Message.id))) or 0
        if existing > 0:
            print("Database already has messages — skipping seed.")
            return

        for name, channel, body in DEMO_MESSAGES:
            customer = Customer(name=name, channel=channel)
            db.add(customer)
            db.flush()

            prediction = classify_message(body)
            db.add(Message(customer_id=customer.id, body=body, **prediction))

        db.commit()
        print(f"Seeded {len(DEMO_MESSAGES)} demo messages.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
