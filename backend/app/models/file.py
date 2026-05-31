from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed, before_event, Insert, Replace, SaveChanges
from pydantic import BaseModel


class FileMetadata(BaseModel):
    duration: Optional[float] = None  # seconds
    size: Optional[int] = None  # bytes


class File(Document):
    user_id: Indexed(str)
    file_type: str
    file_name: str
    bucket: str
    key: str
    file_metadata: Optional[FileMetadata] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Settings:
        name = "files"

    @before_event(Insert)
    def set_created(self):
        now = datetime.now(timezone.utc)
        self.created_at = now
        self.updated_at = now

    @before_event(Replace, SaveChanges)
    def set_updated(self):
        self.updated_at = datetime.now(timezone.utc)
