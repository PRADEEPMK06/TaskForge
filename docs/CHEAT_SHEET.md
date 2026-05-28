# TaskFlow - Quick Reference Cheat Sheet

## 60-Second Pitch
"I built TaskFlow, a full-stack task management application showcasing my end-to-end engineering skills. It includes a FastAPI backend with custom JWT authentication and gamification system, a responsive frontend dashboard, comprehensive test coverage, and production-ready DevOps infrastructure using Docker, Kubernetes, and Terraform. The project demonstrates secure coding practices, scalable architecture design, and modern deployment pipelines."

---

## Tech Stack at a Glance

```
Frontend          Backend           Database          DevOps
├─ HTML5          ├─ FastAPI        ├─ SQLite        ├─ Docker
├─ CSS3           ├─ Python 3.12    ├─ SQLAlchemy    ├─ Docker Compose
├─ JavaScript     ├─ Pydantic       └─ 2 tables      ├─ Kubernetes
├─ Jest tests     ├─ SQLAlchemy     (users, tasks)   ├─ Terraform
└─ API layer      ├─ pytest + cov   └─ Cascade       ├─ Ansible
                  └─ httpx                 delete      └─ Jenkins
```

---

## Architecture Overview

```
┌─────────────────┐
│    Browser      │
│  (Frontend)     │
│  - Vanilla JS   │
│  - API calls    │
└────────┬────────┘
         │ HTTP/JSON
         ↓
┌─────────────────────────────────────────┐
│      FastAPI Backend (Port 8000)        │
│  ├─ 7 API endpoints                     │
│  ├─ JWT authentication                  │
│  ├─ Gamification system                 │
│  ├─ CORS middleware                     │
│  └─ Prometheus metrics                  │
└────────┬────────────────────────────────┘
         │ SQLAlchemy
         ↓
┌─────────────────┐
│   SQLite DB     │
│  taskflow.db    │
└─────────────────┘
```

---

## Key Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/auth/register` | Create user | ❌ |
| POST | `/auth/login` | Get JWT token | ❌ |
| GET | `/users/me` | User profile | ✅ |
| PATCH | `/users/me/settings` | Update settings | ✅ |
| GET | `/tasks` | List user's tasks | ✅ |
| POST | `/tasks` | Create task | ✅ |
| PATCH | `/tasks/{id}` | Update task (points awarded here!) | ✅ |
| DELETE | `/tasks/{id}` | Delete task | ✅ |
| GET | `/tasks/summary/stats` | Task statistics | ✅ |
| GET | `/health` | Health check | ❌ |

---

## Security Highlights

```python
# 1. Password Hashing
PBKDF2-HMAC-SHA256 with 260k iterations + random salt

# 2. JWT Token
Custom implementation: {header}.{payload}.{signature}
Expiration: 12 hours
Verification: Signature + expiration check

# 3. Authorization
Every endpoint checks: if task.owner_id != current_user.id: raise 403

# 4. Input Validation
Pydantic schemas validate all input
- Username: 3-50 chars
- Password: 8-128 chars
- Title: 1-200 chars

# 5. XSS Prevention
HTML escaping: escapeHtml() function
Content-Security-Policy headers
Parameterized queries (SQLAlchemy ORM)
```

---

## Database Schema

```sql
-- Users Table
users:
├─ id (Primary Key)
├─ username (Unique, Indexed)
├─ password_hash
├─ points (default: 100)
├─ tasks_completed
├─ theme_color
├─ font_style
└─ created_at

-- Tasks Table
tasks:
├─ id (Primary Key)
├─ owner_id (Foreign Key → users.id, Indexed, Cascade Delete)
├─ title
├─ description
├─ status (todo | in_progress | done)
├─ priority (low | medium | high)
├─ points_reward
├─ points_awarded (boolean - prevent double-awarding)
├─ due_date
├─ completed_at
├─ created_at
└─ updated_at
```

---

## API Authentication Flow

```
1. User registers
   POST /auth/register {"username": "john", "password": "secure123"}
   → Hash password with PBKDF2
   → Store user in DB
   → Return JWT token

2. User logs in
   POST /auth/login {"username": "john", "password": "secure123"}
   → Verify username exists
   → Compare password with hash (timing-safe)
   → Generate JWT token
   → Return token

3. User makes authenticated request
   GET /tasks
   Header: Authorization: Bearer {jwt_token}
   → Extract token from header
   → Verify signature
   → Check expiration
   → Extract user_id from payload
   → Get user from DB
   → Return protected resource

4. Token expires
   Request fails with 401 Unauthorized
   → Frontend redirects to login
   → User logs in again
```

---

## Testing Strategy

```
Backend (pytest)
├─ test_auth.py
│  ├─ Registration success
│  ├─ Duplicate username rejection
│  └─ Login with wrong password
├─ test_tasks.py
│  ├─ Create task
│  ├─ Update task status
│  ├─ Points awarded on completion
│  └─ Prevent unauthorized access
├─ test_user.py
│  ├─ Get user profile
│  └─ Update settings
└─ Coverage: 85%+

Frontend (Jest)
├─ api.test.js
│  ├─ Token injection
│  ├─ Error handling
│  └─ 401 redirect
└─ utils.test.js
   ├─ HTML escaping
   └─ Date formatting
```

---

## DevOps Stack

```
Git Repository
    ↓
Jenkins Pipeline
├─ Stage 1: Checkout code
├─ Stage 2: Run backend tests (pytest)
├─ Stage 3: Run frontend tests (Jest)
├─ Stage 4: Build Docker images
├─ Stage 5: Validate Terraform
├─ Stage 6: Validate Ansible
└─ Stage 7: Deploy to AWS
    ↓
Docker Image
├─ Backend image (Python + FastAPI)
└─ Frontend image (Nginx + static files)
    ↓
AWS EC2 Instance (Terraform provisioned)
├─ VPC with security groups
└─ SSH access with key pair
    ↓
Ansible Playbook
├─ Install Docker
├─ Install Docker Compose
├─ Pull images
└─ Start containers
    ↓
Application Running
├─ Backend on port 8000
├─ Frontend on port 3000
└─ Prometheus metrics on /metrics
    ↓
Prometheus + Grafana Monitoring
├─ Scrape metrics every 30s
├─ Visualize dashboards
└─ Alert on thresholds
```

---

## Kubernetes Deployment

```yaml
Namespace: taskflow
  ├─ ConfigMap: App configuration
  ├─ Secret: Database credentials
  ├─ Deployment: Backend (3 replicas)
  │  ├─ Container: taskflow-backend:latest
  │  ├─ Liveness probe: /health every 10s
  │  ├─ Readiness probe: /health every 5s
  │  ├─ Resource limits: 512Mi RAM, 500m CPU
  │  └─ Volume mount: /app/data → PVC
  ├─ Deployment: Frontend (2 replicas)
  │  ├─ Container: taskflow-frontend:latest
  │  ├─ Resource limits: 128Mi RAM, 100m CPU
  │  └─ No volume (stateless)
  ├─ Service: backend (ClusterIP)
  ├─ Service: frontend (LoadBalancer)
  ├─ PersistentVolumeClaim: 5Gi storage
  ├─ HorizontalPodAutoscaler: Scale up at 70% CPU
  └─ Ingress: taskflow.example.com
```

---

## Gamification System

```python
Task Creation:
task = Task(
    title="Learn FastAPI",
    points_reward=50  # Points when complete
)

Mark Task Complete:
task.status = "done"
if not task.points_awarded:
    current_user.points += task.points_reward  # Add points
    task.points_awarded = True  # Prevent double-awarding
    current_user.tasks_completed += 1
    db.commit()

User sees:
"You earned 50 points! 🎉"
Total points: 150 (100 + 50)
Tasks completed: 1
```

---

## File Locations

```
Frontend:
├─ index.html              (Kanban board dashboard)
├─ auth.html               (Login/register form)
├─ styles.css              (CSS with custom properties)
├─ config.js               (API base URL)
├─ tf.svg                  (Logo)
├─ src/
│  ├─ api.js               (HTTP client, JWT injection)
│  ├─ auth.js              (Auth form handling)
│  ├─ dashboard.js         (Kanban board logic)
│  └─ utils.js             (XSS prevention, date formatting)
└─ __tests__/              (Jest tests)

Backend:
├─ main.py                 (Entry point, router setup)
├─ requirements.txt        (Dependencies)
├─ pytest.ini              (Test configuration)
├─ app/
│  ├─ __init__.py
│  ├─ main.py              (FastAPI app, CORS)
│  ├─ models.py            (SQLAlchemy: User, Task)
│  ├─ schemas.py           (Pydantic validators)
│  ├─ database.py          (SQLAlchemy session)
│  ├─ dependencies.py      (get_current_user)
│  ├─ core/
│  │  ├─ config.py         (Environment variables)
│  │  └─ security.py       (JWT, password hashing)
│  └─ routers/
│     ├─ auth.py           (Register, login endpoints)
│     ├─ users.py          (Profile, settings endpoints)
│     └─ tasks.py          (CRUD + gamification)
└─ tests/                  (pytest test files)

DevOps:
├─ devops/
│  ├─ build/
│  │  ├─ dockerfiles/
│  │  │  ├─ backend.Dockerfile
│  │  │  └─ frontend.Dockerfile
│  │  └─ nginx/
│  │     └─ default.conf
│  ├─ containers/
│  │  └─ docker-compose.yml
│  ├─ ci-cd/
│  │  └─ Jenkinsfile
│  ├─ infra-build/
│  │  └─ terraform/         (AWS infrastructure)
│  ├─ configure-infra/
│  │  └─ ansible/           (Server configuration)
│  ├─ kubernetes/           (K8s manifests)
│  ├─ monitoring/           (Prometheus, Grafana)
│  └─ scripts/              (Health checks)
```

---

## Common Interview Questions - Quick Answers

| Q | A |
|---|---|
| **How does authentication work?** | Custom JWT: hash password with PBKDF2, generate token on login, verify signature & expiration on each request |
| **How do you prevent SQL injection?** | Use SQLAlchemy ORM (parameterized queries), not raw SQL |
| **How do you prevent XSS?** | HTML escaping function, Content-Security-Policy headers, Pydantic validation |
| **Why custom JWT instead of library?** | Educational - understand security details; could use PyJWT in production |
| **How does gamification prevent cheating?** | `points_awarded` flag prevents multiple awards; atomic DB transaction |
| **How do you scale to 1M users?** | PostgreSQL sharding, Redis cache, Kubernetes autoscaling, load balancing, CDN |
| **Monolith or microservices?** | Monolith for simplicity. Microservices at 10k+ req/sec or 50+ developers |
| **What's your biggest weakness in this project?** | SQLite not production-ready; should use PostgreSQL; Vanilla JS needs React |
| **What would you improve?** | PostgreSQL, React, Redis cache, WebSockets, Elasticsearch, distributed logging |
| **Most complex part?** | Atomic gamification system to prevent double-awarding + DevOps pipeline |

---

## Pre-Interview Checklist

- [ ] Can explain every file in 30 seconds
- [ ] Understand JWT token format completely
- [ ] Know password hashing algorithm (PBKDF2)
- [ ] Can draw architecture on whiteboard
- [ ] Know all 9 API endpoints
- [ ] Understand SQL schema relationships
- [ ] Can explain Kubernetes deployment
- [ ] Know why each tech was chosen
- [ ] Have code snippets memorized (auth flow, gamification)
- [ ] Can discuss trade-offs and improvements
- [ ] Repository is public and accessible
- [ ] README.md is well-written and links to docs

---

## Energy Boosters Before Interview

🚀 **Remember:**
- You built this entire application - own it!
- You understand security, testing, DevOps
- You can explain any part in depth
- Your project is portfolio-quality
- Companies want engineers like you

💪 **Key Confidence Points:**
1. Full-stack (frontend + backend)
2. Production-ready (DevOps + monitoring)
3. Secure (custom auth, encryption)
4. Well-tested (85%+ coverage)
5. Scalable (Kubernetes, caching-ready)

✨ **You're interviewing them too!**
- Ask about their tech stack
- Discuss trade-offs you'd make
- Show curiosity about their systems
- Be thoughtful, not just impressive

---

**GO GET THAT JOB! 🚀**

Confidence is earned through preparation + knowledge. You have both.

---
Created: May 10, 2026
Last Review: Today
