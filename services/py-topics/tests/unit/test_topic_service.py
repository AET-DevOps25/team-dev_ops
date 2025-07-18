import pytest
import pandas as pd
from unittest.mock import MagicMock, AsyncMock, patch
from src.services.topic_service import TopicDiscoveryService
from niche_explorer_models.models.article import Article


# A fixture to provide a clean service instance for each test
@pytest.fixture
def topic_service():
    return TopicDiscoveryService(genai_base_url="http://mock-genai-service")


# A fixture for mock articles
@pytest.fixture
def mock_articles():
    return [
        Article(
            id="1",
            title="Paper on AI",
            summary="Summary about AI.",
            source="arxiv",
            link="http://example.com/1",
        ),
        Article(
            id="2",
            title="Paper on Machine Learning",
            summary="Summary about ML.",
            source="arxiv",
            link="http://example.com/2",
        ),
        Article(
            id="3",
            title="Paper on Neural Networks",
            summary="Summary about NN.",
            source="arxiv",
            link="http://example.com/3",
        ),
    ]


@pytest.mark.asyncio
@patch("src.services.topic_service.BERTopic")
@patch("src.services.topic_service.CountVectorizer")
async def test_discover_topic_happy_path(
    mock_vectorizer, mock_bertopic, topic_service, mock_articles, mocker
):
    """
    Tests the main success path of the discover_topic method.
    - Mocks the GenAI embedding calls.
    - Mocks BERTopic and CountVectorizer.
    - Verifies that the orchestration logic works as expected.
    """
    # Arrange
    # Mock the embedding response from GenAI
    mock_http_client = mocker.patch.object(
        topic_service, "http_client", new_callable=AsyncMock
    )
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "embeddings": [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]
    }
    mock_http_client.get.return_value = mock_response
    mock_http_client.post.return_value = mock_response  # For fallback

    # Mock BERTopic and its chain of calls
    mock_topic_model = MagicMock()
    mock_topic_model.get_topic_info.return_value = pd.DataFrame(
        {
            "Topic": [0],
            "Name": ["0_mock_topic"],
            "Count": [3],
            "Relevance": [100],
        }
    )
    mock_topic_model.topics_ = [0, 0, 0]
    mock_bertopic.return_value = mock_topic_model

    # Mock the topic info generation
    mocker.patch(
        "src.services.topic_service.TopicDiscoveryService._generate_representations_for_topic",
        return_value={
            "id": 0,
            "label": "Mocked Topic",
            "description": "Mocked Description",
        },
    )

    # Act
    result = await topic_service.discover_topic(
        query="AI Research", article_keys=["1", "2", "3"], articles=mock_articles
    )

    # Assert
    assert result.total_articles_processed == 3
    assert len(result.topics) == 1
    topic = result.topics[0]
    assert topic.title == "Mocked topic"
    assert topic.article_count == 3
    assert topic.relevance == 100
    mock_bertopic.assert_called_once()
    mock_topic_model.fit_transform.assert_called_once()


@pytest.mark.asyncio
async def test_discover_topic_no_articles(topic_service):
    """
    Tests that the service returns an empty response when no articles are provided.
    """
    # Act
    result = await topic_service.discover_topic(
        query="test", article_keys=[], articles=[]
    )

    # Assert
    assert result.total_articles_processed == 0
    assert len(result.topics) == 0


@pytest.mark.asyncio
@patch("src.services.topic_service.BERTopic")
@patch("src.services.topic_service.CountVectorizer")
async def test_embedding_fetch_fallback(
    mock_vectorizer, mock_bertopic, topic_service, mock_articles, mocker
):
    """
    Tests that the service correctly falls back to POST /embeddings if GET fails.
    """
    # Arrange
    # Mock GET to fail and POST to succeed
    mock_http_client = mocker.patch.object(
        topic_service, "http_client", new_callable=AsyncMock
    )
    mock_http_client.get.side_effect = Exception("GET failed")
    post_response = MagicMock()
    post_response.status_code = 200
    post_response.json.return_value = {
        "embeddings": [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]
    }
    mock_http_client.post.return_value = post_response

    # Mock out the rest of the pipeline
    mock_topic_model = MagicMock()
    mock_topic_model.get_topic_info.return_value = pd.DataFrame(
        {"Topic": [], "Name": [], "Count": []}
    )
    mock_topic_model.topics_ = []
    mock_bertopic.return_value = mock_topic_model
    mocker.patch(
        "src.services.topic_service.TopicDiscoveryService._generate_representations_for_topic",
        return_value={"id": 1, "label": "t", "description": "d"},
    )

    # Act
    await topic_service.discover_topic(
        query="test", article_keys=["1", "2", "3"], articles=mock_articles
    )

    # Assert
    mock_http_client.get.assert_awaited_once()
    mock_http_client.post.assert_awaited_once()
