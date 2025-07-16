from fastapi import FastAPI, HTTPException
from niche_explorer_models.models.topic_discovery_request import TopicDiscoveryRequest
from niche_explorer_models.models.topic_discovery_response import TopicDiscoveryResponse
from .services.topic_service import topic_service

from prometheus_fastapi_instrumentator import Instrumentator

import logging
import os

# Configure root logging level from environment variable (default INFO)
numeric_level = getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO)
logging.basicConfig(level=numeric_level)

logger = logging.getLogger("topic_discovery")

# Initialize FastAPI app with metadata matching OpenAPI spec
app = FastAPI(
    title="NicheExplorer Topic Discovery Service",
    version="1.0.0",
    description="Discovers topics from article collections using ML clustering",
)

# Prometheus middleware for metrics
Instrumentator().instrument(app).expose(app)

@app.post("/api/v1/topics/discover", response_model=TopicDiscoveryResponse)
async def discover_topics(request: TopicDiscoveryRequest):
    """Perform topic discovery on a collection of articles"""
    if not request.articles:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_REQUEST",
                "message": "Article list cannot be empty",
            },
        )
    try:
        logger.info(
            f"Received topic discovery request: query='{request.query}', {len(request.articles)} articles"
        )

        # Use min_cluster_size from request or default (2)
        min_cluster_size = getattr(request, "min_cluster_size", 2)

        # Discover topics using the service
        result = await topic_service.discover_topic(
            query=request.query,
            article_keys=request.article_ids,
            articles=request.articles,
            min_cluster_size=min_cluster_size,
            nr_topics=getattr(request, "nr_topics", None),
        )

        logger.info("Successfully discovered topics")
        return result

    except Exception as e:
        logger.error(f"Failed to discover topics: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to discover topics: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
