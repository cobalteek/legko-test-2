from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class CampaignMetadata(Base):
    """Local metadata that the Keitaro catalog does not expose on a campaign list."""

    __tablename__ = "campaign_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    remote_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    geo: Mapped[str] = mapped_column(String(512), default="")
    domain: Mapped[str] = mapped_column(String(255), default="")
    group_name: Mapped[str] = mapped_column(String(255), default="")
    source: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class StreamMetadata(Base):
    """Local stream details used to keep editor-only display values across reloads."""

    __tablename__ = "stream_metadata"
    __table_args__ = (UniqueConstraint("campaign_remote_id", "remote_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_remote_id: Mapped[int] = mapped_column(Integer, index=True)
    remote_id: Mapped[int] = mapped_column(Integer, index=True)
    geo: Mapped[list[str]] = mapped_column(JSON, default=list)
    fallback_url: Mapped[str] = mapped_column(String(2048), default="")
    offers: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
