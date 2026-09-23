from httpx import AsyncClient

from tests.integration.conftest import Account, register


def _code(response) -> str:
    return response.json()["detail"]["code"]


async def test_register_duplicate_email_and_username(client: AsyncClient, alice: Account) -> None:
    response = await client.post(
        "/auth/register",
        json={
            "email": f"{alice.username}@example.com",
            "username": "someone_else_1",
            "password": "correct-horse-battery",
            "display_name": "Dup",
        },
    )
    assert response.status_code == 409
    assert _code(response) == "email_already_taken"


async def test_login_creates_independent_sessions(client: AsyncClient, alice: Account) -> None:
    login = await client.post(
        "/auth/login",
        json={"email": f"{alice.username}@example.com", "password": "correct-horse-battery"},
        headers={"User-Agent": "second-device/1.0"},
    )
    assert login.status_code == 200
    second_token = login.json()["access_token"]

    sessions = (await alice.get("/auth/sessions")).json()
    assert len(sessions) == 2
    current = [s for s in sessions if s["is_current"]]
    assert len(current) == 1 and current[0]["id"] == alice.session_id
    assert {s["device_name"] for s in sessions} == {"alice-phone", "second-device/1.0"}

    # the first session still works after logging in elsewhere
    assert (await alice.get("/users/me")).status_code == 200
    assert (await client.get("/users/me", headers={"Authorization": f"Bearer {second_token}"})).status_code == 200


async def test_wrong_password_is_localized(client: AsyncClient, alice: Account) -> None:
    response = await client.post(
        "/auth/login",
        json={"email": f"{alice.username}@example.com", "password": "wrong-password"},
        headers={"Accept-Language": "ru"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == {"code": "invalid_credentials", "message": "неверный email или пароль"}


async def test_refresh_rotation_and_reuse_detection(client: AsyncClient, alice: Account) -> None:
    first = await client.post("/auth/refresh", json={"refresh_token": alice.refresh_token})
    assert first.status_code == 200
    rotated = first.json()
    assert rotated["session_id"] == alice.session_id
    assert rotated["refresh_token"] != alice.refresh_token

    # reusing the old refresh token revokes the whole session
    reuse = await client.post("/auth/refresh", json={"refresh_token": alice.refresh_token})
    assert reuse.status_code == 401
    assert _code(reuse) == "refresh_token_mismatch"

    after = await client.post("/auth/refresh", json={"refresh_token": rotated["refresh_token"]})
    assert after.status_code == 401
    assert _code(after) == "session_revoked"
    me = await client.get("/users/me", headers={"Authorization": f"Bearer {rotated['access_token']}"})
    assert _code(me) == "session_revoked"


async def test_logout_revokes_only_current_session(client: AsyncClient, alice: Account) -> None:
    other = await client.post(
        "/auth/login", json={"email": f"{alice.username}@example.com", "password": "correct-horse-battery"}
    )
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    assert (await alice.post("/auth/logout")).status_code == 204
    assert _code(await alice.get("/users/me")) == "session_revoked"
    assert (await client.get("/users/me", headers=other_headers)).status_code == 200


async def test_remote_logout(client: AsyncClient, alice: Account, bob: Account) -> None:
    other = await client.post(
        "/auth/login", json={"email": f"{alice.username}@example.com", "password": "correct-horse-battery"}
    )
    other_session = other.json()["session_id"]
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    # another user cannot see or revoke alice's session
    foreign = await bob.delete(f"/auth/sessions/{other_session}")
    assert foreign.status_code == 404
    assert _code(foreign) == "session_not_found"

    assert (await alice.delete(f"/auth/sessions/{other_session}")).status_code == 204
    assert _code(await client.get("/users/me", headers=other_headers)) == "session_revoked"
    assert (await alice.delete(f"/auth/sessions/{other_session}")).status_code == 404
    assert (await alice.get("/users/me")).status_code == 200


async def test_missing_and_invalid_tokens(client: AsyncClient) -> None:
    assert _code(await client.get("/users/me")) == "auth_header_missing"
    bad = await client.get("/users/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert _code(bad) == "access_token_invalid"


async def test_refresh_token_is_not_an_access_token(client: AsyncClient) -> None:
    account = await register(client)
    response = await client.get("/users/me", headers={"Authorization": f"Bearer {account.refresh_token}"})
    assert _code(response) == "access_token_invalid"
