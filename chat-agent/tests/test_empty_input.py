from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_empty_message_returns_friendly_200():
    response = client.post(
        "/agent/chat",
        json={"sessionId": "empty-test", "message": ""},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "general"
    assert body["answer"]
    assert "type" in body["answer"].lower() or "message" in body["answer"].lower()


def test_whitespace_only_message_returns_friendly_200():
    response = client.post(
        "/agent/chat",
        json={"sessionId": "ws-test", "message": "   \t  "},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "general"
    assert body["answer"]


def test_nonempty_message_still_runs_full_flow():
    response = client.post(
        "/agent/chat",
        json={"sessionId": "real-test", "message": "what is your return policy"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "policy_or_faq"
