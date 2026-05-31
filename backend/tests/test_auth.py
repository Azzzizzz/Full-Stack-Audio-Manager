import pytest
from httpx import AsyncClient

from app.core.security import decode_access_token


async def _register(http: AsyncClient, email="a@example.com", password="pw123"):
    return await http.post("/register", json={
        "first_name": "Test", "last_name": "User",
        "email": email, "password": password,
    })


@pytest.mark.asyncio
async def test_register_success(http):
    r = await _register(http)
    assert r.status_code == 201
    body = r.json()
    assert body["success"] is True
    assert body["data"]["email"] == "a@example.com"
    assert "hashed_password" not in body["data"]


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(http):
    await _register(http)
    r = await _register(http)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_login_success_returns_jwt(http):
    await _register(http, "b@example.com", "secret99")
    r = await http.post("/login", json={"email": "b@example.com", "password": "secret99"})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    assert decode_access_token(token)  # resolves to a user_id string


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(http):
    await _register(http, "c@example.com", "right")
    r = await http.post("/login", json={"email": "c@example.com", "password": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(http):
    r = await http.post("/login", json={"email": "nobody@example.com", "password": "x"})
    assert r.status_code == 401
