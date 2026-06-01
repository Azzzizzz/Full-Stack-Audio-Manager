import io

import pytest

FAKE_MP3 = b"\xff\xfb\x90\x00" + b"\x00" * 128


async def _upload(client, filename="track.mp3") -> str:
    r = await client.post(
        "/audio/upload",
        files={"file": (filename, io.BytesIO(FAKE_MP3), "audio/mpeg")},
    )
    assert r.status_code == 201
    return r.json()["data"]["id"]


# ---------------------------------------------------------------------------
# GET /audio/{id}/play
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_play_returns_presigned_url(auth_http, s3_mock):
    file_id = await _upload(auth_http)
    r = await auth_http.get(f"/audio/{file_id}/play")
    assert r.status_code == 200
    data = r.json()["data"]
    assert "file_url" in data
    assert data["file_url"].startswith("https://")


@pytest.mark.asyncio
async def test_play_cross_user_returns_404(auth_http, auth_http2, s3_mock):
    file_id = await _upload(auth_http)
    r = await auth_http2.get(f"/audio/{file_id}/play")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_play_invalid_id_returns_404(auth_http, s3_mock):
    r = await auth_http.get("/audio/000000000000000000000000/play")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_play_requires_auth(http, s3_mock):
    r = await http.get("/audio/000000000000000000000000/play")
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# DELETE /audio/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_removes_file(auth_http, s3_mock):
    from app.models.file import File

    file_id = await _upload(auth_http)
    r = await auth_http.delete(f"/audio/{file_id}")
    assert r.status_code == 204

    remaining = await File.find_all().to_list()
    assert len(remaining) == 0


@pytest.mark.asyncio
async def test_delete_cross_user_returns_404(auth_http, auth_http2, s3_mock):
    file_id = await _upload(auth_http)
    r = await auth_http2.delete(f"/audio/{file_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_cross_user_does_not_remove_file(auth_http, auth_http2, s3_mock):
    from app.models.file import File

    file_id = await _upload(auth_http)
    await auth_http2.delete(f"/audio/{file_id}")

    remaining = await File.find_all().to_list()
    assert len(remaining) == 1


@pytest.mark.asyncio
async def test_delete_invalid_id_returns_404(auth_http, s3_mock):
    r = await auth_http.delete("/audio/000000000000000000000000")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_requires_auth(http, s3_mock):
    r = await http.delete("/audio/000000000000000000000000")
    assert r.status_code == 403
