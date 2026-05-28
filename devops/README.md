# TaskFlow DevOps Guide

This folder contains all deployment and platform code for the TaskFlow project. Keep application source in `frontend/` and `backend/`; keep build, CI/CD, infrastructure, configuration, Kubernetes, monitoring, and scripts here.

## Folder Map

```text
devops/
  build/
    dockerfiles/        Dockerfiles for backend and frontend images
    nginx/              Frontend Nginx runtime config
  ci-cd/                Jenkins pipeline
  configure-infra/      Ansible server configuration
  containers/           Docker Compose local runtime
  environments/         Local environment examples
  infra-build/          Terraform cloud infrastructure
  kubernetes/           Kubernetes manifests
  monitoring/           Prometheus and Grafana bootstrap
  scripts/              Local helper scripts
```

## Local Docker Run

From the repository root:

```bash
docker compose -f devops/containers/docker-compose.yml up --build
```

Open:

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
- Metrics: http://localhost:8000/metrics

## Jenkins Manual Setup

Create a Jenkins pipeline job that points to your GitHub repository. Use this file:

```text
devops/ci-cd/Jenkinsfile
```

Recommended Jenkins plugins:

- Pipeline
- Git
- Docker Pipeline
- JUnit
- HTML Publisher
- Credentials Binding

Optional credentials:

- `dockerhub-credentials`: username/password for Docker Hub image push
- `aws-credentials`: AWS key pair for Terraform

The pipeline can run tests only, build Docker images, push images, and optionally run Terraform or Ansible when you enable those Jenkins parameters.

## Terraform

Terraform files live in:

```text
devops/infra-build/terraform
```

Copy the example variables file:

```bash
cp devops/infra-build/terraform/terraform.tfvars.example devops/infra-build/terraform/terraform.tfvars
```

Then edit values for your AWS account, SSH key, and allowed IP ranges.

## Ansible

Ansible files live in:

```text
devops/configure-infra/ansible
```

Copy the inventory example:

```bash
cp devops/configure-infra/ansible/inventory.example.ini devops/configure-infra/ansible/inventory.ini
```

Update the host IP from Terraform output and run:

```bash
ansible-playbook -i devops/configure-infra/ansible/inventory.ini devops/configure-infra/ansible/playbook.yml
```

