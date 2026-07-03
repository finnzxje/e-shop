from __future__ import annotations

import json
import os
import threading
import time
from dataclasses import dataclass, field
from typing import Any

from app.schemas import ProductCard
from app.services.redis_client import get_client


_REDIS_KEY_PREFIX = "chat:session_memory:"


@dataclass
class SessionMemory:
    previous_products: list[ProductCard] = field(default_factory=list)
    previous_tool_results: list[dict[str, Any]] = field(default_factory=list)
    last_intent: str | None = None
    last_assistant_response: str | None = None
    last_selected_product: ProductCard | None = None
    last_selected_order: dict[str, Any] | None = None


def _ttl_seconds() -> int:
    return int(os.getenv("SESSION_MEMORY_TTL_SECONDS", "86400"))


def _max_size() -> int:
    return int(os.getenv("SESSION_MEMORY_MAX_SIZE", "10000"))


def _redis_key(session_id: str) -> str:
    return f"{_REDIS_KEY_PREFIX}{session_id}"


def _serialize(memory: SessionMemory) -> str:
    payload = {
        "previous_products": [p.model_dump(by_alias=True) for p in memory.previous_products],
        "previous_tool_results": memory.previous_tool_results,
        "last_intent": memory.last_intent,
        "last_assistant_response": memory.last_assistant_response,
        "last_selected_product": memory.last_selected_product.model_dump(by_alias=True) if memory.last_selected_product else None,
        "last_selected_order": memory.last_selected_order,
    }
    return json.dumps(payload, default=str)


def _deserialize(raw: str) -> SessionMemory:
    data = json.loads(raw)
    return SessionMemory(
        previous_products=[ProductCard.model_validate(p) for p in data.get("previous_products", [])],
        previous_tool_results=data.get("previous_tool_results", []),
        last_intent=data.get("last_intent"),
        last_assistant_response=data.get("last_assistant_response"),
        last_selected_product=ProductCard.model_validate(data["last_selected_product"]) if data.get("last_selected_product") else None,
        last_selected_order=data.get("last_selected_order"),
    )


class MemoryService:
    def __init__(self) -> None:
        self._sessions: dict[str, tuple[SessionMemory, float]] = {}
        self._lock = threading.Lock()

    def _purge_expired_unlocked(self, now: float) -> None:
        expired = [k for k, (_, exp) in self._sessions.items() if exp < now]
        for k in expired:
            self._sessions.pop(k, None)

    def _evict_oldest_unlocked(self, count: int) -> None:
        oldest = sorted(self._sessions.items(), key=lambda kv: kv[1][1])[:count]
        for k, _ in oldest:
            self._sessions.pop(k, None)

    def _get_or_create_unlocked(self, session_id: str, now: float, ttl: int, max_size: int) -> SessionMemory:
        entry = self._sessions.get(session_id)
        if entry is not None and entry[1] >= now:
            memory, _ = entry
            self._sessions[session_id] = (memory, now + ttl)
            return memory
        self._purge_expired_unlocked(now)
        if len(self._sessions) >= max_size:
            self._evict_oldest_unlocked(max(1, max_size // 4))
        memory = SessionMemory()
        self._sessions[session_id] = (memory, now + ttl)
        return memory

    def get(self, session_id: str) -> SessionMemory:
        ttl = _ttl_seconds()
        client = get_client()
        if client is not None:
            try:
                raw = client.get(_redis_key(session_id))
                if raw is not None:
                    memory = _deserialize(raw)
                    # Refresh TTL sliding window on access.
                    client.expire(_redis_key(session_id), ttl)
                    return memory
                fresh = SessionMemory()
                client.set(_redis_key(session_id), _serialize(fresh), ex=ttl)
                return fresh
            except Exception:
                pass  # fall through to in-memory
        max_size = _max_size()
        now = time.time()
        with self._lock:
            return self._get_or_create_unlocked(session_id, now, ttl, max_size)

    def update(
        self,
        session_id: str,
        *,
        products: list[ProductCard],
        tool_results: list[dict[str, Any]],
        intent: str,
        assistant_response: str,
        selected_product: ProductCard | None = None,
        selected_order: dict[str, Any] | None = None,
    ) -> None:
        ttl = _ttl_seconds()
        client = get_client()
        if client is not None:
            try:
                raw = client.get(_redis_key(session_id))
                memory = _deserialize(raw) if raw else SessionMemory()
                if products:
                    memory.previous_products = products
                    memory.last_selected_product = selected_product or products[0]
                if tool_results:
                    memory.previous_tool_results = tool_results
                if selected_product:
                    memory.last_selected_product = selected_product
                if selected_order:
                    memory.last_selected_order = selected_order
                memory.last_intent = intent
                memory.last_assistant_response = assistant_response
                client.set(_redis_key(session_id), _serialize(memory), ex=ttl)
                return
            except Exception:
                pass  # fall through to in-memory
        max_size = _max_size()
        now = time.time()
        with self._lock:
            memory = self._get_or_create_unlocked(session_id, now, ttl, max_size)
            if products:
                memory.previous_products = products
                memory.last_selected_product = selected_product or products[0]
            if tool_results:
                memory.previous_tool_results = tool_results
            if selected_product:
                memory.last_selected_product = selected_product
            if selected_order:
                memory.last_selected_order = selected_order
            memory.last_intent = intent
            memory.last_assistant_response = assistant_response

    def clear(self) -> None:
        client = get_client()
        if client is not None:
            try:
                for key in client.scan_iter(match=f"{_REDIS_KEY_PREFIX}*"):
                    client.delete(key)
            except Exception:
                pass
        with self._lock:
            self._sessions.clear()

    def size(self) -> int:
        client = get_client()
        if client is not None:
            try:
                total = 0
                for _ in client.scan_iter(match=f"{_REDIS_KEY_PREFIX}*"):
                    total += 1
                return total
            except Exception:
                pass
        with self._lock:
            return len(self._sessions)


memory_service = MemoryService()
