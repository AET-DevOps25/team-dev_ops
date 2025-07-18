import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch

from src.main import app
from niche_explorer_models.models.article import Article

client = TestClient(app)


@pytest.fixture
def mock_fetcher():
    """Mocks the arxiv_fetcher imported by the main router."""
    with patch("src.main.arxiv_fetcher", new_callable=MagicMock) as mock:
        mock.fetch = AsyncMock()
        yield mock


def test_fetch_articles_success(mock_fetcher):
    """
    Tests POST /api/v1/articles successfully.
    Verifies that the endpoint correctly calls the service and returns a 200 OK.
    """
    # Arrange
    request_body = {"query": "cat:cs.AI", "limit": 10, "source": "arxiv"}
    # Return a real Article object to satisfy Pydantic validation
    mock_article = Article(
        id="123", title="Test", link="http://example.com", source="arxiv"
    )
    mock_fetcher.fetch.return_value = [mock_article]

    # Act
    response = client.post("/api/v1/articles", json=request_body)

    # Assert
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["source"] == "arxiv"
    assert "articles" in json_data
    mock_fetcher.fetch.assert_awaited_once_with(query="cat:cs.AI", max_results=10)


def test_fetch_articles_unsupported_source():
    """
    Tests that a 400 is returned for an unsupported source, as per openapi.yaml.
    """
    # Arrange
    request_body = {"query": "test", "limit": 10, "source": "unsupported"}

    # Act
    response = client.post("/api/v1/articles", json=request_body)

    # Assert
    assert response.status_code == 422  # FastAPI's validation for enums handles this


def test_get_arxiv_categories():
    """
    Tests GET /api/v1/sources/arxiv/categories.
    """
    # Act
    response = client.get("/api/v1/sources/arxiv/categories")

    # Assert
    assert response.status_code == 200
    json_data = response.json()
    # Check for a known category to ensure the static data is loaded
    assert "Computer Science" in json_data
    assert any(cat.startswith("cs.AI") for cat in json_data["Computer Science"])


def test_get_categories_unsupported_source():
    """
    Tests that a 404 is returned for a source with no categories defined.
    """
    # Act
    response = client.get("/api/v1/sources/unsupported/categories")

    # Assert
    assert response.status_code == 404
    assert "Source 'unsupported' not found." in response.json()["detail"]
