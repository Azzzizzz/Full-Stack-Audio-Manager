from typing import Optional

from beanie import PydanticObjectId

from app.models.user import User


class UserRepository:
    async def create(self, user: User) -> User:
        await user.insert()
        return user

    async def find_by_id(self, user_id: str) -> Optional[User]:
        try:
            return await User.get(PydanticObjectId(user_id))
        except Exception:
            return None

    async def find_by_email(self, email: str) -> Optional[User]:
        return await User.find_one(User.email == email)

    async def exists_by_email(self, email: str) -> bool:
        return await User.find_one(User.email == email) is not None
