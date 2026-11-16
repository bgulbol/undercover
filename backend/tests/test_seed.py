from fastapi.testclient import TestClient

from backend.db import connect
from backend.main import app
from backend.seed import seed


def test_seed_reports_what_it_loaded(tmp_path, monkeypatch):
    monkeypatch.setenv("UNDERCOVER_DB", str(tmp_path / "test.db"))
    assert seed() == "Loaded 25 claims, 50 policies and 49 customers"


def test_backend_seeds_a_new_database_on_startup(tmp_path, monkeypatch):
    database = tmp_path / "new.db"
    monkeypatch.setenv("UNDERCOVER_DB", str(database))
    with TestClient(app) as client:
        assert database.exists()
        assert len(client.get("/api/claims").json()) == 25


def test_seed_resets_the_queue(client):
    with connect() as db:
        db.execute("UPDATE claims SET status = 'decided'")
    seed()
    claims = client.get("/api/claims").json()
    assert {claim["status"] for claim in claims} == {"waiting"}
