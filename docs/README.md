# TaskFlow - Full Stack Task Manager with DevOps

TaskFlow is an end-to-end portfolio project built to show full-stack development and DevOps skills in one clean repository. It has a FastAPI backend, a static frontend dashboard, automated tests, Dockerized runtime, Jenkins CI/CD, Terraform infrastructure, Ansible configuration, Kubernetes manifests, and monitoring bootstrap files.

## Project Structure

```text
TASKMANAGER-main/
  backend/                 FastAPI backend source and tests
  frontend/                Static HTML/CSS/JS frontend and tests
  devops/                  All DevOps code grouped by function
    build/                 Dockerfiles and Nginx config
    ci-cd/                 Jenkins pipeline
    configure-infra/       Ansible playbook and inventory example
    containers/            Docker Compose runtime
    environments/          Local environment file
    infra-build/           Terraform AWS EC2 infrastructure
    kubernetes/            Kubernetes deployment manifests
    monitoring/            Prometheus and Grafana setup
    scripts/               Health check and local run scripts
```

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript, Jest
- Backend: Python, FastAPI, SQLAlchemy, SQLite, Pytest
- Containers: Docker, Docker Compose, Nginx
- CI/CD: Jenkins declarative pipeline
- Infrastructure: Terraform on AWS EC2
- Configuration: Ansible
- Orchestration: Kubernetes manifests
- Monitoring: Prometheus metrics endpoint, Prometheus, Grafana

## Features

- User registration and login with signed bearer tokens
- PBKDF2 password hashing using Python standard library
- Task CRUD with status workflow: `todo`, `in_progress`, `done`
- Task priorities, due dates, reward points, and completion statistics
- User profile settings for accent color and display font
- Health endpoint for deployment checks
- Prometheus-compatible metrics endpoint
- Backend and frontend unit tests

## Run Locally Without Docker

Backend:

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
python -m http.server 3000
```

Open:

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

## Run With Docker Compose

From the repository root:

```bash
docker compose -f devops/containers/docker-compose.yml up --build
```

Open:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

## Run Tests

Backend:

```bash
cd backend
python -m pytest
```

Frontend:

```bash
cd frontend
npm install
npm test
```

## Jenkins

Create a Jenkins pipeline job and point it to:

```text
devops/ci-cd/Jenkinsfile
```

The pipeline runs backend tests, frontend tests, Docker builds, Terraform validation, and Ansible syntax checks. Image push, Terraform apply, and Ansible deployment are controlled by Jenkins parameters.

## Resume Bullets

- Built a full-stack task management application with FastAPI, SQLAlchemy, JavaScript, Docker, and Nginx.
- Implemented token-based authentication, password hashing, task workflow APIs, health checks, and Prometheus metrics.
- Created a Jenkins CI/CD pipeline with automated backend/frontend tests, Docker image builds, optional image publishing, Terraform validation, and Ansible checks.
- Wrote Terraform infrastructure code for AWS EC2 provisioning and Ansible automation for Docker host configuration.
- Added Kubernetes deployment manifests and Prometheus/Grafana monitoring bootstrap for production-style deployment practice.

## GitHub Push Checklist

```bash
git init
git add .
git commit -m "Build TaskFlow full stack DevOps project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

Before pushing, replace placeholder values in:

- `devops/ci-cd/Jenkinsfile`
- `devops/infra-build/terraform/terraform.tfvars.example`
- `devops/configure-infra/ansible/playbook.yml`
- `devops/kubernetes/*.yaml`

