import io

import pytest


FAKE_MP3 = b"\xff\xfb\x90\x00" + b"\x00" * 128  # minimal MP3-like bytes


@pytest.mark.asyncio
async def test_upload_returns_201_with_file_url(auth_http, s3_mock):
    r = await auth_http.post(
        "/audio/upload",
        files={"file": ("test.mp3", io.BytesIO(FAKE_MP3), "audio/mpeg")},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["success"] is True
    data = body["data"]
    assert data["file_name"] == "test.mp3"
    assert data["file_type"] == "audio/mpeg"
    assert "file_url" in data
    assert data["file_url"].startswith("https://")
    assert data["file_metadata"]["size"] == len(FAKE_MP3)


@pytest.mark.asyncio
async def test_upload_non_audio_returns_400(auth_http, s3_mock):
    r = await auth_http.post(
        "/audio/upload",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_upload_requires_auth(http, s3_mock):
    r = await http.post(
        "/audio/upload",
        files={"file": ("test.mp3", io.BytesIO(FAKE_MP3), "audio/mpeg")},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_upload_stored_in_mongo(auth_http, s3_mock):
    from app.models.file import File
    await auth_http.post(
        "/audio/upload",
        files={"file": ("track.mp3", io.BytesIO(FAKE_MP3), "audio/mpeg")},
    )
    docs = await File.find_all().to_list()
    assert len(docs) == 1
    assert docs[0].file_name == "track.mp3"
    assert docs[0].bucket == "test-bucket"
    assert docs[0].key.startswith("users/")
    # presigned url is never stored
    assert not hasattr(docs[0], "file_url")
