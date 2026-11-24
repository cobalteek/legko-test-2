"""store known stream offers for deleted-offer recovery

Revision ID: 0002_store_stream_offers
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0002_store_stream_offers"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("stream_metadata")}
    if "offers" not in columns:
        op.add_column(
            "stream_metadata",
            sa.Column("offers", sa.JSON(), nullable=False, server_default="[]"),
        )


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("stream_metadata")}
    if "offers" in columns:
        op.drop_column("stream_metadata", "offers")
