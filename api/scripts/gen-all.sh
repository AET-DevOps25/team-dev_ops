#!/usr/bin/env bash

set -euo pipefail

# Generate Java classes (models, api, invoker)
npx openapi-generator-cli generate -i api/openapi.yaml -g java \
  -o services/spring-api/src/generated/java --skip-validate-spec \
  --api-package=com.nicheexplorer.generated.api \
  --model-package=com.nicheexplorer.generated.model \
  --invoker-package=com.nicheexplorer.generated.invoker \
  --additional-properties=library=native,useJakartaEe=true,serializationLibrary=jackson

# Python FastAPI server models - generate Pydantic models for each service
npx openapi-generator-cli generate -i api/openapi.yaml -g python-fastapi \
  -o services/py-genai/generated --skip-validate-spec \
  --additional-properties=packageName=niche_explorer_models

npx openapi-generator-cli generate -i api/openapi.yaml -g python-fastapi \
  -o services/py-fetcher/generated --skip-validate-spec \
  --additional-properties=packageName=niche_explorer_models

npx openapi-generator-cli generate -i api/openapi.yaml -g python-fastapi \
  -o services/py-topics/generated --skip-validate-spec \
  --additional-properties=packageName=niche_explorer_models

# TypeScript client for web app (Axios-based)
npx openapi-generator-cli generate -i api/openapi.yaml -g typescript-axios \
  -o web-client/src/generated/api --skip-validate-spec --additional-properties=supportsES6=true,useSingleRequestParameter=true,withSeparateModelsAndApi=true,apiPackage=apis,modelPackage=models
