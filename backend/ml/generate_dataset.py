"""Generates a synthetic labeled dataset of customer support messages for training the
intent + urgency classifier. Template + slot-substitution approach: each (intent,
urgency) pair has several sentence templates with placeholders (product/color/size/
location/time/order id), filled with random values to produce lexically varied but
label-accurate examples.

Run: python ml/generate_dataset.py  -> writes ml/data/messages.csv
"""

import csv
import random
from pathlib import Path

random.seed(42)

PRODUCTS = [
    "hoodie", "sneakers", "t-shirt", "handbag", "wrist watch", "backpack",
    "jacket", "phone case", "sunglasses", "wallet", "dress", "sandals",
    "cap", "earrings", "perfume", "kurti", "panjabi",
]
COLORS = ["black", "white", "red", "blue", "navy", "beige", "maroon", "grey", "olive", "pink"]
SIZES = ["S", "M", "L", "XL", "XXL", "38", "40", "42", "free size"]
LOCATIONS = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Cumilla", "Rangpur", "Barisal"]
TIME_REFS = ["2 hours", "3 days", "a week", "5 days", "yesterday", "this morning", "10 days", "2 weeks"]
BULK_N = [10, 15, 20, 25, 30, 50]

TEMPLATES: dict[tuple[str, str], list[str]] = {
    ("Sales Inquiry", "Low"): [
        "Hi, do you have the {color} {product} in size {size}?",
        "What's the price of the {product}?",
        "Is the {product} available in {color}?",
        "Do you have this {product} in other colors?",
        "What material is the {product} made of?",
        "Do you deliver to {location}?",
        "Can you send more photos of the {color} {product}?",
        "Is cash on delivery available for the {product}?",
        "How long does delivery to {location} usually take?",
        "Do you have a size chart for the {product}?",
    ],
    ("Sales Inquiry", "Medium"): [
        "I need the {product} before {time_ref}, is that possible?",
        "Do you offer any discount for bulk orders of {n}+ pieces? Planning to order this week.",
        "I'm ordering {n} pieces for a gift, can you confirm stock today?",
        "Can I get the {color} {product} delivered within {time_ref}? It's for an occasion.",
        "Is express delivery available to {location}? I need it fairly soon.",
        "I want to place a reseller order of {n} pieces, please reply when you can.",
        "Can you hold the {color} {product} for me, I'll pay within {time_ref}?",
    ],
    ("Sales Inquiry", "High"): [
        "I need to order right now before the offer ends, is the {product} still in stock??",
        "URGENT: need {n} pieces of {product} delivered by tomorrow for an event, please confirm ASAP!",
        "Can someone reply fast, I need to know if the {color} {product} is available RIGHT NOW to place the order.",
        "Last chance to order today — is the {product} in size {size} still available?? Need confirmation immediately.",
    ],
    ("Support-Technical", "Low"): [
        "How do I track my order?",
        "What's your return policy?",
        "Can I change my delivery address after ordering?",
        "How do I apply a discount code at checkout?",
        "Do you have a size exchange option for the {product}?",
        "Which courier do you use for delivery to {location}?",
        "Can I cancel my order if it hasn't shipped yet?",
        "Is there a warranty on the {product}?",
        "Can I pay with a card instead of cash on delivery?",
        "Do you have a physical store in {location}?",
    ],
    ("Support-Technical", "Medium"): [
        "My order #{order_id} still shows pending after {time_ref}, can you check?",
        "I paid via bKash but haven't received confirmation, order #{order_id}.",
        "The tracking hasn't updated in {time_ref}, is everything okay with my order?",
        "I think I entered the wrong address for order #{order_id}, can this still be corrected?",
        "Order #{order_id} shows delivered but I haven't received it, can you check with the courier?",
        "Can you confirm if order #{order_id} has shipped yet? It's been {time_ref}.",
    ],
    ("Support-Technical", "High"): [
        "My order #{order_id} was supposed to arrive {time_ref} ago and there's still no update. I need this resolved today.",
        "Payment was deducted twice for order #{order_id}, please fix this immediately.",
        "Order #{order_id} tracking has been stuck for {time_ref}, I need an answer right now.",
        "I paid for order #{order_id} but it got cancelled on your end without any explanation, please fix this urgently.",
    ],
    ("Complaint", "Low"): [
        "The {product} I got is a bit different from the picture, a little disappointed.",
        "Delivery took longer than expected, please improve this.",
        "Packaging was a bit damaged but the {product} itself is fine.",
        "Not totally happy with the {color} shade, it looks different in person.",
    ],
    ("Complaint", "Medium"): [
        "This is the second time my order arrived late. Not happy with the service.",
        "The {product} has a small defect, I'd like a replacement please.",
        "I ordered size {size} but received a different size, please help sort this out.",
        "Customer service hasn't replied in {time_ref}, getting frustrated.",
        "The {color} {product} I received doesn't match what I ordered, please fix this.",
    ],
    ("Complaint", "High"): [
        "This is the third time my order hasn't arrived. I want a refund NOW.",
        "The {product} I received is completely broken and doesn't work at all. Very disappointed, I want my money back immediately.",
        "I've been waiting {time_ref} for a reply about my exchange. Is anyone even reading these messages??",
        "Terrible service! My order #{order_id} never came and nobody is responding. I'm reporting this.",
        "This is unacceptable, order #{order_id} arrived completely damaged and no one is helping me. I want a refund right now.",
        "Extremely disappointed, I messaged {time_ref} ago about my broken {product} and still no response!!",
    ],
    ("Spam-Irrelevant", "Low"): [
        "CONGRATULATIONS!! You won a free {product}, click here to claim!!!",
        "Hello",
        ".",
        "Are you a robot?",
        "Check out my page for the best deals in town!",
        "asdkjaslkdj",
        "hi hi hi test test",
        "Follow me back please",
        "Is this number for sale?",
        "Do you know any good recipe for biryani?",
        "We noticed you like {product}s! Get 90% off today only, limited stock!!",
        "Is this the number for the {location} branch?",
    ],
    ("Spam-Irrelevant", "Medium"): [
        "Win a free {product} today, limited offer, message us back to claim!",
        "We are hiring, send your CV to this number for a great opportunity.",
        "Earn money from home, message me to know how!",
        "Get a free {color} {product} just by sharing this message with 5 friends!",
        "Special offer just for {location} residents — reply to know more!",
        "I can get you {n} followers for cheap, interested?",
        "Looking for models for a photoshoot, are you interested?",
    ],
    ("Spam-Irrelevant", "High"): [
        "URGENT!! Your account will be suspended in 24 hours, click this link now!!!",
        "LAST CHANCE!! Claim your free {product} before midnight, limited slots!!!",
        "ACT NOW!! You've been selected for a cash prize, reply immediately to claim!!!",
        "FINAL WARNING!! Verify your account now or lose access to your free {product} forever!!!",
        "HURRY!! Only {n} free {color} {product}s left, claim yours before they're gone!!!",
        "BREAKING: You've won today's lucky draw!! Reply within 1 hour to claim your prize!!!",
    ],
}


def fill(template: str) -> str:
    return template.format(
        product=random.choice(PRODUCTS),
        color=random.choice(COLORS),
        size=random.choice(SIZES),
        location=random.choice(LOCATIONS),
        time_ref=random.choice(TIME_REFS),
        order_id=random.randint(10000, 99999),
        n=random.choice(BULK_N),
    )


def generate(target_per_combo: int = 40) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for (intent, urgency), templates in TEMPLATES.items():
        seen: set[str] = set()
        attempts = 0
        max_attempts = target_per_combo * 50
        while len(seen) < target_per_combo and attempts < max_attempts:
            attempts += 1
            text = fill(random.choice(templates))
            seen.add(text)
        if len(seen) < target_per_combo:
            print(f"  note: {intent}/{urgency} only reached {len(seen)}/{target_per_combo} unique examples")
        rows.extend((text, intent, urgency) for text in seen)
    random.shuffle(rows)
    return rows


def main():
    rows = generate()
    out_path = Path(__file__).parent / "data" / "messages.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "intent", "urgency"])
        writer.writerows(rows)

    print(f"\nGenerated {len(rows)} rows -> {out_path}")
    for intent in sorted({r[1] for r in rows}):
        counts = {u: sum(1 for r in rows if r[1] == intent and r[2] == u) for u in ("Low", "Medium", "High")}
        print(f"  {intent}: {counts}")


if __name__ == "__main__":
    main()
