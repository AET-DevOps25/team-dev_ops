FROM gradle:8.7-jdk21 AS build

# ---- build api-server JAR ----
WORKDIR /workspace

# Copy the OpenAPI spec
COPY api/openapi.yaml ./api/openapi.yaml

# Copy Gradle wrapper, settings, and source code
COPY services/spring-api/ .

# Build the application
RUN gradle bootJar --no-daemon

# ---- runtime image ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Copy the JAR produced in the previous stage
COPY --from=build /workspace/build/libs/*.jar app.jar

# Expose Spring Boot port
EXPOSE 8080

ENTRYPOINT ["java","-jar","app.jar"]
