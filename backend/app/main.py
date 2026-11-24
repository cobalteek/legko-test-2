from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .keitaro import KeitaroApiError, KeitaroClient
from .models import CampaignMetadata, StreamMetadata
from .schemas import CampaignCreate, CampaignMetadataWrite, CampaignUpdate, StreamUpdate, StreamWrite


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


settings = get_settings()
app = FastAPI(title="Adrobot Keitaro Wrapper", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def keitaro() -> KeitaroClient:
    return KeitaroClient(settings)


def api_error(error: KeitaroApiError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.detail)


def metadata_for_campaign(db: Session, campaign_id: int) -> CampaignMetadata | None:
    return db.scalar(select(CampaignMetadata).where(CampaignMetadata.remote_id == campaign_id))


def upsert_campaign_metadata(
    db: Session,
    campaign_id: int,
    values: CampaignMetadataWrite | None = None,
) -> CampaignMetadata:
    metadata = metadata_for_campaign(db, campaign_id)
    if metadata is None:
        metadata = CampaignMetadata(remote_id=campaign_id)
        db.add(metadata)
    if values is not None:
        metadata.geo = values.geo
        metadata.domain = values.domain
        metadata.group_name = values.group
        metadata.source = values.source
    db.commit()
    db.refresh(metadata)
    return metadata


def stream_metadata_for(db: Session, campaign_id: int, stream_id: int) -> StreamMetadata | None:
    return db.scalar(
        select(StreamMetadata).where(
            StreamMetadata.campaign_remote_id == campaign_id,
            StreamMetadata.remote_id == stream_id,
        )
    )


def save_stream_metadata(db: Session, campaign_id: int, stream: dict[str, Any]) -> None:
    stream_id = stream.get("id")
    if not stream_id:
        return
    metadata = stream_metadata_for(db, campaign_id, stream_id)
    if metadata is None:
        metadata = StreamMetadata(campaign_remote_id=campaign_id, remote_id=stream_id)
        db.add(metadata)
    if "filters" in stream:
        metadata.geo = extract_geo(stream.get("filters"))
    if "action_payload" in stream or "action_options" in stream:
        metadata.fallback_url = extract_fallback(stream)
    remember_stream_offers(metadata, stream.get("offers", []))
    db.commit()


def remember_stream_offers(metadata: StreamMetadata, offers: Any) -> None:
    known = {
        int(item["offer_id"]): dict(item)
        for item in (metadata.offers or [])
        if isinstance(item, dict) and item.get("offer_id") is not None
    }
    if not isinstance(offers, list):
        return

    for offer in offers:
        if not isinstance(offer, dict) or offer.get("offer_id") is None:
            continue
        offer_id = int(offer["offer_id"])
        snapshot = {**known.get(offer_id, {}), "offer_id": offer_id}
        snapshot["share"] = offer.get("share", snapshot.get("share", 0))
        snapshot["state"] = offer.get("state", snapshot.get("state", "active"))
        for field in ("name", "affiliate_network", "country"):
            if field in offer and offer[field] is not None:
                snapshot[field] = offer[field]
        known[offer_id] = snapshot
    metadata.offers = list(known.values())


def stream_with_removed_offers(stream: dict[str, Any], metadata: StreamMetadata | None) -> dict[str, Any]:
    if metadata is None:
        return stream

    remote_offers = stream.get("offers") if isinstance(stream.get("offers"), list) else []
    remote_ids = {
        int(item["offer_id"])
        for item in remote_offers
        if isinstance(item, dict) and item.get("offer_id") is not None
    }
    removed_offers = [
        {
            "offer_id": int(item["offer_id"]),
            "share": item.get("share", 0),
            "state": "removed",
        }
        for item in (metadata.offers or [])
        if isinstance(item, dict)
        and item.get("offer_id") is not None
        and int(item["offer_id"]) not in remote_ids
    ]
    return {**stream, "offers": [*remote_offers, *removed_offers]}


def known_deleted_offers(db: Session, current_ids: set[int]) -> list[dict[str, Any]]:
    result: dict[int, dict[str, Any]] = {}
    for metadata in db.scalars(select(StreamMetadata)).all():
        for item in metadata.offers or []:
            if not isinstance(item, dict) or item.get("offer_id") is None:
                continue
            offer_id = int(item["offer_id"])
            if offer_id in current_ids or offer_id in result:
                continue
            result[offer_id] = {
                "id": offer_id,
                "name": item.get("name") or f"Оффер #{offer_id}",
                "affiliate_network": item.get("affiliate_network") or "Offer",
                "country": item.get("country") or [],
                "state": "deleted",
            }
    return list(result.values())


def remember_offer_catalog(db: Session, offers: list[dict[str, Any]]) -> None:
    catalog = {
        int(offer["id"]): offer
        for offer in offers
        if isinstance(offer, dict) and offer.get("id") is not None
    }
    changed = False
    for metadata in db.scalars(select(StreamMetadata)).all():
        snapshots = metadata.offers or []
        metadata_changed = False
        for snapshot in snapshots:
            if not isinstance(snapshot, dict) or snapshot.get("offer_id") is None:
                continue
            offer = catalog.get(int(snapshot["offer_id"]))
            if not offer:
                continue
            for field in ("name", "affiliate_network", "country"):
                if offer.get(field) is not None and snapshot.get(field) != offer[field]:
                    snapshot[field] = offer[field]
                    changed = True
                    metadata_changed = True
        if metadata_changed:
            metadata.offers = [dict(snapshot) for snapshot in snapshots]
    if changed:
        db.commit()


def stream_metadata_values(metadata: StreamMetadata | None) -> dict[str, Any]:
    return {
        "geo": metadata.geo if metadata else [],
        "fallback_url": metadata.fallback_url if metadata else "",
    }


def extract_geo(filters: Any) -> list[str]:
    if not isinstance(filters, list):
        return []
    for item in filters:
        if isinstance(item, dict) and item.get("name") == "country":
            payload = item.get("payload", [])
            return [str(value).strip().upper() for value in payload if str(value).strip()]
    return []


def extract_fallback(stream: dict[str, Any]) -> str:
    if isinstance(stream.get("action_payload"), str):
        return stream["action_payload"]
    options = stream.get("action_options")
    return options.get("url", "") if isinstance(options, dict) else ""


def stream_payload(payload: StreamWrite | StreamUpdate, campaign_id: int | None = None) -> dict[str, Any]:
    data = payload.model_dump(by_alias=True, exclude_none=True)
    data["campaign_id"] = campaign_id if campaign_id is not None else data.get("campaign_id")
    if data.get("action_payload") is None:
        data.pop("action_payload", None)
    data.pop("action_options", None)
    return data


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "adrobot-keitaro-wrapper"}


@app.get("/api/campaigns")
async def list_campaigns(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    try:
        campaigns = await keitaro().get_campaigns()
    except KeitaroApiError as error:
        raise api_error(error) from error
    result = []
    for campaign in campaigns:
        metadata = upsert_campaign_metadata(db, campaign["id"])
        result.append({**campaign, "metadata": metadata_values(metadata)})
    return result


def metadata_values(metadata: CampaignMetadata) -> dict[str, str]:
    return {
        "geo": metadata.geo,
        "domain": metadata.domain,
        "group": metadata.group_name,
        "source": metadata.source,
    }


@app.get("/api/campaigns/{campaign_id}/streams")
async def list_campaign_streams(campaign_id: int, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    try:
        streams = await keitaro().get_campaign_streams(campaign_id)
    except KeitaroApiError as error:
        raise api_error(error) from error
    for stream in streams:
        save_stream_metadata(db, campaign_id, stream)
    return [
        {
            **stream_with_removed_offers(stream, stream_metadata_for(db, campaign_id, stream["id"])),
            "metadata": stream_metadata_values(stream_metadata_for(db, campaign_id, stream["id"])),
        }
        for stream in streams
    ]


@app.get("/api/offers")
async def list_offers(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    try:
        offers = await keitaro().get_offers()
        remember_offer_catalog(db, offers)
        return offers
    except KeitaroApiError as error:
        raise api_error(error) from error


@app.get("/api/offers/deleted")
async def list_deleted_offers(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    try:
        current_offers = await keitaro().get_offers()
        current_ids = {
            int(offer["id"])
            for offer in current_offers
            if isinstance(offer, dict) and offer.get("id") is not None
        }
        return known_deleted_offers(db, current_ids)
    except KeitaroApiError as error:
        raise api_error(error) from error


@app.get("/api/groups")
async def list_groups() -> list[dict[str, Any]]:
    try:
        return await keitaro().get_groups()
    except KeitaroApiError as error:
        raise api_error(error) from error


@app.get("/api/domains")
async def list_domains() -> list[dict[str, Any]]:
    try:
        return await keitaro().get_domains()
    except KeitaroApiError as error:
        raise api_error(error) from error


@app.get("/api/traffic_sources")
async def list_traffic_sources() -> list[dict[str, Any]]:
    try:
        return await keitaro().get_traffic_sources()
    except KeitaroApiError as error:
        raise api_error(error) from error


@app.put("/api/campaigns/{campaign_id}/metadata")
async def update_campaign_metadata(
    campaign_id: int,
    payload: CampaignMetadataWrite,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    return metadata_values(upsert_campaign_metadata(db, campaign_id, payload))


@app.post("/api/campaigns")
async def create_campaign(payload: CampaignCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        campaign = await keitaro().create_campaign(payload.model_dump(exclude_none=True))
    except KeitaroApiError as error:
        raise api_error(error) from error
    metadata = upsert_campaign_metadata(db, campaign["id"])
    return {**campaign, "metadata": metadata_values(metadata)}


@app.put("/api/campaigns/{campaign_id}")
async def update_campaign(campaign_id: int, payload: CampaignUpdate) -> dict[str, Any]:
    try:
        return await keitaro().update_campaign(campaign_id, payload.model_dump(exclude_none=True))
    except KeitaroApiError as error:
        raise api_error(error) from error


@app.post("/api/campaigns/{campaign_id}/state")
async def update_campaign_state(campaign_id: int, payload: dict[str, str]) -> dict[str, Any]:
    state = payload.get("state")
    if state not in {"active", "disabled"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="state must be active or disabled")
    try:
        return await keitaro().set_campaign_state(campaign_id, state)
    except KeitaroApiError as error:
        raise api_error(error) from error


@app.post("/api/streams")
async def create_stream(payload: StreamWrite, db: Session = Depends(get_db)) -> dict[str, Any]:
    if payload.campaign_id is None:
        raise HTTPException(status_code=422, detail="campaign_id is required")
    try:
        stream = await keitaro().create_stream(stream_payload(payload, payload.campaign_id))
    except KeitaroApiError as error:
        raise api_error(error) from error
    save_stream_metadata(db, payload.campaign_id, stream)
    return stream


@app.put("/api/streams/{stream_id}")
async def update_stream(stream_id: int, payload: StreamUpdate, db: Session = Depends(get_db)) -> dict[str, Any]:
    if payload.campaign_id is None:
        raise HTTPException(status_code=422, detail="campaign_id is required")
    try:
        stream = await keitaro().update_stream(stream_id, stream_payload(payload, payload.campaign_id))
    except KeitaroApiError as error:
        raise api_error(error) from error
    save_stream_metadata(db, payload.campaign_id, stream)
    return stream


@app.delete("/api/streams/{stream_id}")
async def delete_stream(stream_id: int, campaign_id: int, db: Session = Depends(get_db)) -> None:
    try:
        await keitaro().delete_stream(stream_id)
    except KeitaroApiError as error:
        raise api_error(error) from error
    metadata = stream_metadata_for(db, campaign_id, stream_id)
    if metadata is not None:
        db.delete(metadata)
        db.commit()
