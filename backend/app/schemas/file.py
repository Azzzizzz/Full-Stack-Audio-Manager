from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FileMetadataSchema(BaseModel):
    duration: Optional[float] = None
    size: Optional[int] = None


class FileResponse(BaseModel):
    id: str
    file_name: str
    file_type: str
    file_url: str
    file_metadata: Optional[FileMetadataSchema] = None
    created_at: datetime
