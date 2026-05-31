from fastapi import APIRouter, Depends, Request, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.auth import SuccessResponse
from app.services.audio_service import AudioService

router = APIRouter(tags=["audio"])
_svc = AudioService()


@router.post("/audio/upload", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_UPLOAD)
async def upload_audio(
    request: Request,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
):
    data = await _svc.upload_audio(file, current_user)
    return SuccessResponse(data=data)


@router.get("/audio", response_model=SuccessResponse)
async def list_audio(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
):
    if limit > 100:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "limit cannot exceed 100", "code": "INVALID_PARAM"},
        )
    data = await _svc.list_audio(current_user, limit, offset)
    return SuccessResponse(data=data)


@router.get("/audio/{file_id}/play", response_model=SuccessResponse)
async def play_audio(
    file_id: str,
    current_user: User = Depends(get_current_user),
):
    url = await _svc.get_play_url(file_id, current_user)
    return SuccessResponse(data={"file_url": url})


@router.delete("/audio/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_audio(
    file_id: str,
    current_user: User = Depends(get_current_user),
):
    await _svc.delete_audio(file_id, current_user)
