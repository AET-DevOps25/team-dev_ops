# NicheExplorer API Server

The API server is a Spring Boot application that sits between the React front-end, the GenAI service, and PostgreSQL. It accepts user queries, triggers AI processing, stores the resulting data, and serves it back through a small set of REST endpoints.

---

## 1 · Layered Design

• **Controller layer** – REST endpoints under `/api/*` for analysis, history, and vector operations.  
• **Service layer** – business logic (`AnalysisService`) that coordinates feed fetching, GenAI calls, and database writes.  
• **Data layer** – JPA entities backed by PostgreSQL with the pgvector extension for high-dimensional embeddings.  
• **Config layer** – externalised settings (DB, GenAI base-URL, time-outs) read from `application.yml`.

---

## 2 · Endpoints & Data Contracts (concise)

• **POST `/api/analyze`** – body contains the user query and options; returns one Analysis object with its trends and articles.  
• **GET `/api/analysis/history`** – no body; returns a list of the most recent analyses.  
• **DELETE `/api/analysis/{id}`** – removes that analysis plus its trends & articles.  
• **POST `/api/trend/{id}/embedding`** – returns the 768-dimensional average vector for a whole trend.  
• **POST `/api/article/{id}/embedding`** – returns the individual embedding for an article.

All responses are JSON; status codes follow the usual 200 / 4xx / 5xx conventions.

---

## 3 · Request Flow in Plain English

1. The front-end calls **/analyze** with the query.  
2. The server decides which RSS feed to read (auto-detect or user-selected).  
3. It fetches up to *N* articles, then asks the GenAI service to group them into trends.  
4. Trends and articles are stored in PostgreSQL; embeddings are written to the `article.embedding` vector column and indexed for similarity search.  
5. The freshly created Analysis object is sent back to the client.  
6. Later, the UI can call **/analysis/history** to reload previous runs or **/analysis/{id}** to delete one.

---

## 4 · Database Snapshot (no SQL — just the idea)

• **analysis** – one row per user query; stores the text, timestamp, feed-URL and type (research/community).  
• **trend** – child rows of an analysis; holds title, description, relevance score, and article count.  
• **article** – raw paper/post content with a SHA-256 `content_hash` for de-duplication and a `vector(768)` embedding for semantic search.  
Indexes exist on foreign keys, `content_hash`, and on the embedding (ivfflat) for fast cosine similarity.

---

## 5 · Configuration & Deployment (high-level)

Environment variables / `application.yml` set the DB URL, credentials, and the GenAI base-URL.  The project builds with Gradle and ships as a slim JRE 21 container; one command `docker-compose up -d` brings up Postgres, GenAI, and the API server.

---

## 6 · Monitoring & Health

Spring Boot Actuator exposes health and metrics endpoints. A custom health-check pings the GenAI service so container orchestration can restart the stack if external AI goes down.

---

The result is a compact, maintainable Java backend that delivers trend analysis data to the UI and keeps long-term results safe for future exploration.
