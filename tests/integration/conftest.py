from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient, Response

from app.main import app

pytestmark = pytest.mark.integration


@dataclass
class Account:
    """A registered test user with a live session."""

    client: AsyncClient
    user_id: str
    username: str
    access_token: str
    refresh_token: str
    session_id: str

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}

    async def get(self, url: str, **kwargs: Any) -> Response:
        return await self.client.get(url, headers={**self.headers, **kwargs.pop("headers", {})}, **kwargs)

    async def post(self, url: str, **kwargs: Any) -> Response:
        return await self.client.post(url, headers={**self.headers, **kwargs.pop("headers", {})}, **kwargs)

    async def patch(self, url: str, **kwargs: Any) -> Response:
        return await self.client.patch(url, headers={**self.headers, **kwargs.pop("headers", {})}, **kwargs)

    async def put(self, url: str, **kwargs: Any) -> Response:
        return await self.client.put(url, headers={**self.headers, **kwargs.pop("headers", {})}, **kwargs)

    async def delete(self, url: str, **kwargs: Any) -> Response:
        return await self.client.delete(url, headers={**self.headers, **kwargs.pop("headers", {})}, **kwargs)


@pytest.fixture(scope="session")
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as http_client:
        yield http_client


async def register(client: AsyncClient, device: str = "pytest-device") -> Account:
    suffix = uuid4().hex[:12]
    username = f"u_{suffix}"
    response = await client.post(
        "/auth/register",
        json={
            "email": f"{username}@example.com",
            "username": username,
            "password": "correct-horse-battery",
            "display_name": f"User {suffix}",
            "device_name": device,
        },
    )
    assert response.status_code == 201, response.text
    tokens = response.json()
    me = await client.get("/users/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200, me.text
    return Account(
        client=client,
        user_id=me.json()["id"],
        username=username,
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        session_id=tokens["session_id"],
    )


@pytest.fixture
async def alice(client: AsyncClient) -> Account:
    return await register(client, "alice-phone")


@pytest.fixture
async def bob(client: AsyncClient) -> Account:
    return await register(client, "bob-laptop")


@pytest.fixture
async def carol(client: AsyncClient) -> Account:
    return await register(client, "carol-tablet")
