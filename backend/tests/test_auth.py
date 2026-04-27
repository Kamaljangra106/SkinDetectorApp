"""
Unit tests for auth.py — no DB, no API calls.
"""

import pytest
from jose import JWTError

from auth import create_access_token, decode_token, hash_password, verify_password


def test_hash_and_verify_password():
    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"
    assert verify_password("mysecretpassword", hashed)
    assert not verify_password("wrongpassword", hashed)


def test_create_and_decode_token():
    token = create_access_token(user_id=42, email="test@example.com")
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["email"] == "test@example.com"


def test_decode_invalid_token_raises():
    with pytest.raises(JWTError):
        decode_token("not.a.valid.token")


def test_decode_tampered_token_raises():
    token = create_access_token(user_id=1, email="a@b.com")
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(JWTError):
        decode_token(tampered)
