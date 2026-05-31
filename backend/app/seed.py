"""
Idempotent seed: creates a demo user if one doesn't already exist.
Run with: python -m app.seed
"""
import asyncio

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.models.file import File

DEMO_EMAIL = "demo@meeami.dev"
DEMO_PASSWORD = "Demo1234!"


async def seed():
    db_name = settings.MONGO_URI.rsplit("/", 1)[-1].split("?")[0] or "meeami"
    client = AsyncIOMotorClient(settings.MONGO_URI)
    await init_beanie(database=client[db_name], document_models=[User, File])

    existing = await User.find_one(User.email == DEMO_EMAIL)
    if existing:
        print(f"Demo user already exists: {DEMO_EMAIL}")
        return

    user = User(
        first_name="Demo",
        last_name="User",
        email=DEMO_EMAIL,
        hashed_password=hash_password(DEMO_PASSWORD),
    )
    await user.insert()
    print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())
