import os


class GenAiSettings:
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY")
    APP_TITLE: str = "NicheExplorer GenAI Service"

    EMBEDDING_MODEL: str = (
        "models/gemini-embedding-001"  # previously models/embedding-001
    )
    GENERATION_MODEL: str = "gemini-2.0-flash"

    DEFAULT_RESEARCH_CATEGORY: str = "cs.CV"
    DEFAULT_COMMUNITY_FEED: str = "https://www.reddit.com/r/computervision/.rss"

    # ------------------------------------------------------------------
    # Database (PostgreSQL) connection for vector storage
    # ------------------------------------------------------------------
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "db")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "postgres")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")


settings = GenAiSettings()
