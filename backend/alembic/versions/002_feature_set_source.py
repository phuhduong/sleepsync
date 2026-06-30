"""Add source column on feature_sets."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "feature_sets",
        sa.Column("source", sa.String(), nullable=False, server_default="mock"),
    )
    op.create_index(
        "idx_feature_sets_user_source", "feature_sets", ["user_id", "source"]
    )


def downgrade() -> None:
    op.drop_index("idx_feature_sets_user_source", table_name="feature_sets")
    op.drop_column("feature_sets", "source")
