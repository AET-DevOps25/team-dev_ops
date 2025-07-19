import pytest
from unittest.mock import MagicMock, patch
from src.services.embedding_service import EmbeddingService


@pytest.fixture
def mock_embedding_service():
    """
    Set up a fully mocked EmbeddingService for isolated unit testing.

    This fixture uses `unittest.mock.patch` as a context manager to temporarily
    replace external dependencies of the `EmbeddingService` with mock objects.
    This allows us to test the service's internal logic without making real
    network calls to Google or connecting to a Postgres database.

    The patches target the specific modules *as they are seen by the file under
    test* (`src.services.embedding_service`).

    Yields:
        A tuple containing:
        - service: An instance of `EmbeddingService` created with mocked dependencies.
        - fake_cur: A mock of the database cursor for asserting DB calls.
        - mock_google_embed: A mock of the Google embeddings client.
    """
    with patch(
        "src.services.embedding_service.GoogleGenerativeAIEmbeddings"
    ) as mock_google_client, patch(
        "src.services.embedding_service.psycopg2.connect"
    ) as mock_pg, patch(
        #  We must  patch `register_vector` because it is called
        # inside `EmbeddingService.__init__`. The real function would fail
        # when given a mocked connection object, raising a "vector type not
        # found" error. This patch replaces it with a do-nothing mock for the
        # duration of the test.
        "src.services.embedding_service.register_vector"
    ) as _mock_register_vector, patch(
        "src.services.embedding_service.execute_batch"
    ) as mock_execute_batch:
        # --- Mock the Google Embeddings Client ---
        # `GoogleGenerativeAIEmbeddings` is a class. We mock its constructor
        # to return a controllable instance.
        mock_google_embed_instance = MagicMock()
        mock_google_embed_instance.embed_documents = MagicMock(
            return_value=[[1.0, 1.1], [2.0, 2.1]]  # Default return for batch embeds
        )
        mock_google_client.return_value = mock_google_embed_instance

        # --- Mock the Postgres Database Connection ---
        # `psycopg2.connect` is a function. We mock it to return a fake
        # connection object, which in turn provides a fake cursor.
        fake_cur = MagicMock()
        fake_conn = MagicMock()
        # Ensure the `with conn.cursor() as cur:` pattern works
        fake_conn.cursor.return_value.__enter__.return_value = fake_cur
        mock_pg.return_value = fake_conn

        # Now, when we instantiate the service, its `__init__` will use our mocks
        service = EmbeddingService()

        # Yield the service and mocks so tests can use them and make assertions
        yield service, fake_cur, mock_google_embed_instance, mock_execute_batch


def test_embedding_service_initialization(mock_embedding_service):
    """
    Tests if the EmbeddingService can be initialized correctly.

    This test verifies that when `EmbeddingService()` is called within the
    mocked context, the instance is created successfully, and its internal
    clients (`embeddings_client` and `conn`) are set.
    """
    service, _, _, _ = mock_embedding_service

    # Act: Instantiation happened in the fixture.

    # Assert: Check that the service object exists and its clients were assigned.
    assert service is not None
    assert service.embeddings_client is not None
    assert service.conn is not None  # Note: this is our `fake_conn` mock


@pytest.mark.asyncio
async def test_embed_batch_with_cache_all_new(mock_embedding_service):
    """
    GIVEN: A request to embed two new documents not in the cache.
    WHEN:  `embed_batch_with_cache` is called.
    THEN:  It should return a cached_count of 0, generate two new vectors,
           and have called the database and the Google client.
    """
    service, fake_cur, mock_google_embed, mock_execute_batch = mock_embedding_service
    texts = ["new text 1", "new text 2"]
    ids = ["new1", "new2"]
    # Simulate the DB finding no existing embeddings for these IDs
    fake_cur.fetchall.return_value = []

    # Act
    result = await service.embed_batch_with_cache(texts, ids)

    # Assert
    assert result["cached_count"] == 0
    assert len(result["vectors"]) == 2
    # Check that it tried to read from the DB
    fake_cur.execute.assert_called_once()
    # Check that it called Google's API to generate new embeddings
    mock_google_embed.embed_documents.assert_called_once_with(
        texts, output_dimensionality=768
    )
    # Check that it tried to write the new embeddings back to the DB
    mock_execute_batch.assert_called_once()


@pytest.mark.asyncio
async def test_embed_batch_with_cache_some_cached(mock_embedding_service):
    """
    GIVEN: A request to embed two documents, one of which is already cached.
    WHEN:  `embed_batch_with_cache` is called.
    THEN:  It should return a cached_count of 1, generate one new vector,
           and only call the Google client for the uncached document.
    """
    service, fake_cur, mock_google_embed, mock_execute_batch = mock_embedding_service
    texts = ["cached text", "new text"]
    ids = ["cached1", "new1"]
    # Simulate the DB finding one cached embedding
    fake_cur.fetchall.return_value = [("cached1", [0.5, 0.6])]
    # The mock Google client will be called for the one remaining text
    mock_google_embed.embed_documents.return_value = [[1.0, 1.1]]

    # Act
    result = await service.embed_batch_with_cache(texts, ids)

    # Assert
    assert result["cached_count"] == 1
    assert len(result["vectors"]) == 2
    assert result["vectors"][0] == [0.5, 0.6]  # The vector from the cache
    assert result["vectors"][1] == [1.0, 1.1]  # The newly generated vector
    # Check that it called Google's API with only the single new text
    mock_google_embed.embed_documents.assert_called_once_with(
        ["new text"], output_dimensionality=768
    )
    # Check that it tried to write the new embedding back to the DB
    mock_execute_batch.assert_called_once()
