from typing import Any

import httpx

from .config import Settings


class KeitaroApiError(RuntimeError):
    def __init__(self, status_code: int, detail: str):
        super().__init__(f"Keitaro API {status_code}: {detail}")
        self.status_code = status_code
        self.detail = detail


class KeitaroClient:
    def __init__(self, settings: Settings):
        self.base_url = settings.keitaro_api_url.rstrip("/")
        self.headers = {"Accept": "application/json", "Api-Key": settings.keitaro_api_key}
        self.timeout = settings.request_timeout_seconds

    async def request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(
                    method,
                    f"{self.base_url}{path}",
                    headers=self.headers,
                    **kwargs,
                )
        except httpx.HTTPError as error:
            raise KeitaroApiError(502, f"Не удалось подключиться к Keitaro: {error}") from error

        try:
            body = response.json() if response.content else None
        except ValueError:
            body = response.text

        if not response.is_success:
            if isinstance(body, dict):
                detail = body.get("message") or body.get("detail") or str(body)
            else:
                detail = str(body or response.reason_phrase)
            raise KeitaroApiError(response.status_code, detail)
        return body

    async def get_campaigns(self) -> list[dict[str, Any]]:
        return await self.request("GET", "/campaigns", params={"offset": 0, "limit": 1000})

    async def get_campaign_streams(self, campaign_id: int) -> list[dict[str, Any]]:
        return await self.request("GET", f"/campaigns/{campaign_id}/streams")

    async def get_offers(self) -> list[dict[str, Any]]:
        return await self.request("GET", "/offers")

    async def get_groups(self) -> list[dict[str, Any]]:
        return await self.request("GET", "/groups", params={"type": "campaigns"})

    async def get_domains(self) -> list[dict[str, Any]]:
        return await self.request("GET", "/domains")

    async def get_traffic_sources(self) -> list[dict[str, Any]]:
        return await self.request("GET", "/traffic_sources")

    async def create_campaign(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self.request("POST", "/campaigns", json=payload)

    async def update_campaign(self, campaign_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return await self.request("PUT", f"/campaigns/{campaign_id}", json=payload)

    async def set_campaign_state(self, campaign_id: int, state: str) -> dict[str, Any]:
        action = "enable" if state == "active" else "disable"
        return await self.request("POST", f"/campaigns/{campaign_id}/{action}")

    async def create_stream(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self.request("POST", "/streams", json=payload)

    async def update_stream(self, stream_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return await self.request("PUT", f"/streams/{stream_id}", json=payload)

    async def delete_stream(self, stream_id: int) -> None:
        await self.request("DELETE", f"/streams/{stream_id}")
