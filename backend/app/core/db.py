import logging

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logger = logging.getLogger(__name__)


async def init_db() -> None:
    from app.models.user import User
    from app.models.file import File

    try:
        client = AsyncIOMotorClient(settings.MONGO_URI)
        db_name = settings.MONGO_URI.rsplit("/", 1)[-1].split("?")[0] or "meeami"
        await init_beanie(database=client[db_name], document_models=[User, File])
        logger.info("MongoDB connected")
    except Exception as exc:
        logger.error("MongoDB connection failed: %s", exc)
        raise
