import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    # Lifespan (which creates tables) only runs when TestClient is used as a
    # context manager — a bare `TestClient(app)` never fires startup.
    with TestClient(app) as c:
        yield c


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_list_message(client):
    response = client.post(
        "/messages",
        json={
            "customer_name": "Test User",
            "channel": "whatsapp",
            "body": "Do you have this in blue?",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["customer"]["name"] == "Test User"

    response = client.get("/messages")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_reply_flow(client):
    create = client.post(
        "/messages",
        json={
            "customer_name": "Reply Test",
            "channel": "messenger",
            "body": "Is this available?",
        },
    )
    message_id = create.json()["id"]

    reply = client.post(
        f"/messages/{message_id}/reply", json={"reply_text": "Yes, it's in stock!"}
    )
    assert reply.status_code == 200
    assert reply.json()["status"] == "replied"
    assert reply.json()["sent_reply"] == "Yes, it's in stock!"


def test_message_not_found(client):
    response = client.get("/messages/99999")
    assert response.status_code == 404


def test_invalid_channel_rejected(client):
    response = client.post(
        "/messages",
        json={"customer_name": "Bad Channel", "channel": "email", "body": "hi"},
    )
    assert response.status_code == 422


def test_suggest_reply_without_api_key_fails_gracefully(client, monkeypatch):
    # Reset the cached client so a key removed by this test actually takes effect,
    # regardless of what ran (or didn't) before it in the same process.
    import app.ai.reply_gen as reply_gen

    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(reply_gen, "_client", None)

    create = client.post(
        "/messages",
        json={"customer_name": "No Key Test", "channel": "whatsapp", "body": "Hi, is this in stock?"},
    )
    message_id = create.json()["id"]

    response = client.post(f"/messages/{message_id}/suggest-reply")
    assert response.status_code == 503
