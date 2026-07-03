from __future__ import annotations

from app.main import _extract_bearer_token


def test_valid_bearer_returns_token():
    assert _extract_bearer_token("Bearer abc.def.ghi") == "abc.def.ghi"


def test_case_insensitive_scheme():
    assert _extract_bearer_token("bearer xyz") == "xyz"
    assert _extract_bearer_token("BEARER xyz") == "xyz"


def test_empty_token_after_bearer_returns_none():
    assert _extract_bearer_token("Bearer ") is None
    assert _extract_bearer_token("Bearer  ") is None
    assert _extract_bearer_token("Bearer \t") is None


def test_missing_header_returns_none():
    assert _extract_bearer_token(None) is None
    assert _extract_bearer_token("") is None


def test_non_bearer_scheme_returns_none():
    assert _extract_bearer_token("Basic dXNlcjpwYXNz") is None


def test_token_whitespace_trimmed():
    assert _extract_bearer_token("Bearer  spaced.token  ") == "spaced.token"
