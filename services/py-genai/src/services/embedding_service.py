import logging
from typing import List, Dict, Any

import psycopg2
from pgvector.psycopg2 import register_vector
from psycopg2.extras import execute_batch

from langchain_google_genai import GoogleGenerativeAIEmbeddings

import arxiv

from ..settings import settings

import uuid

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # Temporary for debugging cache behavior


class EmbeddingService:
    def __init__(self):
        self.embeddings_client = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL, google_api_key=settings.GOOGLE_API_KEY
        )

        # ------------------------------------------------------------------
        # PostgreSQL connection (pgvector enabled)
        # ------------------------------------------------------------------
        try:
            self.conn = psycopg2.connect(
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                dbname=settings.POSTGRES_DB,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
            )
            self.conn.autocommit = True  # enable autocommit before registering pgvector
            register_vector(self.conn)
        except Exception as e:
            logger.error("Failed to connect to Postgres for embeddings storage: %s", e)
            raise

    async def embed_text(self, text: str) -> List[float]:
        """Generates a single, non-cached embedding for a given text."""
        try:
            return self.embeddings_client.embed_query(text)
        except Exception as e:
            logger.error("Embedding failed for text: %s, error: %s", text[:100], e)
            return []

    def _embed_batch(self, texts: List[str]) -> List[List[float]]:
        """A private method to generate embeddings for multiple texts."""
        try:
            return self.embeddings_client.embed_documents(texts)
        except Exception as e:
            logger.error("Batch embedding failed: %s", e)
            return [[] for _ in texts]

    async def embed_batch_with_cache(self, texts: List[str], ids: List[str]) -> Dict:
        """Generate embeddings for multiple texts with PostgreSQL-based caching"""
        vectors: List[Any] = [None] * len(texts)

        # ------------------------------------------------------------------
        # 1. Fetch cached embeddings from Postgres
        # ------------------------------------------------------------------
        try:
            with self.conn.cursor() as cur:
                cur.execute(
                    "SELECT external_id, embedding FROM article WHERE external_id = ANY(%s) AND embedding IS NOT NULL",
                    (ids,),
                )
                rows = cur.fetchall()
                cached_map = {
                    row[0]: list(row[1]) for row in rows if row[1] is not None
                }
        except Exception as e:
            logger.error("Failed to fetch cached embeddings from Postgres: %s", e)
            cached_map = {}

        cached_count = len(cached_map)

        # ------------------------------------------------------------------
        # 2. Determine which texts still need embeddings
        # ------------------------------------------------------------------
        new_texts: List[str] = []
        new_ids: List[tuple[int, str]] = []  # (position, external_id)

        for idx, (text, ext_id) in enumerate(zip(texts, ids)):
            if ext_id in cached_map:
                vectors[idx] = cached_map[ext_id]
            else:
                new_texts.append(text)
                new_ids.append((idx, ext_id))

        # ------------------------------------------------------------------
        # 3. Generate embeddings for uncached texts
        # ------------------------------------------------------------------
        if new_texts:
            new_embeddings = self._embed_batch(new_texts)

            # ------------------------------------------------------------------
            # 3a. Upsert embeddings into Postgres (update existing rows for all analyses)
            # ------------------------------------------------------------------
            try:
                with self.conn.cursor() as cur:
                    execute_batch(
                        cur,
                        """
                        INSERT INTO article (id, external_id, embedding)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (external_id) DO UPDATE
                        SET embedding = EXCLUDED.embedding
                        """,
                        [
                            (str(uuid.uuid4()), ext_id, emb)
                            for (_, ext_id), emb in zip(new_ids, new_embeddings)
                        ],
                        page_size=100,
                    )
                    self.conn.commit()
            except Exception as e:
                logger.warning("Failed to upsert embeddings into Postgres: %s", e)

            # Place new embeddings into the result list
            for (idx, _), embedding in zip(new_ids, new_embeddings):
                vectors[idx] = embedding

        return {"vectors": vectors, "cached_count": cached_count}

    async def get_embeddings_by_ids(self, ids: List[str]) -> Dict:
        """Retrieve cached embeddings by IDs from PostgreSQL"""
        try:
            with self.conn.cursor() as cur:
                cur.execute(
                    "SELECT external_id, embedding FROM article WHERE external_id = ANY(%s) AND embedding IS NOT NULL",
                    (ids,),
                )
                rows = cur.fetchall()
                cached_map = {
                    row[0]: list(row[1]) for row in rows if row[1] is not None
                }

            embeddings: List[List[float]] = []
            found_count = 0
            for ext_id in ids:
                if ext_id in cached_map:
                    embeddings.append(cached_map[ext_id])
                    found_count += 1
                else:
                    embeddings.append([])

            return {"embeddings": embeddings, "found_count": found_count}
        except Exception as e:
            logger.error("Error retrieving embeddings by IDs: %s", e)
            return {"embeddings": [[] for _ in ids], "found_count": 0}

    def get_embeddings(self, articles: List[arxiv.Result]) -> Dict[str, List[float]]:
        """
        Retrieves embeddings for a list of articles. First, it tries to fetch the
        embeddings from the cache stored in PostgreSQL. For any articles not found
        in the cache, it generates new embeddings and stores them.
        """
        article_ids = [a.get_short_id() for a in articles]
        embeddings_map = {}

        # 1. Try to get existing embeddings from the database
        try:
            with self.conn.cursor() as cur:
                cur.execute(
                    "SELECT external_id, embedding FROM article WHERE external_id = ANY(%s) AND embedding IS NOT NULL",
                    (article_ids,),
                )
                rows = cur.fetchall()
                cached_ids = {row[0] for row in rows}
                embeddings_map.update({row[0]: list(row[1]) for row in rows})
                if cached_ids:
                    logger.info(
                        "Read %s embeddings from Postgres cache.", len(cached_ids)
                    )
        except Exception as e:
            logger.error("Error fetching embeddings from Postgres: %s", e)
            cached_ids = set()

        # 2. Identify articles that need new embeddings
        new_articles = [
            article for article in articles if article.get_short_id() not in cached_ids
        ]

        # Debug log for skipped (cached) articles
        for article in articles:
            ext_id = article.get_short_id()
            if ext_id in cached_ids:
                logger.debug(
                    f"Embedding skipped for article {ext_id} - already cached."
                )

        # 3. Generate and store embeddings for new articles
        if new_articles:
            logger.info(
                f"Generating and storing embeddings for {len(new_articles)} new articles."
            )

            # Debug log for newly generated embeddings
            for article in new_articles:
                ext_id = article.get_short_id()
                logger.debug(f"Generating new embedding for article {ext_id}.")

            texts_to_embed = [
                f"{article.title} - {article.summary}" for article in new_articles
            ]
            new_embeddings = self._embed_batch(texts_to_embed)

            new_article_ids = [article.get_short_id() for article in new_articles]

            # Add new embeddings to Postgres
            if new_article_ids:
                try:
                    with self.conn.cursor() as cur:
                        execute_batch(
                            cur,
                            """
                            INSERT INTO article (id, external_id, embedding)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (external_id) DO UPDATE
                            SET embedding = EXCLUDED.embedding
                            """,
                            [
                                (str(uuid.uuid4()), ext_id, emb)
                                for ext_id, emb in zip(new_article_ids, new_embeddings)
                            ],
                            page_size=100,
                        )
                        self.conn.commit()
                    logger.info(
                        "Successfully stored %s new embeddings in Postgres.",
                        len(new_article_ids),
                    )
                    embeddings_map.update(
                        {id: emb for id, emb in zip(new_article_ids, new_embeddings)}
                    )
                except Exception as e:
                    logger.error("Error storing new embeddings in Postgres: %s", e)

        return embeddings_map


# No longer a singleton. Instances will be created where needed.
# embedding_service = EmbeddingService()
