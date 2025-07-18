import pytest
import os
from dotenv import load_dotenv
from fastapi.testclient import TestClient
import uuid
from src.main import app

# Load environment variables from the project root .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../../../.env"))

# Import the FastAPI app to be tested

# ----------------------------------------
# Test client (shared across integration tests)
# ----------------------------------------

# Create a single TestClient instance for all tests
client = TestClient(app)


# --- Endpoint E2E Tests ---


@pytest.mark.integration
def test_classify_endpoint_real_llm_call():
    """
    Tests the POST /api/v1/classify endpoint against the real LLM.
    This is a slow test that requires a valid CHAIR_API_KEY.
    """
    if not os.getenv("CHAIR_API_KEY"):
        pytest.skip("CHAIR_API_KEY not found, skipping /classify integration test.")

    request_body = {"query": "What are the latest trends in computer vision?"}
    response = client.post("/api/v1/classify", json=request_body)

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["source"] in ["arxiv", "reddit"]
    assert isinstance(json_response["suggested_category"], str)
    assert len(json_response["suggested_category"]) > 0


@pytest.mark.integration
def test_query_build_endpoint_real_llm_call():
    """
    Tests the POST /api/v1/query/build/{source} endpoint against the real LLM.
    Requires CHAIR_API_KEY.
    """
    if not os.getenv("CHAIR_API_KEY"):
        pytest.skip("CHAIR_API_KEY not found, skipping /query/build integration test.")

    source = "arxiv"
    request_body = {"search_terms": "graph neural networks in computer vision"}
    response = client.post(f"/api/v1/query/build/{source}", json=request_body)

    assert response.status_code == 200
    json_response = response.json()
    assert "query" in json_response
    assert isinstance(json_response["query"], str)
    # A simple check to see if the LLM produced a somewhat valid query
    assert "graph" in json_response["query"].lower()
    assert "vision" in json_response["query"].lower()


@pytest.mark.integration
def test_classify_endpoint_invalid_request():
    """Tests that the classify endpoint returns a 400 for an empty query."""
    request_body = {"query": " "}
    response = client.post("/api/v1/classify", json=request_body)
    assert response.status_code == 400
    assert "Query cannot be empty" in response.json()["detail"]["message"]


@pytest.mark.integration
def test_embedding_endpoint_invalid_request():
    """Tests that the embeddings endpoint returns a 400 for mismatched IDs and texts."""
    request_body = {"texts": ["one text"], "ids": ["one_id", "two_id"]}  # Mismatch
    response = client.post("/api/v1/embeddings", json=request_body)
    assert response.status_code == 400
    assert "The number of texts and ids must be the same." in response.json()["detail"]


@pytest.mark.integration
def test_embedding_endpoints_real_caching_flow():
    """
    Tests the POST and GET /api/v1/embeddings endpoints with real dependencies.
    Requires GOOGLE_API_KEY.
    Relies on the Postgres+pgvector cache that runs in Docker-compose.
    """
    if not os.getenv("GOOGLE_API_KEY"):
        pytest.skip("GOOGLE_API_KEY not found, skipping embeddings integration test.")

    doc_id = f"integration-doc-{uuid.uuid4()}"

    # 1. POST to generate and cache an embedding (cache miss)
    post_request = {
        "texts": ["This is a real integration test for caching."],
        "ids": [doc_id],
    }
    post_response = client.post("/api/v1/embeddings", json=post_request)
    assert post_response.status_code == 200
    post_json = post_response.json()
    assert post_json["cached_count"] == 0
    assert len(post_json["embeddings"]) == 1
    embedding_vector = post_json["embeddings"][0]
    assert isinstance(embedding_vector, list)
    assert len(embedding_vector) > 0

    # 2. GET to retrieve the embedding from the cache
    get_response = client.get(f"/api/v1/embeddings?ids={doc_id}")
    assert get_response.status_code == 200
    get_json = get_response.json()
    assert get_json["found_count"] == 1
    assert get_json["embeddings"][0] == embedding_vector

    # 3. POST again to verify the cache is used (cache hit)
    post_response_2 = client.post("/api/v1/embeddings", json=post_request)
    assert post_response_2.status_code == 200
    post_json_2 = post_response_2.json()
    assert post_json_2["cached_count"] == 1
    assert len(post_json_2["embeddings"]) == 1
    assert post_json_2["embeddings"][0] == embedding_vector


@pytest.mark.integration
def test_get_embeddings_endpoint():
    """Tests retrieving embeddings by ID."""
    # First, create an embedding
    doc_id = f"integration-doc-{uuid.uuid4()}"
    request_body = {
        "texts": ["This is a real integration test for retrieving embeddings."],
        "ids": [doc_id],
    }
    response = client.post("/api/v1/embeddings", json=request_body)
    assert response.status_code == 200
    post_json = response.json()
    assert post_json["cached_count"] == 0
    assert len(post_json["embeddings"]) == 1
    embedding_vector = post_json["embeddings"][0]
    assert isinstance(embedding_vector, list)
    assert len(embedding_vector) > 0

    # Then, retrieve the embedding
    get_response = client.get(f"/api/v1/embeddings?ids={doc_id}")
    assert get_response.status_code == 200
    get_json = get_response.json()
    assert get_json["found_count"] == 1
    assert get_json["embeddings"][0] == embedding_vector
