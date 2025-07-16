from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from niche_explorer_models.models.article_fetch_request import ArticleFetchRequest
from niche_explorer_models.models.article_fetch_response import ArticleFetchResponse
from typing import Dict, List

from prometheus_fastapi_instrumentator import Instrumentator

import logging
from .services.arxiv_service import arxiv_fetcher
from .services.reddit_service import reddit_fetcher
from .services.arxiv_categories import CATEGORIES as ARVIX_CATEGORIES

logger = logging.getLogger("article_fetcher")
# Enable debug logging by default (can be overridden by container env)
logging.basicConfig(level=logging.DEBUG)

# Initialize FastAPI app with metadata matching OpenAPI spec
app = FastAPI(
    title="NicheExplorer Article Fetcher Service",
    version="1.0.0",
    description="Fetches articles from arXiv and Reddit based on queries",
)

# Prometheus middleware for metrics
Instrumentator().instrument(app).expose(app)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Custom exception handler for Pydantic validation errors.
    This is to ensure the error response matches the format of other services.
    """
    return JSONResponse(
        status_code=422,
        content={"code": "INVALID_REQUEST", "message": str(exc)},
    )


@app.post("/api/v1/articles", response_model=ArticleFetchResponse)
async def fetch_articles(request: ArticleFetchRequest) -> ArticleFetchResponse:
    """Fetch articles from the specified source"""
    try:
        logger.info(
            f"Received fetch request: source={request.source}, query={request.query}, category={request.category}, limit={request.limit}"
        )

        # Determine how many articles to fetch (default to 50 if not provided)
        max_results = request.limit or 50

        # ------------------------------------------------------------------
        # Source-specific routing
        # ------------------------------------------------------------------
        if request.source == "arxiv":
            # If category already looks like an advanced arXiv query (contains cat: or all:), use as-is
            if request.category and (
                "cat:" in request.category or "all:" in request.category
            ):
                search_query = request.category
            else:
                # Plain category name provided → build simple category query; otherwise fall back to free-text
                search_query = (
                    f"cat:{request.category}" if request.category else request.query
                )
            articles = await arxiv_fetcher.fetch(
                query=search_query, max_results=max_results
            )

            # ------------------------------------------------------------------
            # Multi-step fallback to avoid empty result sets
            # 1) advanced query (already executed)
            # 2) category-only (cat:xyz)
            # 3) free-text query
            # ------------------------------------------------------------------

            if len(articles) == 0 and request.category:
                # Detect advanced form containing both phrase/all: and cat:
                if "cat:" in request.category and (
                    "all:" in request.category or "AND" in request.category
                ):
                    # Extract the last category token after 'cat:' (handles URL-encoded '+' already replaced by Space)
                    cat_part = request.category.split("cat:")[-1]
                    fallback_query = f"cat:{cat_part}"
                    logger.info(
                        "Advanced query empty – retrying category-only '%s'",
                        fallback_query,
                    )
                    articles = await arxiv_fetcher.fetch(
                        query=fallback_query, max_results=max_results
                    )

            if len(articles) == 0:
                free_text_query = request.query
                if free_text_query:
                    logger.info(
                        "Category query empty – retrying free-text '%s'",
                        free_text_query,
                    )
                    articles = await arxiv_fetcher.fetch(
                        query=free_text_query, max_results=max_results
                    )

            if len(articles) == 0:
                logger.warning(
                    "ArXiv query ultimately returned 0 results for original query '%s'",
                    search_query,
                )
        elif request.source == "reddit":
            # Treat `category` as subreddit (fallback to free-text query if absent)
            subreddit = request.category or request.query
            articles = await reddit_fetcher.fetch(
                subreddit=subreddit, max_results=max_results
            )
        else:
            raise HTTPException(
                status_code=400, detail=f"Unsupported source: {request.source}"
            )

        logger.info(f"Fetched {len(articles)} articles from {request.source}")

        return ArticleFetchResponse(
            articles=articles, total_found=len(articles), source=request.source
        )
    except Exception as e:
        logger.error(f"Failed to fetch articles: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch articles: {str(e)}"
        )


@app.get("/api/v1/sources/{source}/categories")
async def get_source_categories(source: str) -> Dict[str, List[str]]:
    """Get available categories for a specific data source"""
    if source == "arxiv":
        return ARVIX_CATEGORIES
    elif source == "reddit":
        # Placeholder for Reddit categories
        return {"Subreddits": ["AskReddit", "programming", "science"]}
    else:
        raise HTTPException(status_code=404, detail=f"Source '{source}' not found.")


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy"}
