import boto3
import pytest
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from moto import mock_aws
from mongomock_motor import AsyncMongoMockClient

from app.core.config import settings
from app.main import app
from app.models.file import File
from app.models.user import User

TEST_BUCKET = "test-bucket"


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Clear in-memory rate limit counters before each test."""
    from app.core.limiter import limiter
    limiter._storage.reset()
    yield


@pytest.fixture(autouse=True)
async def mock_db():
    client = AsyncMongoMockClient()
    await init_beanie(database=client["testdb"], document_models=[User, File])
    yield


@pytest.fixture
def s3_mock(monkeypatch):
    monkeypatch.setattr(settings, "AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setattr(settings, "AWS_SECRET_ACCESS_KEY", "test")
    monkeypatch.setattr(settings, "AWS_REGION", "us-east-1")
    monkeypatch.setattr(settings, "AWS_BUCKET", TEST_BUCKET)
    monkeypatch.setattr(settings, "S3_ENDPOINT_URL", None)

    with mock_aws():
        boto3.client("s3", region_name="us-east-1").create_bucket(Bucket=TEST_BUCKET)
        yield


@pytest.fixture
async def http():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth_http(http):
    """HTTP client pre-authenticated with a registered user's JWT."""
    await http.post("/register", json={
        "first_name": "Test", "last_name": "User",
        "email": "user@example.com", "password": "password123",
    })
    r = await http.post("/login", json={"email": "user@example.com", "password": "password123"})
    token = r.json()["data"]["access_token"]
    http.headers.update({"Authorization": f"Bearer {token}"})
    return http
