import pytest
from fastapi.testclient import TestClient

from agent import main
from backend.main import app
from backend.seed import seed


@pytest.fixture
def client(tmp_path, monkeypatch):
    """The real backend in-process, on a fresh database, for the agent to call."""
    monkeypatch.setenv("UNDERCOVER_DB", str(tmp_path / "test.db"))
    seed()
    monkeypatch.setattr(main, "backend", lambda: TestClient(app))
    return TestClient(app)
