# NicheExplorer

[![CI](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/ci.yml/badge.svg)](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/ci.yml)
[![Docs](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/docs.yml/badge.svg)](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/docs.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build Docker](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/build_docker.yml/badge.svg)](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/build_docker.yml)
[![Deploy Helm](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/deploy_helm.yml/badge.svg)](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/deploy_helm.yml)
[![Manual Docker Deploy](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/deploy_docker_manual_input.yml/badge.svg)](https://github.com/AET-DevOps25/team-dev_ops/actions/workflows/deploy_docker_manual_input.yml)

**Catch emerging research trends in seconds.** Type a question, NicheExplorer fetches the latest papers & discussions, clusters them into semantic topics and presents an interactive report.

🌐 **Demo Video:** https://www.youtube.com/watch?v=JZuyDbpnB-A

## Demo

> The GIF below shows a complete front-end flow: entering a query, running the pipeline, and browsing the discovered topics.

![NicheExplorer demo](docs/demo.gif)

---


# Quick Start

## Local Development Setup

#### 1. Clone repository & configure environment

```bash
git clone https://github.com/your-org/team-dev_ops.git
cd team-dev_ops

Configure environment
cp .env.example .env
```
#### 2.  Generate OpenAPI client libraries
```bash
bash api/scripts/gen-all.sh 
``` 

#### 3. Local development (uses override with hard-coded localhost rules)
```bash
docker compose --env-file ./.env -f infra/docker-compose.yml -f infra/docker-compose.override.yml up --build -d
```
#### (Optional) Server / production deployment
```bash
docker compose --env-file ./.env -f infra/docker-compose.yml up --build -d
```

## Overview

NicheExplorer is a microservices-based application that leverages machine learning and natural language processing to identify emerging trends in research domains. The system automatically fetches content from multiple sources, performs semantic analysis, and generates insightful reports.

| Service           | Technology Stack       | Port | Purpose                                   |
|------------------|------------------------|------|-------------------------------------------|
| client           | React + Vite + Nginx   | 80   | User interface and interaction [[docs](web-client/README.md)]           |
| api-server       | Spring Boot + Java     | 8080 | Request orchestration and business logic [[docs](services/spring-api/README.md)] |
| genai            | FastAPI + Python       | 8000 | AI/ML processing and embeddings [[docs](services/py-genai/README.md)] |
| topic-discovery  | FastAPI + Python       | 8100 | Content clustering and topic analysis [[docs](services/py-topics/README.md)] |
| article-fetcher  | FastAPI + Python       | 8200 | Content retrieval and RSS processing [[docs](services/py-fetcher/README.md)] |
| db               | PostgreSQL + pgvector  | 5432 | Data persistence and vector search        |

## Product Backlog

For a up-to-date list of user stories and their implementation status, see the
[Product Backlog](docs/Product%20backlog%20%26%20architecture/README.md).

## API Documentation

The complete REST API specification is available in `api/openapi.yaml` and published automatically via GitHub Pages:

| Format | Live link |
| ------ | --------- |
| ReDoc  | https://AET-DevOps25.github.io/team-dev_ops/api.html |
| Swagger UI | https://AET-DevOps25.github.io/team-dev_ops/swagger/ |

The `docs` GitHub Pages site is built by the workflow in `.github/workflows/docs.yml` every time `api/openapi.yaml` changes (or when you trigger the workflow manually).  

### View locally

```bash
# Install once
npm i -g redoc-cli swagger-ui-dist http-server

# Generate docs
redoc-cli bundle api/openapi.yaml -o docs/api.html

# Serve locally at http://localhost:8088
http-server docs -p 8088
```

# Architecture 
## Architecture & Team Responsibilities

The following diagram illustrates the system architecture and the distribution of responsibilities among team members.
![Architecture Diagram](docs/Product%20backlog%20%26%20architecture/assets/Architecture_Responsibilities.png)

```
team-dev_ops/
├── api/                    # OpenAPI specification and generators
├── services/               # Microservices source code
│   ├── py-genai/          # AI/ML service
│   ├── py-topics/         # Topic discovery service
│   ├── py-fetcher/        # Content fetching service
│   └── spring-api/        # Main API orchestrator
├── web-client/            # React frontend application
├── infra/                 # Infrastructure as code
│   ├── docker-compose.yml # Local development
│   ├── helm/              # Kubernetes charts
│   ├── grafana/           # Grafana configuration
│   ├── prometheus/        # Prometheus configuration
│   ├── traefik/           # Traefik configuration
│   ├── terraform/         # Cloud infrastructure
│   └── ansible/           # Configuration management
└── docs/                  # Documentation and architecture
```


## Kubernetes Deployment

The application is set up to be deployable to a Kubernetes cluster via Helm.

The Helm folder structure is organized as follows:

```
team-dev_ops/infra/helm/
├── monitoring-stack/           # Monitoring deployment
│   ├── grafana/                # All Grafana deployment files
│   ├── prometheus/             # All Prometheus deployment files
│   ├── Chart.yml               # Default Helm chart for deployment
├── niche-explorer/             # Microservices source code
│   ├── templates/              # Contains all Kubernetes resource templates
│   │   ├── deployments/        # Helm templates for Deployments
│   │   ├── services/           # Helm templates for Services
│   │   └── ...                 # Other resource templates (e.g., ingresses, configmaps)
│   ├── Chart.yaml              # Helm chart definition for niche-explorer
│   └── values.yaml             # Configurable values for niche-explorer charts
├── deploy-monitoring-stack.sh  # Script to deploy the monitoring stack
```

### Prerequisites
Ensure the following are installed and configured:
- [**kubectl**](https://kubernetes.io/docs/tasks/tools/): To connected to the target Kubernetes cluster.
- [**Helm**](https://helm.sh/docs/intro/install/): For efficient Kubernetes deployment.
- [**.kube**] The kubeconfig for the cluster has to be stored as `~/.kube/config`
---

### Pre-Deployment Configuration
The following has to be manually configured before running the deployment. If any steps fail, consider contacting the cluster admin, as priviledges might be missing.

#### 1. Create Namespaces

Two namespaces are required to isolate the main application from the monitoring and them both from other workloads running in the cluster.
Create these either manually via the Kubernetes Cluster UI or by running the following commands:

```bash
# Namespace for the main application
kubectl create namespace niche-explorer

# Namespace for Prometheus and Grafana
kubectl create namespace monitoring
```

#### 2. Create Application Secrets
To securely provide sensitive configuration values to the application, create a Kubernetes secret in the `niche-explorer` namespace.

Using `kubectl`:

```bash
kubectl create secret generic my-app-credentials \
            --from-literal=CHAIR_API_KEY="<YOUR_ACTUAL_CHAIR_API_KEY>" \
            --from-literal=GOOGLE_API_KEY="<YOUR_ACTUAL_GOOGLE_API_KEY>" \
            --from-literal=POSTGRES_DB="<YOUR_ACTUAL_POSTGRES_DB_NAME>" \
            --from-literal=POSTGRES_PASSWORD="<YOUR_ACTUAL_POSTGRES_PASSWORD>" \
            --from-literal=POSTGRES_USER="<YOUR_ACTUAL_POSTGRES_USER>" \
            --namespace niche-explorer
```

**Where:**
- **`CHAIR_API_KEY`** – API key for [The Chair's LLM](https://gpu.aet.cit.tum.de/)
- **`GOOGLE_API_KEY`** – API key for [Google AI Studio](https://aistudio.google.com/)
- **`POSTGRES_DB`** – Name of the PostgreSQL database to be used
- **`POSTGRES_PASSWORD`** – Password for the PostgreSQL user
- **`POSTGRES_USER`** – Username for the PostgreSQL database

**Note:** The database credentials are created and configured here. This is the only place where they need to be defined for the Kubernetes deployment - no further configuration of them is required elsewhere.

### 3. Configure Helm Values

Environment-specific parameters for the deployment are managed in the Helm values file located at `infra/helm/customization.values.yaml`. This file must be configured before deployment.

Update the following key parameters:

| Parameter                       | Description                                                                              | Example                                   |
|:--------------------------------|:-----------------------------------------------------------------------------------------|:------------------------------------------|
| `base_imagedomain`              | The domain of the container registry where the application images are stored.            | `ghcr.io/deployer-organization`           |
| `ingress.host`                  | The public-facing domain name where the application will be accessible.                  | `niche-explorer.deployer-company.com`     |
| `ingress.tls.issuer.acme.email` | The email address for obtaining a TLS certificate from Let's Encrypt (ACME).             | `deployer-email@example.com`              |

**For CI/CD Deployments:** If deploying via a pipeline (e.g., a GitHub Action), the configured `customization.values.yaml` file must be committed and pushed to the repository. The automation pipeline relies on this file to configure the release.

### Deployment:

#### Command line Deployment / Uninstallation:

**Deployment** To deploy both the application and the monitoring stack in the correct order, run the following command from the project's root directory:
```bash
bash infra/helm/deploy.sh
```
**Note** Wait around 5 minutes before accessing the application to ensure all services are up and running.#

**Uninstal** To uninstall / undeploy these two, run `bash infra/helm/undeploy.sh` from the project's root directory.

#### CI/CD Deployments

**Prerequisite** This requires creating a GitHub secret called `KUBECONFIG`, containing the content of the kuberconfig obtained by the cluster.

The Kubernetes lifecycle is automated using two dedicated GitHub Actions:

*   **`Deploy to Kubernetes Cluster`**: Automatically handles the deployment of the application to.
*   **`Undeploy Kubernetes Cluster Deployment`**: Manages the complete uninstallation of the application from the cluster. (Given it was deployed using the GitHub action)

## AWS Deployment

### Prerequisits

Before beginning, ensure the following are installed and configured:

*   **[Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli)**
*   **[Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)**
    **[Alternative apt Ansible install](https://spacelift.io/blog/how-to-install-ansible)**
*   **[AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)**
*   An **AWS account** with permissions to create EC2 instances and related resources.
*   A **GitHub Personal Access Token (PAT)** with `read:packages` scope to pull images from the GitHub Container Registry (ghcr.io).
*   If Docker images are not pushed to the standard project ghcr.io, update the paths in `infra/compose.aws.yml`.

---
Manually create EC2 Instance:
1.  Log in to the **AWS Management Console** and navigate to the **EC2** service.
2.  Click **Launch instances**.
3.  Configure the new instance with the following settings:
    *   **Name:** Choose a descriptive name (e.g., `my-app-server`).
    *   **Application and OS Images (AMI):** Select **Ubuntu**.
    *   **Instance type** Use an instance with at least 8 GiB RAM, like `t3.large`
    *   **Key pair (login):** Choose `vockey`as key pair. The corresponding `.pem` file will be needed later.
    *   **Network settings:** Ensure **HTTPS** and **HTTP** are enabled.
    *   **Configure storage:** Increase the root volume size to at least **25 GiB**.
4.  Click **Launch instance**.
5.  Once the instance is running, copy its **Public IPv4 address** and **Instance ID**, as they will be needed later.


### Local AWS Deployment

#### Terraform 

1.  Configure the local AWS credentials so Terraform can authenticate. They can typically be found in the AWS account details for the AWS CLI. Copy them into the local credentials file:
    ```sh
    # Location of the AWS credentials file
    ~/.aws/credentials
    ```

2.  Navigate to the Terraform directory (from project root folder):
    ```sh
    cd infra/terraform/
    ```

3.  Create or update the `terraform.tfvars` file with the details from the created EC2 instance:
    ```hcl
    # infra/terraform/terraform.tfvars

    instance_id = "i-xxx"  # <-- Replace with your Instance ID
    public_ip   = "xxx.xxx.xxx.xxx"         # <-- Replace with your Public IPv4 address
    ```

4.  Initialize, plan, and apply the Terraform configuration:
    ```sh
    # Initialize the Terraform workspace
    terraform init

    # (Optional) Preview the changes that will be made
    terraform plan

    # Apply the changes to create the Elastic IP
    terraform apply -auto-approve
    ```

#### Deploy using Ansible: 

This installs Docker, logs in to the container registry, and starts the application.

0. Update the `DOMAIN` variable in .env to the obtained public IP and append `.nip.io`. This allows to use tls, but also to route to prometheus and grafana

1.  Place the private key file (`labsuser.pem`, obtained earlier) into `~/.ssh/`.

    1.1. If the directory does not exist, create it first 
    ```sh
    mkdir ~/.ssh

    chmod 700 ~/.ssh
    ```

2.  Set the correct permissions for the private key file.
    ```sh
    chmod 400 ~/.ssh/labsuser.pem
    ```

3.  Navigate to the Ansible directory:
    ```sh
    cd infra/ansible/  # From project root folder

    cd ../ansible      # From the terraform folder
    ```

4.  Open the `inventory.yml` file and update the `ansible_host` with the instance's public IP address.
    ```yaml
    # infra/ansible/inventory.yml

    all:
      hosts:
        aws_instance:
          ansible_host: xxx.xxx.xxx.xxx  # <-- Replace with Public IPv4 address
          # ...
    ```

5.  Run the Ansible playbook to deploy the application, providing the GitHub username and Personal Access Token as extra variables (May take 5-10 minutes).

    ```sh
    ansible-playbook playbook.yml --extra-vars "ghcr_username=<GITHUB_USERNAME> ghcr_token=<GITHUB_TOKEN>"
    ```

The application should now be deployed and accessible at the public IP address of the EC2 instance.
---

In rare cases, the AWS public IP address changes seemingly at random. Hence, if the above fails with an SSH error, consider updating the IP address.


### GitHub Actions AWS Deployment

The repository is equipped with a `Deploy to AWS EC2` GitHub Actions workflow (`deploy_to_aws.yml`) . For this, specific credentials must be securely stored as GitHub Secrets in the repository (`Settings > Secrets and variables > Actions`).

#### Required GitHub Secrets

The following secrets are required:

| Secret Name             | Description                                                                                                     |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------|
| `AWS_ACCESS_KEY_ID`     | The access key ID for the AWS account - Contained in the AWS CLI credentials.                                   |
| `AWS_SECRET_ACCESS_KEY` | The secret access key corresponding to the access key ID - Contained in the AWS CLI credentials.                |
| `AWS_SESSION_TOKEN`     | The session token for the AWS credentials - Contained in the AWS CLI credentials.                               |
| `AWS_SSH_PRIVATE_KEY`   | The full content of the `.pem` private key file (e.g., `labsuser.pem`) .                                        |

#### Running the Workflow

The workflow is designed to be triggered manually from the **Actions** tab in the GitHub repository.

When initiated, it will prompt for the **Public IPv4 address** and the **Instance ID** of the target EC2 instance. After these details are provided, the action will automatically connect to the instance and deploy the application, mirroring the steps of the manual Ansible deployment.

## Monitoring

The monitoring infrastructure leverages Prometheus for robust data collection and alerting, and Grafana for intuitive data visualization.

### Prometheus

Prometheus serves as the primary time-series monitoring system. It is responsible for scraping metrics from services, processing them with recording rules, and evaluating alerting rules to identify and notify of issues.
The Prometheus UI can be accessed at `prometheus.${DOMAIN}`. No authentication is required for basic viewing of metrics and alert states.

#### Prometheus Metrics
Prometheus collects the following metrics, which are defined via `infra/prometheus/metrics.rules.yml`

| Metric Name                                                 | Description                                                                                        | Recording Interval |
| :---------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :----------------- |
| **job:http_requests_total**                                 | Total count of filtered HTTP API requests per job                                                  | 1m                 |
| **job:http_requests_total:classify_and_embeddings**         | Total count of GenAI Classify and Embeddings API requests (last 1 day)                             | 1m                 |
| **job:http_requests_total:classify_and_embeddings:1h**      | Total count of GenAI Classify and Embeddings API requests (last 1 hour)                            | 1m                 |
| **job:http_requests_total:classify_and_embeddings:1m**      | Total count of GenAI Classify and Embeddings API requests (last 1 minute)                          | 1m                 |
| **job:http_requests_total:article_fetcher_articles**        | Total count of Article Fetcher API requests to `/api/v1/articles` (last 1 day)                     | 1m                 |
| **job:http_requests_total:article_fetcher_articles:1h**     | Total count of Article Fetcher API requests to `/api/v1/articles` (last 1 hour)                    | 1m                 |
| **job:http_requests_total:article_fetcher_articles:1m**     | Total count of Article Fetcher API requests to `/api/v1/articles` (last 1 minute)                  | 1m                 |
| **job:arxiv_fetch_total:1d**                                | Total count of internal ArXiv fetcher API calls (last 1 day)                                       | 1m                 |
| **job:arxiv_fetch_total:1h**                                | Total count of internal ArXiv fetcher API calls (last 1 hour)                                      | 1m                 |
| **job:arxiv_fetch_total:1m**                                | Total count of internal ArXiv fetcher API calls (last 1 minute)                                    | 1m                 |
| **job:reddit_fetch_total:1d**                               | Total count of internal Reddit fetcher API calls (last 1 day)                                      | 1m                 |
| **job:reddit_fetch_total:1h**                               | Total count of internal Reddit fetcher API calls (last 1 hour)                                     | 1m                 |
| **job:reddit_fetch_total:1m**                               | Total count of internal Reddit fetcher API calls (last 1 minute)                                   | 1m                 |
| **job:http_requests_total:rate5m**                          | 5-minute average rate of filtered HTTP API requests per job                                        | 1m                 |
| **job:http_requests_error:rate5m**                          | 5-minute HTTP error (4xx/5xx) rate (ratio) of filtered API requests per job                        | 1m                 |
| **job:http_requests_errors**                                | Total count of HTTP errors (4xx/5xx) from filtered API requests per job                            | 1m                 |
| **job:http_request_duration_seconds:avg1m**                 | 1-minute average HTTP request duration of filtered API calls per job                               | 1m                 |

#### Prometheus Alerts
Prometheus continuously evaluates a set of alerting rules, defined in `infra/prometheus/alert.rules.yml`.  When the conditions for an alert are met, Prometheus will fire the alert.

| Alert Name                                         | Service           | Severity   | Summary of Trigger Condition                                                                     |
| :------------------------------------------------- | :---------------- | :--------- | :----------------------------------------------------------------------------------------------- |
| **ServiceDown**                                    | General           | `critical` | Service `up` metric is 0 for 2 minute (service is down).                                         |
| **HighRequestRateGenAI_Classify**                  | `genai`           | `warning`  | Request rate to `/api/v1/classify` endpoint > 4 RPM for 1 minute.                                |
| **HighTotalRequestsGenAI_Classify**                | `genai`           | `warning`  | Total requests to `/api/v1/classify` endpoint > 30 in 1 hour for 1 minute.                       |
| **HighDailyRequestsGenAI_Classify**                | `genai`           | `critical` | Total requests to `/api/v1/classify` endpoint > 90 in 1 day for 1 minute.                        |
| **HighRequestRateGenAI_Embedding**                 | `genai`           | `warning`  | Request rate to `/api/v1/embeddings` endpoint > 4 RPM for 1 minute.                              |
| **HighTotalRequestsGenAI_Embedding**               | `genai`           | `warning`  | Total requests to `/api/v1/embeddings` endpoint > 30 in 1 hour for 1 minute.                     |
| **HighDailyRequestsGenAI_Embedding**               | `genai`           | `critical` | Total requests to `/api/v1/embeddings` endpoint > 90 in 1 day for 1 minute.                      |
| **HighRequestRateArticleFetcher_ArxivInternal**    | `article-fetcher` | `warning`  | Internal call rate to ArXiv service > 16 RPM for 1 minute.                                       |
| **HighTotalRequestsArticleFetcher_ArxivInternal**  | `article-fetcher` | `warning`  | Total internal calls to ArXiv service > 500 in 1 hour for 1 minute.                              |
| **HighDailyRequestsArticleFetcher_ArxivInternal**  | `article-fetcher` | `critical` | Total internal calls to ArXiv service > 2000 in 1 day for 1 minute.                              |
| **HighRequestRateArticleFetcher_RedditInternal**   | `article-fetcher` | `warning`  | Internal call rate to Reddit service > 16 RPM for 1 minute.                                      |
| **HighTotalRequestsArticleFetcher_RedditInternal** | `article-fetcher` | `warning`  | Total internal calls to Reddit service > 500 in 1 hour for 1 minute.                             |
| **HighDailyRequestsArticleFetcher_RedditInternal** | `article-fetcher` | `critical` | Total internal calls to Reddit service > 2000 in 1 day for 1 minute.                             |

### Grafana
Grafana visualizes the metrics and alerts of Prometheus and can be reached via `grafana.${DOMAIN}`. To login use the default credentials `admin:admin` and either chose to setup own credentials or skip the request to do so.

#### Dashboards
Grafana is pre-configured with the following dashboards to provide immediate insights into system:
1.  **`Niche-Dashboard`**: This dashboard visualizes all the metrics defined in prometheus, offering a comprehensive overview of system performance.
2.  **`Finer Niche API Calls`**: This dashboard provides detailed insights into specific API call patterns for the `genai` and `article-fetcher` services.
3.  **`System-Alerts`**: This dashboard is dedicated to displaying the current status of all alerts, making it easy to identify and track any firing alerts.


If any dashboard appears to show "No Data", it could either mean that no relevant data has been collected yet, or the selected time range is not appropriate. Try adjusting the time period in the dashboard settings.
### Database Schema

The application uses PostgreSQL with pgvector. Class Diagram:
![Class Diagram](docs/Product%20backlog%20%26%20architecture/assets/Class_Diagram.png)


### Use Case Diagram 

<img src="docs/Product backlog & architecture/assets/use-case.png" width="600">