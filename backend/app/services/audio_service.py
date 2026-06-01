import io
import logging
from pathlib import Path
from typing import Optional
from uuid import uuid4

import mutagen
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.models.file import File, FileMetadata
from app.models.user import User
from app.repositories.file_repository import FileRepository
from app.schemas.file import FileMetadataSchema, FileResponse
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

ALLOWED_MIME_PREFIXES = ("audio/",)
MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
LIST_PRESIGN_TTL = 3600   # 60 min
PLAY_PRESIGN_TTL = 900    # 15 min


def _extract_duration(content: bytes) -> Optional[float]:
    try:
        audio = mutagen.File(io.BytesIO(content))
        if audio and hasattr(audio, "info") and hasattr(audio.info, "length"):
            return audio.info.length
    except Exception:
        pass
    return None


class AudioService:
    def __init__(self) -> None:
        self._file_repo = FileRepository()
        self._storage = StorageService()

    async def upload_audio(self, file: UploadFile, user: User) -> FileResponse:
        if not file.content_type or not any(
            file.content_type.startswith(p) for p in ALLOWED_MIME_PREFIXES
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Only audio files are accepted", "code": "INVALID_FILE_TYPE"},
            )

        content = await file.read()
        if len(content) > MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"message": "File exceeds the 50 MB limit", "code": "FILE_TOO_LARGE"},
            )

        ext = Path(file.filename or "").suffix.lstrip(".") or "bin"
        key = f"users/{user.id}/audio/{uuid4()}.{ext}"

        duration = _extract_duration(content)
        self._storage.upload_fileobj(io.BytesIO(content), key, file.content_type)
        logger.info("uploaded file user=%s key=%s size=%d", user.id, key, len(content))

        file_doc = File(
            user_id=str(user.id),
            file_name=file.filename or key.split("/")[-1],
            file_type=file.content_type,
            bucket=settings.AWS_BUCKET,
            key=key,
            file_metadata=FileMetadata(duration=duration, size=len(content)),
        )
        file_doc = await self._file_repo.create(file_doc)

        file_url = self._storage.generate_presigned_get(key, ttl=LIST_PRESIGN_TTL)
        return _to_response(file_doc, file_url)

    async def list_audio(self, user: User, limit: int, offset: int) -> dict:
        files = await self._file_repo.find_by_user(str(user.id), limit, offset)
        total = await self._file_repo.count_by_user(str(user.id))
        items = [
            _to_response(f, self._storage.generate_presigned_get(f.key, ttl=LIST_PRESIGN_TTL))
            for f in files
        ]
        return {"items": items, "total": total, "limit": limit, "offset": offset}

    async def get_play_url(self, file_id: str, user: User) -> str:
        file_doc = await self._file_repo.find_by_id_and_user(file_id, str(user.id))
        if file_doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        return self._storage.generate_presigned_get(file_doc.key, ttl=PLAY_PRESIGN_TTL)

    async def delete_audio(self, file_id: str, user: User) -> None:
        file_doc = await self._file_repo.find_by_id_and_user(file_id, str(user.id))
        if file_doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        try:
            self._storage.delete_object(file_doc.key)
        except RuntimeError as exc:
            logger.error("S3 delete failed file_id=%s: %s", file_id, exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"message": "Storage delete failed", "code": "STORAGE_ERROR"},
            ) from exc
        await self._file_repo.delete(file_doc)
        logger.info("deleted file user=%s file_id=%s", user.id, file_id)


def _to_response(file_doc: File, file_url: str) -> FileResponse:
    meta = file_doc.file_metadata
    return FileResponse(
        id=str(file_doc.id),
        file_name=file_doc.file_name,
        file_type=file_doc.file_type,
        file_url=file_url,
        file_metadata=FileMetadataSchema(
            duration=meta.duration if meta else None,
            size=meta.size if meta else None,
        ),
        created_at=file_doc.created_at,
    )
