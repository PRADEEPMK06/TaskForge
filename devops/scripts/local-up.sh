#!/usr/bin/env bash
set -euo pipefail

docker compose -f devops/containers/docker-compose.yml up --build

