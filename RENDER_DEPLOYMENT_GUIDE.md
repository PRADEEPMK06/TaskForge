# Render Deployment Guide - TaskFlow Task Manager

Complete step-by-step instructions to deploy your Full-Stack Task Manager on Render.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Prepare Your Repository](#prepare-your-repository)
3. [Deploy Backend (FastAPI)](#deploy-backend-fastapi)
4. [Deploy Frontend](#deploy-frontend)
5. [Connect Services](#connect-services)
6. [Testing & Verification](#testing--verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you start, you need:

### 1. **Render Account** (Free/Paid)
   - Go to [render.com](https://render.com)
   - Click "Get Started" → Sign up with GitHub (recommended)
   - Connect your GitHub account

### 2. **GitHub Repository**
   - Push your TASKMANAGER-main project to GitHub
   - Command:
     ```powershell
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin https://github.com/YOUR-USERNAME/TASKMANAGER-main.git
     git branch -M main
     git push -u origin main
     ```

### 3. **Environment Variables Ready**
   - You'll need these values during deployment
   - Prepare: `SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`

---

## Prepare Your Repository

### Step 1: Create a Render Configuration File

Create `.render/backend.yaml` for backend deployment:

```bash
mkdir -p .render
```

Create file: `.render/backend.yaml`

```yaml
services:
  - type: web
    name: taskflow-backend
    runtime: python
    buildCommand: pip install -r app/backend/requirements.txt
    startCommand: cd app/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHONUNBUFFERED
        value: 1
      - key: PORT
        value: 8000
```

### Step 2: Create a Render Configuration File for Frontend

Create file: `.render/frontend.yaml`

```yaml
services:
  - type: static_site
    name: taskflow-frontend
    buildCommand: echo "No build needed"
    staticPublishPath: app/frontend
    routes:
      - path: /
        target: index.html
      - path: /static
        target: static
```

### Step 3: Update Backend Configuration

Create file: `app/backend/render.sh`

```bash
#!/bin/bash
cd /app/backend
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Make it executable:
```powershell
git update-index --chmod=+x app/backend/render.sh
```

### Step 4: Create Production Database Setup

Update `app/backend/app/database.py` to support PostgreSQL for production:

Create file: `app/backend/app/database_prod.py`

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# For production on Render - use PostgreSQL
if os.getenv("RENDER"):
    DATABASE_URL = os.getenv("DATABASE_URL")
    # Convert sqlite to postgresql if needed
    if DATABASE_URL and DATABASE_URL.startswith("sqlite"):
        # Use default SQLite for local dev
        pass
else:
    DATABASE_URL = "sqlite:///./data/taskflow.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Step 5: Create a Procfile (Optional but recommended)

Create file: `Procfile`

```
web: cd app/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## Deploy Backend (FastAPI)

### Step 1: Create a Web Service on Render

1. **Go to Dashboard**: [render.com/dashboard](https://render.com/dashboard)

2. **Click "New +"** → Select **"Web Service"**

3. **Connect Repository**:
   - Select "GitHub"
   - Search for your repository: `TASKMANAGER-main`
   - Click "Connect"

4. **Configure Service Settings**:

   | Field | Value |
   |-------|-------|
   | **Name** | taskflow-backend |
   | **Region** | Choose closest to your users (US East recommended) |
   | **Runtime** | Python 3.12 |
   | **Build Command** | `pip install -r app/backend/requirements.txt` |
   | **Start Command** | `cd app/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | **Plan** | Free (for testing) or Paid |

5. **Scroll Down** to **Advanced**:
   - ✅ Auto-Deploy: Enable
   - ✅ Keep alive: Enable (for free tier)

### Step 2: Add Environment Variables

Click "Advanced" → **Environment Variables**

Add the following:

```
PYTHONUNBUFFERED=1
SECRET_KEY=your-very-secure-random-key-here-change-this
DATABASE_URL=sqlite:///./data/taskflow.db
ACCESS_TOKEN_EXPIRE_MINUTES=720
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Important**: Generate a strong `SECRET_KEY`:
```python
# Run in Python:
import secrets
print(secrets.token_urlsafe(32))
```

### Step 3: Deploy

Click **"Create Web Service"**

- Status: Building → Deploying → Live
- This takes 3-5 minutes
- ✅ You'll get a URL like: `https://taskflow-backend.onrender.com`

### Step 4: Verify Backend Deployment

Once deployed, test:

1. **Health Check**: Visit `https://taskflow-backend.onrender.com/health`
   - Should return: `"OK"`

2. **API Docs**: Visit `https://taskflow-backend.onrender.com/docs`
   - Should show Swagger UI

---

## Deploy Frontend

### Option A: Deploy Static Frontend (Recommended)

#### Step 1: Create Static Site on Render

1. **Go to Dashboard** → Click **"New +"** → **"Static Site"**

2. **Connect Repository**:
   - Select your GitHub repository: `TASKMANAGER-main`
   - Click "Connect"

3. **Configure Service Settings**:

   | Field | Value |
   |-------|-------|
   | **Name** | taskflow-frontend |
   | **Region** | Same as backend |
   | **Build Command** | `echo "Static files ready"` |
   | **Publish Directory** | `app/frontend` |
   | **Root Directory** | `.` (leave empty) |

4. **Click "Create Static Site"**

#### Step 2: Update Frontend to Use Backend URL

Edit file: `app/frontend/config.js`

```javascript
// config.js
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://taskflow-backend.onrender.com'
  : 'http://localhost:8000';

export { API_BASE_URL };
```

Edit file: `app/frontend/src/api.js`

```javascript
// At the top of api.js
import { API_BASE_URL } from '../config.js';

// Use API_BASE_URL in all fetch calls
const API_URL = `${API_BASE_URL}/api`;
```

#### Step 3: Push Changes

```powershell
git add .
git commit -m "Update frontend API configuration for Render deployment"
git push origin main
```

Frontend will auto-deploy. You'll get URL like: `https://taskflow-frontend.onrender.com`

---

### Option B: Deploy Frontend as Web Service (Advanced)

If you want a containerized frontend:

#### Step 1: Create Nginx Configuration

File already exists: `devops/build/nginx/default.conf`

Edit to add backend proxy:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://taskflow-backend.onrender.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Step 2: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo
3. Configure:
   - **Name**: taskflow-frontend
   - **Runtime**: Docker
   - **Build Command**: `docker build -f devops/build/dockerfiles/frontend.Dockerfile -t frontend .`
   - **Start Command**: `nginx -g 'daemon off;'`

---

## Connect Services

### Update Backend CORS Settings

Edit file: `app/backend/app/core/config.py`

```python
import os

class Settings:
    # ... existing code ...
    
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:8000"
    ).split(",")
    
    # Add your Render frontend URL
    if "RENDER" in os.environ:
        frontend_url = os.getenv("FRONTEND_URL", "")
        if frontend_url and frontend_url not in CORS_ORIGINS:
            CORS_ORIGINS.append(frontend_url)
```

### Update Backend Environment Variables

Go to backend service → Settings → Environment Variables

Add/Update:

```
CORS_ORIGINS=http://localhost:3000,https://taskflow-frontend.onrender.com,https://taskflow-backend.onrender.com
FRONTEND_URL=https://taskflow-frontend.onrender.com
```

---

## Testing & Verification

### Test Backend

```powershell
# Test health endpoint
curl https://taskflow-backend.onrender.com/health

# Test API docs
# Visit: https://taskflow-backend.onrender.com/docs
```

### Test Frontend

1. **Visit**: `https://taskflow-frontend.onrender.com`
2. **Check Browser Console**: No CORS errors
3. **Try Login**: Create test account
4. **Create Task**: Verify it saves

### Test Cross-Service Communication

1. Open frontend in browser
2. Open DevTools (F12)
3. Try to create a task
4. Check Network tab - request should go to backend URL
5. Verify response

---

## Production Database (Optional)

For production, use PostgreSQL instead of SQLite:

### Step 1: Create PostgreSQL Database on Render

1. **Dashboard** → **"New +"** → **"PostgreSQL"**
2. Fill in:
   - **Name**: taskflow-db
   - **Region**: Same as backend
   - **PostgreSQL Version**: 15 (or latest)
3. Click **"Create Database"**

### Step 2: Get Connection String

Copy the **External Database URL** from the database dashboard.

Format: `postgresql://user:password@host:port/dbname`

### Step 3: Update Backend

1. Go to backend service → **Settings** → **Environment Variables**
2. Update:
   ```
   DATABASE_URL=postgresql://user:password@host:port/dbname
   ```

3. Push code changes:
   ```powershell
   git add .
   git commit -m "Update database configuration for PostgreSQL"
   git push origin main
   ```

Backend will redeploy automatically.

---

## Troubleshooting

### Issue: Backend Service Won't Start

**Check Logs**:
1. Backend service → **Logs** tab
2. Look for error messages
3. Common issues:
   - Missing dependencies: Add to `requirements.txt`
   - Import errors: Check file paths
   - Port issues: Ensure using `$PORT` variable

**Solution**:
```powershell
# Fix locally first
cd app/backend
pip install -r requirements.txt
uvicorn app.main:app

# Push fixes
git add .
git commit -m "Fix dependency issues"
git push origin main
```

### Issue: CORS Errors on Frontend

**Error**: `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution**:
1. Backend service → Environment Variables
2. Update `CORS_ORIGINS` to include frontend URL:
   ```
   CORS_ORIGINS=https://taskflow-frontend.onrender.com
   ```
3. Redeploy backend

### Issue: Static Files Not Loading

**Solution** for frontend:
1. Ensure all files are in `app/frontend/`
2. Update **Publish Directory** to: `app/frontend`
3. Redeploy

### Issue: Database Migrations Not Running

**Solution**:
Add initialization script before app start. Create: `app/backend/init_db.py`

```python
from app.database import Base, engine
from app.models import User, Task

# Create all tables
Base.metadata.create_all(bind=engine)
print("Database initialized!")
```

Update **Start Command** in backend:
```
cd app/backend && python init_db.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Issue: Free Tier Going to Sleep

**Prevent Spinning Down**:
1. Backend service → **Settings** → **Advanced**
2. Enable **"Keep alive"**
3. Or upgrade to Paid plan

---

## Final Checklist

- [ ] Backend deployed and health check passes
- [ ] Frontend deployed and loads without errors
- [ ] CORS configured correctly
- [ ] Environment variables set for both services
- [ ] Database connection working
- [ ] Can create user account on frontend
- [ ] Can create tasks and they persist
- [ ] API documentation accessible at `/docs`

---

## Useful Render Links

- **Dashboard**: https://render.com/dashboard
- **Docs**: https://render.com/docs
- **Community Support**: https://community.render.com

---

## Support

If you encounter issues:

1. **Check Render Logs**: Service → Logs tab
2. **Check Frontend Console**: Browser F12 → Console
3. **Test Locally First**: Reproduce issue in Docker Compose
4. **Render Documentation**: https://render.com/docs/deploy-fastapi

Good luck with your deployment! 🚀
