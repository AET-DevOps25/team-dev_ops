# Spring API Server

The main API server for NicheExplorer, built with Spring Boot 3.2 and Java 21. This service orchestrates the complete analysis pipeline by coordinating with Python FastAPI microservices for AI processing, topic discovery, and article fetching. It serves as the central data persistence layer using PostgreSQL with pgvector for vector storage.

## Architecture

This Spring Boot application follows a clean architecture pattern with clear separation of concerns:

- **Controllers**: REST API endpoints for external communication
- **Services**: Business logic and orchestration
- **Configuration**: Application properties and bean definitions
- **Database**: PostgreSQL with Flyway migrations for schema management

The service communicates with three Python FastAPI microservices:
- GenAI Service (port 8000): Query classification and embedding generation
- Topic Discovery Service (port 8100): HDBSCAN clustering and topic extraction
- Article Fetcher Service (port 8200): ArXiv and Reddit content retrieval

## Project Structure

```
src/
├── api-server/                          # Main Spring Boot module
│   ├── build.gradle                     # Gradle build configuration with OpenAPI generator
│   └── src/
│       ├── main/
│       │   ├── java/com/nicheexplorer/apiserver/
│       │   │   ├── ApiServerApplication.java      # Spring Boot main class
│       │   │   ├── config/
│       │   │   │   └── GenAiProperties.java       # Configuration properties for GenAI service
│       │   │   ├── controller/
│       │   │   │   ├── AnalysisController.java    # Main API endpoints for analysis operations
│       │   │   │   └── ArxivProxyController.java  # Proxy endpoints for ArXiv categories
│       │   │   └── service/
│       │   │       ├── AnalysisService.java       # Core business logic for analysis pipeline
│       │   │       ├── EmbeddingClient.java       # HTTP client for embedding generation
│       │   │       ├── SourceClassificationClient.java  # HTTP client for query classification
│       │   │       └── TopicDiscoveryClient.java  # HTTP client for topic discovery
│       │   └── resources/
│       │       ├── application.yml                # Spring Boot configuration
│       │       └── db/migration/
│       │           └── V1__unified_database_schema.sql  # Flyway database schema
│       └── test/
│           └── java/com/nicheexplorer/apiserver/
│               └── AnalysisControllerTest.java    # Integration tests for API endpoints
├── build.gradle                         # Root Gradle configuration
├── settings.gradle                      # Gradle project settings
├── gradlew                              # Gradle wrapper script (Unix)
├── gradlew.bat                          # Gradle wrapper script (Windows)
├── gradle/wrapper/
│   └── gradle-wrapper.properties       # Gradle wrapper version configuration
└── Dockerfile                          # Multi-stage Docker build configuration
```

### API Server Module

#### `src/api-server/build.gradle`
Module-specific Gradle configuration featuring:
- Spring Boot and Spring Web dependencies
- PostgreSQL and Flyway for database management
- OpenAPI Generator plugin for API-first development
- Jackson for JSON processing
- WebClient for HTTP communication
- JUnit 5 for testing

Key OpenAPI generator configuration:
```gradle
openApiGenerate {
    generatorName = "java"
    inputSpec = "../../../../api/openapi.yaml"
    outputDir = "$buildDir/generated"
    packageName = "com.nicheexplorer.generated"
}
```

### Java Source Files

#### `ApiServerApplication.java`
Spring Boot main application class that:
- Enables component scanning for the application package
- Configures configuration properties binding
- Provides RestTemplate bean for HTTP client operations
- Entry point for the Spring Boot application

#### Configuration

##### `config/GenAiProperties.java`
Configuration properties class that:
- Binds properties with prefix "genai" from application.yml
- Provides default base URL for GenAI service (localhost:8000)
- Supports environment variable override via GENAI_BASE_URL
- Used across the application for GenAI service communication

#### Controllers

##### `controller/AnalysisController.java`
Main REST controller providing core API endpoints:

**Endpoints:**
- `POST /api/analyze`: Accepts AnalyzeRequest, orchestrates full analysis pipeline
- `GET /api/analysis/history`: Returns paginated analysis history (default: page=0, size=20)  
- `DELETE /api/analysis/{id}`: Deletes specific analysis by UUID

**Features:**
- Cross-origin resource sharing (CORS) enabled for web client
- Request validation using @Valid annotation
- Uses generated DTOs from OpenAPI specification
- Proper HTTP status codes and response types

##### `controller/ArxivProxyController.java`
Proxy controller for ArXiv-related operations:

**Endpoints:**
- `GET /api/arxiv-categories`: Proxies ArXiv category requests to GenAI service
- `POST /api/build-advanced-query`: Forwards advanced query building to GenAI service

**Purpose:**
- Provides unified API surface for frontend
- Handles CORS for cross-origin requests
- Simplifies client-side HTTP communication

#### Services

##### `service/AnalysisService.java`
Core business logic service that orchestrates the complete analysis pipeline:

**Key Methods:**
- `analyze(AnalyzeRequest)`: Main analysis method that coordinates all microservices
- `getAnalysisHistory(int, int)`: Retrieves paginated analysis history from database
- `deleteAnalysis(UUID)`: Removes analysis and all related data

**Pipeline Process:**
1. Determines source type (ArXiv vs Reddit) using query classification
2. Generates appropriate feed URL for the determined source
3. Calls topic discovery service with query and feed URL parameters
4. Converts response DTOs and persists results to PostgreSQL
5. Returns structured analysis response with topics and articles

**Database Operations:**
- Uses JdbcTemplate for direct SQL operations (no JPA/Hibernate)
- Implements proper transaction handling
- Maintains referential integrity across analysis, topic, and article tables

##### `service/SourceClassificationClient.java`
HTTP client for query classification service:

**Functionality:**
- Sends query classification requests to GenAI service
- Determines whether query is ArXiv-focused or Reddit-focused
- Returns structured classification response with source type and feed URL
- Uses WebClient for reactive HTTP communication

**Internal Records:**
- `ClassificationRequest`: Query wrapper for outbound requests
- `ClassificationResponse`: Structured response with source and feed information

##### `service/EmbeddingClient.java`
HTTP client for text embedding generation:

**Purpose:**
- Communicates with GenAI service for vector embedding generation
- Converts text to 768-dimensional vectors using Google Gemini
- Supports batch processing for multiple texts
- Returns float arrays for vector storage in PostgreSQL pgvector

**Implementation:**
- Uses WebClient for non-blocking HTTP requests
- Handles embedding response conversion from List<Float> to float[]
- Provides error handling for embedding service unavailability

##### `service/TopicDiscoveryClient.java`
HTTP client for topic discovery and clustering:

**Functionality:**
- Orchestrates complete topic discovery pipeline
- Calls Article Fetcher service to retrieve content
- Calls GenAI service for embedding generation
- Calls Topic Discovery service for HDBSCAN clustering
- Returns structured response with topics and associated articles

**Response Structure:**
- `TrendsResponse`: Top-level response containing query, feed URL, and topics
- `Topic`: Individual topic with title, description, relevance score, and articles
- Supports nested article data with titles, links, and content

�