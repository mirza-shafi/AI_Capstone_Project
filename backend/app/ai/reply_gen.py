import os

from anthropic import Anthropic

FAQ_CONTEXT = """
Business policy quick reference:
- Standard delivery: 3-5 business days within Dhaka, 5-7 days outside Dhaka.
- Returns/exchanges accepted within 7 days of delivery if the item is unused and in original packaging.
- Payment methods: Cash on Delivery, bKash, Nagad, and card payment.
- Bulk orders (10+ pieces) get a 10% discount; contact the team to confirm stock before paying.
""".strip()

SYSTEM_PROMPT = f"""You are a customer support assistant drafting reply suggestions for a \
small business's Facebook/WhatsApp support inbox. Write a short, friendly, professional \
reply (2-4 sentences) that a human agent can send after a quick edit. Use the business \
information below when relevant, but don't invent details you don't have (like exact \
order status) — if the message needs order-specific info you don't have, write a reply \
that acknowledges the issue and says the team is checking, rather than making something up.

{FAQ_CONTEXT}"""

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set — add it to backend/.env to enable reply suggestions."
            )
        _client = Anthropic(api_key=api_key)
    return _client


def generate_reply(message_text: str, intent: str | None) -> str:
    client = _get_client()
    intent_line = f"Detected intent: {intent}\n" if intent else ""
    user_prompt = f'{intent_line}Customer message: "{message_text}"\n\nDraft a reply.'

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text.strip()
