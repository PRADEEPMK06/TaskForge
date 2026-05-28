# TaskFlow - Full Stack Task Manager with DevOps

TaskFlow is an end-to-end portfolio project built to show full-stack development and DevOps skills in one clean repository. It has a FastAPI backend, a static frontend dashboard, automated tests, Dockerized runtime, Jenkins CI/CD, Terraform infrastructure, Ansible configuration, Kubernetes manifests, and monitoring bootstrap files.

## Project Structure

```
TASKMANAGER-main/
  app/                      Application code (backend and frontend)
    backend/                FastAPI backend source and tests
    frontend/               Static HTML/CSS/JS frontend and tests
  devops/                   All DevOps code grouped by function
    build/                  Dockerfiles and Nginx config
    ci-cd/                  Jenkins pipeline
    configure-infra/        Ansible playbook and inventory example
    containers/             Docker Compose runtime
    environments/           Local environment file
    infra-build/            Terraform AWS EC2 infrastructure
    kubernetes/             Kubernetes deployment manifests
    monitoring/             Prometheus and Grafana setup
    scripts/                Health check and local run scripts
  docs/                     Documentation and reference files
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
cd app/backend
python -m venv .venv
.venv/Scripts/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd app/frontend
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
cd app/backend
python -m pytest
```

Frontend:

```bash
cd app/frontend
npm install
npm test
```

## Documentation

See the [docs/](docs/) folder for all project documentation:

- `README.md` - Original README
- `ARCHITECTURE_AND_WORKFLOW.md` - System architecture
- `CHEAT_SHEET.md` - Quick reference guide
- `INTERVIEW_QA_PART1.md` - Interview questions part 1
- `INTERVIEW_QA_PART2.md` - Interview questions part 2
- `RESUME_GUIDE.md` - Resume guide
