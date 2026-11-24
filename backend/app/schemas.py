from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CampaignCreate(BaseModel):
    alias: str | None = None
    name: str = Field(min_length=1)
    type: Literal["position", "weight"] = "weight"
    state: Literal["active", "disabled"] = "active"
    group_id: int | None = None
    traffic_source_id: int | None = None
    domain_id: int | None = None


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    alias: str | None = None


class StreamWrite(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    campaign_id: int | None = None
    type: Literal["forced", "regular", "default"] = "regular"
    name: str = Field(min_length=1)
    stream_schema: Literal["landings", "redirect", "action"] = Field(
        default="redirect",
        alias="schema",
    )
    action_type: str = "http"
    action_payload: str | None = None
    action_options: dict[str, Any] | None = None
    state: Literal["active", "disabled"] = "active"
    filters: list[dict[str, Any]] = Field(default_factory=list)
    offers: list[dict[str, Any]] = Field(default_factory=list)


class StreamUpdate(StreamWrite):
    campaign_id: int | None = None


class CampaignMetadataWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    geo: str = ""
    domain: str = ""
    group: str = ""
    source: str = ""


class CampaignResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alias: str | None = None
    name: str
    state: str | None = None
    group_id: int | None = None
    traffic_source_id: int | None = None
    domain_id: int | None = None
    created_at: str | None = None
    metadata: CampaignMetadataWrite | None = None
