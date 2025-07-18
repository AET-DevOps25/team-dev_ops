import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


@pytest.mark.integration
def test_fetch_articles_from_real_arxiv_api():
    """
    Tests the POST /api/v1/articles endpoint by making a real call to arXiv.
    This test is slow and requires an internet connection.
    """
    # Arrange
    # A simple query that should always return results from arXiv
    request_body = {"query": "cat:cs.AI", "limit": 3, "source": "arxiv"}

    # Act
    response = client.post("/api/v1/articles", json=request_body)

    # Assert
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["source"] == "arxiv"
    assert len(json_data["articles"]) > 0
    assert len(json_data["articles"]) <= 3

    # Check the structure of the first article
    article = json_data["articles"][0]
    assert "id" in article
    assert "title" in article
    assert "link" in article
    assert article["source"] == "arxiv"


@pytest.mark.integration
def test_get_categories_from_real_api_success():
    """
    Tests the GET /api/v1/sources/{source}/categories endpoint for a valid source.
    """
    # Act
    response = client.get("/api/v1/sources/arxiv/categories")

    # Assert
    assert response.status_code == 200
    json_data = response.json()
    assert "Computer Science" in json_data
    assert any(cat.startswith("cs.AI") for cat in json_data["Computer Science"])


@pytest.mark.integration
def test_get_categories_from_real_api_failure():
    """
    Tests the GET /api/v1/sources/{source}/categories endpoint for an unsupported source.
    """
    # Act
    response = client.get("/api/v1/sources/unsupported/categories")

    # Assert
    assert response.status_code == 404
    json_data = response.json()
    assert "Source 'unsupported' not found" in json_data["detail"]
