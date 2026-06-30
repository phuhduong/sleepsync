"""Initial schema (feature_sets, nights, gh_connections, oauth_pending)."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "feature_sets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_feature_sets_user_created", "feature_sets", ["user_id", "created_at"]
    )
    op.create_table(
        "nights",
        sa.Column("night_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("night_id"),
    )
    op.create_index("idx_nights_user_created", "nights", ["user_id", "created_at"])
    op.create_table(
        "gh_connections",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "oauth_pending",
        sa.Column("state", sa.String(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("state"),
    )
    op.create_index("idx_oauth_pending_created", "oauth_pending", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_oauth_pending_created", table_name="oauth_pending")
    op.drop_table("oauth_pending")
    op.drop_table("gh_connections")
    op.drop_index("idx_nights_user_created", table_name="nights")
    op.drop_table("nights")
    op.drop_index("idx_feature_sets_user_created", table_name="feature_sets")
    op.drop_table("feature_sets")
