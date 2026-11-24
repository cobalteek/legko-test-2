"""create local campaign and stream metadata tables

Revision ID: 0001_initial
Revises:
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if "campaign_metadata" not in tables:
        op.create_table(
            "campaign_metadata",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("remote_id", sa.Integer(), nullable=False),
            sa.Column("geo", sa.String(length=512), nullable=False, server_default=""),
            sa.Column("domain", sa.String(length=255), nullable=False, server_default=""),
            sa.Column("group_name", sa.String(length=255), nullable=False, server_default=""),
            sa.Column("source", sa.String(length=255), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("remote_id"),
        )

    bind = op.get_bind()
    indexes = {index["name"] for index in inspect(bind).get_indexes("campaign_metadata")}
    if "ix_campaign_metadata_remote_id" not in indexes:
        op.create_index("ix_campaign_metadata_remote_id", "campaign_metadata", ["remote_id"], unique=False)

    if "stream_metadata" not in tables:
        op.create_table(
            "stream_metadata",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("campaign_remote_id", sa.Integer(), nullable=False),
            sa.Column("remote_id", sa.Integer(), nullable=False),
            sa.Column("geo", sa.JSON(), nullable=False),
            sa.Column("fallback_url", sa.String(length=2048), nullable=False, server_default=""),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("campaign_remote_id", "remote_id"),
        )

    bind = op.get_bind()
    indexes = {index["name"] for index in inspect(bind).get_indexes("stream_metadata")}
    if "ix_stream_metadata_campaign_remote_id" not in indexes:
        op.create_index("ix_stream_metadata_campaign_remote_id", "stream_metadata", ["campaign_remote_id"], unique=False)
    if "ix_stream_metadata_remote_id" not in indexes:
        op.create_index("ix_stream_metadata_remote_id", "stream_metadata", ["remote_id"], unique=False)


def downgrade() -> None:
    op.drop_table("stream_metadata")
    op.drop_table("campaign_metadata")
