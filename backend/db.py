"""The UnderCover database: SQLite at UNDERCOVER_DB, or backend/undercover.db."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

DATA = Path(__file__).parent.parent / "data"
DEFAULT_PATH = Path(__file__).parent / "undercover.db"

SCHEMA = """
CREATE TABLE policies (policy_id TEXT PRIMARY KEY, record TEXT NOT NULL);
CREATE TABLE customers (customer_id TEXT PRIMARY KEY, record TEXT NOT NULL);
CREATE TABLE claims (
    claim_id TEXT PRIMARY KEY,
    record TEXT NOT NULL,
    status TEXT NOT NULL,
    thread_id TEXT,
    decision TEXT,
    payout REAL,
    reason TEXT,
    policy_section TEXT,
    decided_at TEXT,
    paid_amount REAL,
    paid_at TEXT
);
CREATE TABLE steps (
    step_id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def db_path() -> Path:
    """Return the path of the database file."""
    return Path(os.getenv("UNDERCOVER_DB", str(DEFAULT_PATH)))


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """Open the database in a transaction that commits on success."""
    connection = sqlite3.connect(db_path())
    connection.row_factory = sqlite3.Row
    try:
        with connection:
            yield connection
    finally:
        connection.close()
