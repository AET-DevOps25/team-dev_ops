# Spring API Server

Central API server built with Spring Boot 3.2 and Java 21. Orchestrates analysis pipeline with Python microservices and persists data in PostgreSQL with pgvector.

## Architecture
- Controllers: Reactive REST endpoints; they validate input and delegate to the service layer.
- Services: Business logic layer. `AnalysisService` persists data, and `AnalysisOrchestrationService` coordinates calls to external Python micro-services.
- Configuration: `ApiClientConfig` registers OpenAPI-generated clients (`AiApi`, `ArticlesApi`, `TopicsApi`) as Spring Beans for dependency injection.
- Persistence: PostgreSQL (with the pgvector extension).
- Contracts / OpenAPI: Clients are generated from `api/openapi.yaml`; consumer-driven contract tests are written with Pact.

![Architecture Diagram](../../docs/Product%20backlog%20%26%20architecture/assets/Spring_api_diagram.png)

## API Documentation

For detailed endpoints and specs, see the [Swagger Docs](https://aet-devops25.github.io/team-dev_ops/swagger/).

This central API exposes REST endpoints for initiating analyses, retrieving history, and managing categories, orchestrating calls to other microservices.

## Structure
```
src/
├── main/
│   ├── java/com/nicheexplorer/apiserver/
│   │   ├── ApiServerApplication.java
│   │   ├── config/
│   │   │   ├── ApiClientConfig.java
│   │   │   └── GenAiProperties.java
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
        ├── pact/
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