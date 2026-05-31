import time

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_and_verify_roundtrip():
    plain = "correct-horse-battery-staple"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)


def test_wrong_password_fails():
    hashed = hash_password("right")
    assert not verify_password("wrong", hashed)


def test_token_encodes_user_id():
    token = create_access_token("abc123")
    assert decode_access_token(token) == "abc123"


def test_tampered_token_raises():
    token = create_access_token("abc123")
    bad = token[:-4] + "xxxx"
    with pytest.raises(JWTError):
        decode_access_token(bad)


def test_expired_token_raises(monkeypatch):
    import app.core.security as sec
    from datetime import timedelta

    monkeypatch.setattr(sec.settings, "JWT_TTL_MINUTES", 0)
    # force a token that expires in the past by patching timedelta
    original_timedelta = sec.timedelta

    def zero_delta(**_kwargs):
        return original_timedelta(seconds=-1)

    monkeypatch.setattr(sec, "timedelta", zero_delta)
    token = create_access_token("abc123")
    time.sleep(0.1)
    with pytest.raises(JWTError):
        decode_access_token(token)
