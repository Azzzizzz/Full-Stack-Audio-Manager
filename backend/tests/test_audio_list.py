import io

import pytest

FAKE_MP3 = b"\xff\xfb\x90\x00" + b"\x00" * 128


async def _upload(client, filename="track.mp3"):
    r = await client.post(
        "/audio/upload",
        files={"file": (filename, io.BytesIO(FAKE_MP3), "audio/mpeg")},
    )
    assert r.status_code == 201
    return r.json()["data"]


@pytest.mark.asyncio
async def test_list_returns_uploaded_files(auth_http, s3_mock):
    await _upload(auth_http, "a.mp3")
    await _upload(auth_http, "b.mp3")

    r = await auth_http.get("/audio")
    assert r.status_code == 200
    body = r.json()
    data = body["data"]
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_list_empty_when_no_uploads(auth_http, s3_mock):
    r = await auth_http.get("/audio")
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_response_shape(auth_http, s3_mock):
    await _upload(auth_http)
    r = await auth_http.get("/audio?limit=10&offset=0")
    data = r.json()["data"]
    assert "items" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    item = data["items"][0]
    assert "id" in item
    assert "file_name" in item
    assert "file_url" in item
    assert "created_at" in item
    assert "file_metadata" in item


@pytest.mark.asyncio
async def test_list_file_url_is_presigned(auth_http, s3_mock):
    await _upload(auth_http)
    r = await auth_http.get("/audio")
    item = r.json()["data"]["items"][0]
    assert item["file_url"].startswith("https://")


@pytest.mark.asyncio
async def test_list_pagination(auth_http, s3_mock):
    for i in range(5):
        await _upload(auth_http, f"track{i}.mp3")

    r = await auth_http.get("/audio?limit=2&offset=0")
    data = r.json()["data"]
    assert len(data["items"]) == 2
    assert data["total"] == 5
    assert data["limit"] == 2
    assert data["offset"] == 0

    r2 = await auth_http.get("/audio?limit=2&offset=2")
    data2 = r2.json()["data"]
    assert len(data2["items"]) == 2

    ids_page1 = {i["id"] for i in data["items"]}
    ids_page2 = {i["id"] for i in data2["items"]}
    assert ids_page1.isdisjoint(ids_page2)


@pytest.mark.asyncio
async def test_list_limit_exceeding_100_returns_400(auth_http, s3_mock):
    r = await auth_http.get("/audio?limit=101")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_list_user_isolation(auth_http, auth_http2, s3_mock):
    await _upload(auth_http, "user1.mp3")
    await _upload(auth_http2, "user2.mp3")

    r1 = await auth_http.get("/audio")
    r2 = await auth_http2.get("/audio")

    items1 = r1.json()["data"]["items"]
    items2 = r2.json()["data"]["items"]

    assert len(items1) == 1
    assert items1[0]["file_name"] == "user1.mp3"

    assert len(items2) == 1
    assert items2[0]["file_name"] == "user2.mp3"


@pytest.mark.asyncio
async def test_list_requires_auth(http, s3_mock):
    r = await http.get("/audio")
    assert r.status_code == 403
