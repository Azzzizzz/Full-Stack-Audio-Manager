from fastapi import HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse


class AuthService:
    def __init__(self) -> None:
        self._repo = UserRepository()

    async def register(self, req: RegisterRequest) -> UserResponse:
        if await self._repo.exists_by_email(req.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"message": "Email already registered", "code": "EMAIL_TAKEN"},
            )

        user = User(
            first_name=req.first_name,
            last_name=req.last_name,
            email=req.email,
            hashed_password=hash_password(req.password),
        )
        user = await self._repo.create(user)

        return UserResponse(
            id=str(user.id),
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            created_at=user.created_at,
        )

    async def login(self, req: LoginRequest) -> TokenResponse:
        user = await self._repo.find_by_email(req.email)
        if user is None or not verify_password(req.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Invalid credentials", "code": "INVALID_CREDENTIALS"},
            )

        token = create_access_token(str(user.id))
        return TokenResponse(
            access_token=token,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
        )
