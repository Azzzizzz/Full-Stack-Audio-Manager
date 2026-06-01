from typing import Optional

from beanie import PydanticObjectId
from bson.errors import InvalidId

from app.models.file import File


class FileRepository:
    async def create(self, file: File) -> File:
        await file.insert()
        return file

    async def find_by_id_and_user(self, file_id: str, user_id: str) -> Optional[File]:
        try:
            return await File.find_one(
                File.id == PydanticObjectId(file_id),
                File.user_id == user_id,
            )
        except (ValueError, InvalidId):
            return None

    async def find_by_user(self, user_id: str, limit: int, offset: int) -> list[File]:
        return (
            await File.find(File.user_id == user_id)
            .sort(-File.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

    async def count_by_user(self, user_id: str) -> int:
        return await File.find(File.user_id == user_id).count()

    async def delete(self, file: File) -> None:
        await file.delete()
