"""Add SSID tracking to Wi-Fi Stalker

Revision ID: a3f8d1c4e9b2
Revises: 785d812e2ea3
Create Date: 2026-02-16 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f8d1c4e9b2'
down_revision: Union[str, None] = '785d812e2ea3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add current_ssid to tracked devices
    with op.batch_alter_table('stalker_tracked_devices', schema=None) as batch_op:
        batch_op.add_column(sa.Column('current_ssid', sa.String(), nullable=True))

    # Add ssid to connection history
    with op.batch_alter_table('stalker_connection_history', schema=None) as batch_op:
        batch_op.add_column(sa.Column('ssid', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('stalker_connection_history', schema=None) as batch_op:
        batch_op.drop_column('ssid')

    with op.batch_alter_table('stalker_tracked_devices', schema=None) as batch_op:
        batch_op.drop_column('current_ssid')
