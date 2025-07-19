#!/bin/bash
# This script safely deploys the monitoring stack by staging external configs.

# Exit immediately if a command exits with a non-zero status.
set -e

# This trap ensures that the cleanup function is ALWAYS called when the script exits,
# whether it succeeds, fails, or is interrupted.
function cleanup {
  echo ""
  echo "--- Executing cleanup ---"
  rm -rf "infra/helm/monitoring-stack/grafana"
  rm -rf "infra/helm/monitoring-stack/prometheus"
  echo "Temporary config directories removed."
}
trap cleanup EXIT

# Copy the external config files into the chart directory
echo "--- Preparing monitoring deployment ---"
cp -r "infra/grafana" "infra/helm/monitoring-stack/grafana"
cp -r "infra/prometheus" "infra/helm/monitoring-stack/prometheus"

# Deploy: Run Helm deployment 
echo "--- Deploying Helm chart to monitoring namespace ---"
helm upgrade --install -n monitoring niche-monitoring infra/helm/monitoring-stack/ -f infra/helm/customization.values.yaml

echo "--- Helm monitoring deployment command succeeded ---"
echo ""
echo ""

# Deploy main application
echo "--- Deploying main application ---"
helm upgrade --install -n niche-explorer niche-application infra/helm/niche_explorer/ -f infra/helm/customization.values.yaml