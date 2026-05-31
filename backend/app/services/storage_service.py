from typing import IO

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings


def _make_client():
    endpoint = settings.S3_ENDPOINT_URL or f"https://s3.{settings.AWS_REGION}.amazonaws.com"
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        endpoint_url=endpoint,
        config=Config(signature_version="s3v4"),
    )


class StorageService:
    def __init__(self) -> None:
        self._client = _make_client()
        self._bucket = settings.AWS_BUCKET

    def upload_fileobj(self, file: IO[bytes], key: str, content_type: str) -> None:
        self._client.upload_fileobj(
            file,
            self._bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )

    def generate_presigned_get(self, key: str, ttl: int) -> str:
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=ttl,
        )

    def delete_object(self, key: str) -> None:
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
        except ClientError as exc:
            raise RuntimeError(f"S3 delete failed: {exc}") from exc
