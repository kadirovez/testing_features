from httpx import AsyncClient


async def test_request_id_is_generated(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert len(response.headers["x-request-id"]) == 32


async def test_request_id_is_propagated(client: AsyncClient) -> None:
    response = await client.get("/health", headers={"X-Request-ID": "trace-123"})
    assert response.headers["x-request-id"] == "trace-123"


async def test_request_id_on_error_responses(client: AsyncClient) -> None:
    response = await client.get("/no-such-route", headers={"X-Request-ID": "trace-404"})
    assert response.status_code == 404
    assert response.headers["x-request-id"] == "trace-404"
