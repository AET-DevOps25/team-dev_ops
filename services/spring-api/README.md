# Spring API Server

Central API server built with Spring Boot 3.2 and Java 21. Orchestrates analysis pipeline with Python microservices and persists data in PostgreSQL with pgvector.

## Architecture
- Controllers: REST endpoints that handle incoming HTTP requests. map URLs to methods, and return responses. They serve as the API's entry point, separating routing and request handling from business logic.
- Services: Business logic and HTTP clients to microservices (GenAI:8000, Topics:8100, Fetcher:8200).
- Database: PostgreSQL with Flyway migrations.

## API Documentation

For detailed endpoints and specs, see the [Swagger Docs](https://aet-devops25.github.io/team-dev_ops/swagger/).

This central API exposes REST endpoints for initiating analyses, retrieving history, and managing categories, orchestrating calls to other microservices.

## Structure
```
src/
├── main/
│   ├── java/com/nicheexplorer/apiserver/
│   │   ├── ApiServerApplication.java
│   │   ├── config/GenAiProperties.java
│   │   ├── controller/
│   │   │   ├── AnalysisController.java
│   │   │   └── CategoryController.java
│   │   └── service/
│   │       ├── AnalysisOrchestrationService.java
│   │       └── AnalysisService.java
│   └── resources/
│       ├── application.yml
│       └── db/migration/V1__unified_database_schema.sql
└── test/
    └── java/com/nicheexplorer/apiserver/
        ├── controller/
        └── service/
```

## Configuration
- application.yml for properties.
- Uses OpenAPI generator from api/openapi.yaml.

## Running
Use Gradle: `./gradlew bootRun`

## Tests
- Unit and Pact consumer tests in test/.

## Docker
Multi-stage Dockerfile for building and running."