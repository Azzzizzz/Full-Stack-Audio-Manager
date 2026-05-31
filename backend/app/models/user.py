from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed, before_event, Insert, Replace, SaveChanges
from pydantic import EmailStr


class User(Document):
    first_name: str
    last_name: str
    email: Indexed(EmailStr, unique=True)
    hashed_password: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Settings:
        name = "users"

    @before_event(Insert)
    def set_created(self):
        now = datetime.now(timezone.utc)
        self.created_at = now
        self.updated_at = now

    @before_event(Replace, SaveChanges)
    def set_updated(self):
        self.updated_at = datetime.now(timezone.utc)
