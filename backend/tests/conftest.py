import pytest
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.main import app
from app.models.file import File
from app.models.user import User


@pytest.fixture(autouse=True)
async def mock_db():
    client = AsyncMongoMockClient()
    await init_beanie(database=client["testdb"], document_models=[User, File])
    yield


@pytest.fixture
async def http():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
