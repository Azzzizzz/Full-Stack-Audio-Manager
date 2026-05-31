import io

import boto3
import pytest
from moto import mock_aws

from app.core.config import settings

BUCKET = "test-bucket"


@pytest.fixture(autouse=True)
def aws_env(monkeypatch):
    monkeypatch.setattr(settings, "AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setattr(settings, "AWS_SECRET_ACCESS_KEY", "test")
    monkeypatch.setattr(settings, "AWS_REGION", "us-east-1")
    monkeypatch.setattr(settings, "AWS_BUCKET", BUCKET)
    monkeypatch.setattr(settings, "S3_ENDPOINT_URL", None)


@mock_aws
def test_upload_and_presign():
    # create bucket in the mock
    boto3.client("s3", region_name="us-east-1").create_bucket(Bucket=BUCKET)

    from app.services.storage_service import StorageService
    svc = StorageService()

    data = b"hello audio"
    svc.upload_fileobj(io.BytesIO(data), "users/1/test.mp3", "audio/mpeg")

    url = svc.generate_presigned_get("users/1/test.mp3", ttl=3600)
    assert "users/1/test.mp3" in url
    assert "Signature" in url or "X-Amz-Signature" in url


@mock_aws
def test_delete_object():
    boto3.client("s3", region_name="us-east-1").create_bucket(Bucket=BUCKET)

    from app.services.storage_service import StorageService
    svc = StorageService()

    svc.upload_fileobj(io.BytesIO(b"data"), "users/1/del.mp3", "audio/mpeg")
    svc.delete_object("users/1/del.mp3")

    s3 = boto3.client("s3", region_name="us-east-1")
    objects = s3.list_objects_v2(Bucket=BUCKET).get("Contents", [])
    assert not any(o["Key"] == "users/1/del.mp3" for o in objects)


@mock_aws
def test_presign_ttl_reflected():
    boto3.client("s3", region_name="us-east-1").create_bucket(Bucket=BUCKET)

    from urllib.parse import parse_qs, urlparse
    from app.services.storage_service import StorageService
    svc = StorageService()

    svc.upload_fileobj(io.BytesIO(b"x"), "k", "audio/mpeg")
    url_short = svc.generate_presigned_get("k", ttl=900)
    url_long = svc.generate_presigned_get("k", ttl=3600)

    def expiry(url: str) -> int:
        qs = parse_qs(urlparse(url).query)
        # SigV4 uses X-Amz-Expires; SigV2 uses Expires (absolute epoch)
        if "X-Amz-Expires" in qs:
            return int(qs["X-Amz-Expires"][0])
        return int(qs["Expires"][0])

    assert expiry(url_short) < expiry(url_long)
