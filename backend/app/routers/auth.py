from fastapi import APIRouter, Request, status

from app.core.config import settings
from app.core.limiter import limiter
from app.schemas.auth import LoginRequest, RegisterRequest, SuccessResponse
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])
_svc = AuthService()


@router.post("/register", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(request: Request, body: RegisterRequest):
    data = await _svc.register(body)
    return SuccessResponse(data=data)


@router.post("/login", response_model=SuccessResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(request: Request, body: LoginRequest):
    data = await _svc.login(body)
    return SuccessResponse(data=data)
