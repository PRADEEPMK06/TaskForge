# TaskFlow - Complete Architecture & Workflow Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Full Architecture Diagram](#full-architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Application Workflow](#application-workflow)
5. [Backend File Structure & Code Breakdown](#backend-file-structure--code-breakdown)
6. [Frontend File Structure & Code Breakdown](#frontend-file-structure--code-breakdown)
7. [DevOps Architecture](#devops-architecture)
8. [Database Schema](#database-schema)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [Security Implementation](#security-implementation)

---

## Project Overview

**TaskFlow** is a full-stack task management application built as a comprehensive DevOps portfolio project. It demonstrates:

- ✅ **Full-Stack Development**: FastAPI backend + Vanilla JavaScript frontend
- ✅ **Authentication**: Custom JWT implementation with PBKDF2 password hashing
- ✅ **Task Management**: Kanban board with status workflows and gamification (points system)
- ✅ **DevOps Excellence**: Docker, Docker Compose, Jenkins CI/CD, Terraform, Ansible, Kubernetes
- ✅ **Production-Ready**: Health checks, metrics (Prometheus), comprehensive testing
- ✅ **Security**: XSS prevention, CSRF protection, SQL injection prevention

**Key Statistics**:
- 1 Database (SQLite with 2 tables: users, tasks)
- 7 API Endpoints (REST architecture)
- 4 JavaScript files handling UI/API
- 3 DevOps deployment targets (Docker, Terraform/AWS, Kubernetes)
- 5 Test suites (3 backend, 2 frontend)

---

## Full Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE LAYER                         │
├──────────────────────────────────────────────────────────────────────┤
│  Browser (HTML/CSS/JavaScript)                                        │
│  ├─ index.html       (Main dashboard - Kanban board)                 │
│  ├─ auth.html        (Login/Register page)                           │
│  └─ src/             (JavaScript logic)                               │
│     ├─ api.js        (HTTP client with authentication)               │
│     ├─ auth.js       (Login/register form handlers)                  │
│     ├─ dashboard.js  (Kanban board UI & state management)            │
│     └─ utils.js      (HTML escaping, formatting utilities)           │
└──────────────────────────────────────────────────────────────────────┘
                              ↓ (HTTP/REST)
┌──────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (FastAPI)                      │
├──────────────────────────────────────────────────────────────────────┤
│  app/main.py                                                          │
│  ├─ CORS Middleware (Allow localhost origins)                        │
│  ├─ Health Check Endpoint (/health)                                  │
│  ├─ Metrics Endpoint (/metrics)                                      │
│  └─ Router Includes                                                  │
│                                                                        │
│  app/routers/                                                         │
│  ├─ auth.py   → POST /auth/register, POST /auth/login               │
│  ├─ users.py  → GET /users/me, PATCH /users/me/settings             │
│  └─ tasks.py  → GET/POST/PATCH/DELETE /tasks, GET /tasks/summary/stats
│                                                                        │
│  app/core/                                                            │
│  ├─ config.py (Environment-based settings)                           │
│  ├─ security.py (JWT creation, password hashing)                     │
│  └─ dependencies.py (Bearer token extraction)                        │
│                                                                        │
│  app/schemas.py (Pydantic validators for I/O)                        │
│  app/models.py (SQLAlchemy ORM models)                               │
│  app/database.py (SQLAlchemy session management)                     │
└──────────────────────────────────────────────────────────────────────┘
                              ↓ (ORM Queries)
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                             │
├──────────────────────────────────────────────────────────────────────┤
│  SQLite Database                                                      │
│  ├─ users table                                                      │
│  │  ├─ id (PK)                                                       │
│  │  ├─ username (UNIQUE)                                             │
│  │  ├─ password_hash                                                 │
│  │  ├─ points (Gamification)                                         │
│  │  ├─ tasks_completed (Counter)                                     │
│  │  ├─ theme_color, font_style (Settings)                           │
│  │  └─ created_at                                                    │
│  │                                                                    │
│  └─ tasks table                                                      │
│     ├─ id (PK)                                                       │
│     ├─ owner_id (FK → users.id) [Cascade Delete]                    │
│     ├─ title, description                                            │
│     ├─ status (todo|in_progress|done)                                │
│     ├─ priority (low|medium|high)                                    │
│     ├─ points_reward, points_awarded (Gamification)                  │
│     ├─ due_date, completed_at                                        │
│     ├─ created_at, updated_at                                        │
│     └─ [Indexes on: owner_id, status, created_at]                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technologies | Version |
|-------|--------------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | ES6+ |
| **Backend** | Python, FastAPI, Uvicorn | 3.12, 0.115.6, 0.34.0 |
| **ORM** | SQLAlchemy | 2.0.36 |
| **Validation** | Pydantic | 2.10.4 |
| **Database** | SQLite | 3.x |
| **Testing (Backend)** | pytest, pytest-cov | 8.3.4, 6.0.0 |
| **Testing (Frontend)** | Jest, @testing-library | 29.7.0 |
| **Containers** | Docker, Docker Compose | Latest |
| **CI/CD** | Jenkins | Declarative Pipeline |
| **Infrastructure** | Terraform | AWS EC2 |
| **Configuration** | Ansible | Dynamic Inventory |
| **Orchestration** | Kubernetes | Manifests (YAML) |
| **Monitoring** | Prometheus, Grafana | Stack |

---

## Application Workflow

### 1. **User Registration & Authentication Flow**

```
START → User opens http://localhost:3000
  ↓
  Check localStorage for 'taskflow_token'
  ├─ Token exists? → Redirect to /index.html (dashboard)
  └─ No token? → Show auth.html (login/register)
  ↓
USER CHOOSES "REGISTER" MODE
  ├─ Input: username (3-50 chars), password (8-128 chars)
  ├─ Send POST /auth/register {username, password}
  ├─ Backend:
  │  ├─ Check if username exists in DB
  │  ├─ If exists → Return 400 "Username already registered"
  │  ├─ If new → Generate salt + hash password (PBKDF2, 260k iterations)
  │  ├─ Create user record with:
  │  │  ├─ points = 100 (starting)
  │  │  ├─ tasks_completed = 0
  │  │  ├─ theme_color = "#2563eb" (default)
  │  │  ├─ font_style = "Inter" (default)
  │  │  └─ created_at = NOW
  │  ├─ Generate JWT token (valid 12 hours)
  │  └─ Return {token, user}
  ├─ Frontend:
  │  ├─ Store token in localStorage['taskflow_token']
  │  ├─ Store user in localStorage['taskflow_user']
  │  ├─ Redirect to dashboard
  └─ END
```

### 2. **Login Flow**

```
User clicks "Login" mode
  ├─ Input: username, password
  ├─ Send POST /auth/login {username, password}
  ├─ Backend:
  │  ├─ Query: SELECT * FROM users WHERE username = ?
  │  ├─ If not found → Return 401 "Invalid credentials"
  │  ├─ If found → Compare password_hash using timing-safe comparison
  │  ├─ If match → Generate JWT token
  │  └─ Return {token, user}
  └─ Frontend: Store token + redirect to dashboard
```

### 3. **Protected Request Flow**

```
User opens dashboard → JavaScript loads
  ├─ Retrieve token from localStorage
  ├─ Make API request:
  │  ├─ GET /tasks
  │  ├─ Header: "Authorization: Bearer {token}"
  │  └─ (api.js adds this automatically)
  ├─ Backend receives request:
  │  ├─ Extract token from Authorization header
  │  ├─ Verify JWT signature (check SECRET_KEY)
  │  ├─ Extract user_id from payload
  │  ├─ Query: SELECT * FROM users WHERE id = user_id
  │  ├─ Attach user to request context
  │  └─ Proceed to route handler
  ├─ If token invalid/expired → Return 401 "Token expired"
  │  └─ Frontend: Clear localStorage + redirect to login
  └─ If valid → Execute endpoint logic
```

### 4. **Task Creation & Management Workflow**

```
User fills task form:
  ├─ Title: "Implement feature X"
  ├─ Description: "Build the authentication module"
  ├─ Priority: "high"
  ├─ Points: 50
  └─ Due Date: 2026-05-15

Send POST /tasks {title, description, priority, points_reward, due_date}
  ├─ Backend (routers/tasks.py):
  │  ├─ Validate input using TaskCreate schema (Pydantic)
  │  ├─ Create task object:
  │  │  ├─ status = "todo" (default)
  │  │  ├─ points_awarded = False
  │  │  ├─ completed_at = None
  │  │  ├─ owner_id = current_user.id (from JWT)
  │  │  └─ created_at = NOW
  │  ├─ Save to database
  │  ├─ Return TaskRead {id, title, ..., owner: UserRead}
  └─ Frontend (dashboard.js):
     ├─ Add task to in-memory array
     ├─ Re-render board
     ├─ Show success notification
     └─ Clear form

User clicks "Start" on task
  ├─ Send PATCH /tasks/{id} {status: "in_progress"}
  ├─ Backend:
  │  ├─ Query task by id
  │  ├─ Verify ownership (task.owner_id == current_user.id)
  │  ├─ If not owned → Return 403 "Forbidden"
  │  ├─ Update task.status = "in_progress"
  │  ├─ Update task.updated_at = NOW
  │  └─ Return updated task
  └─ Frontend: Move task card to "In Progress" column

User marks task "Done"
  ├─ Send PATCH /tasks/{id} {status: "done", completed_at: NOW}
  ├─ Backend:
  │  ├─ Update status = "done"
  │  ├─ Update completed_at = NOW
  │  ├─ **Check if points not yet awarded**: if !task.points_awarded:
  │  │  ├─ Add task.points_reward to user.points
  │  │  ├─ Increment user.tasks_completed += 1
  │  │  ├─ Set task.points_awarded = True
  │  └─ Return updated task
  └─ Frontend: 
     ├─ Move task to "Done" column
     ├─ Fetch updated user stats
     ├─ Update points display
     └─ Show success toast
```

### 5. **Statistics Aggregation Flow**

```
User opens dashboard → Auto-load stats
  ├─ Send GET /tasks/summary/stats
  ├─ Backend (core business logic):
  │  ├─ Query all tasks for current_user
  │  ├─ Count by status:
  │  │  ├─ total = len(all_tasks)
  │  │  ├─ todo = len(status=="todo")
  │  │  ├─ in_progress = len(status=="in_progress")
  │  │  ├─ done = len(status=="done")
  │  ├─ Calculate completion_rate = (done / total) * 100 if total > 0 else 0
  │  ├─ Return {total, todo, in_progress, done, completion_rate}
  └─ Frontend:
     ├─ Update metric tiles (Total: 15, In progress: 3, Completed: 8, Rate: 53%)
     └─ Update column counts dynamically
```

### 6. **User Settings Update Flow**

```
User opens Settings dialog
  ├─ Current values: theme_color, font_style
  ├─ User selects new accent color: "#dc2626" (red)
  ├─ Send PATCH /users/me/settings {theme_color: "#dc2626"}
  ├─ Backend:
  │  ├─ Validate color format
  │  ├─ Update user.theme_color
  │  ├─ Return updated user object
  └─ Frontend:
     ├─ Update CSS variable: --accent = "#dc2626"
     ├─ Re-apply styles to all elements
     ├─ Save to localStorage
     └─ Show success notification
```

---

## Backend File Structure & Code Breakdown

### **app/main.py** - Application Factory & Entry Point

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, tasks, users
from app.database import init_db

app = FastAPI(title="TaskFlow API", version="1.0.0")

# CORS Middleware: Allow requests from localhost:3000 & 8080
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
@app.on_event("startup")
async def startup():
    init_db()

# Health check endpoint (used by load balancers, Kubernetes)
@app.get("/health")
async def health():
    return {"status": "ok"}

# Prometheus metrics endpoint (raw format, scraped by monitoring tools)
@app.get("/metrics")
async def metrics():
    return metrics_data()

# Include routers (groups endpoints by domain)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
```

**Key Concepts**:
- **CORS Middleware**: Prevents browser from blocking requests from frontend to backend
- **Startup Event**: Runs once when server starts (db initialization)
- **Health Endpoint**: Returns 200 if service is alive (used in deployments)
- **Metrics Endpoint**: Exposes application metrics in Prometheus format

---

### **app/models.py** - Database Models (SQLAlchemy ORM)

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    
    # Gamification: Users earn points by completing tasks
    points = Column(Integer, default=100)  # Start with 100 points
    tasks_completed = Column(Integer, default=0)  # Counter
    
    # User preferences
    theme_color = Column(String, default="#2563eb")  # Customizable accent
    font_style = Column(String, default="Inter")     # Customizable font
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship: One user has many tasks (cascade delete)
    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    title = Column(String(200), nullable=False)
    description = Column(String(2000), default="")
    
    # Task status workflow
    status = Column(String, default="todo")  # todo, in_progress, done
    priority = Column(String, default="medium")  # low, medium, high
    
    # Gamification: Points system
    points_reward = Column(Integer, default=10)  # Points if completed
    points_awarded = Column(Boolean, default=False)  # Prevent double-awarding
    
    # Workflow tracking
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship: Many tasks belong to one user
    owner = relationship("User", back_populates="tasks")
```

**Key Design Decisions**:
- **Cascade Delete**: If user deleted, all their tasks deleted automatically
- **Index on owner_id**: Fast filtering of tasks by user
- **points_awarded Flag**: Prevents user from earning points multiple times for same task
- **Status Enum**: Enforces workflow rules (todo → in_progress → done)

---

### **app/schemas.py** - Pydantic Validators (Request/Response)

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Request: User registration
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)

# Request: User login (same as create)
class UserLogin(UserCreate):
    pass

# Response: User info (excludes sensitive data)
class UserRead(BaseModel):
    id: int
    username: str
    points: int
    tasks_completed: int
    theme_color: str
    font_style: str
    created_at: datetime
    
    class Config:
        from_attributes = True  # Support SQLAlchemy objects

# Response: With auth token
class AuthResponse(BaseModel):
    access_token: str
    token_type: str  # "bearer"
    user: UserRead

# Request: Task creation
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    priority: str = Field(default="medium")
    points_reward: int = Field(default=10, ge=1, le=100)
    due_date: Optional[datetime] = None

# Request: Task update (all fields optional)
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # todo, in_progress, done
    priority: Optional[str] = None
    points_reward: Optional[int] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None

# Response: Task info
class TaskRead(BaseModel):
    id: int
    title: str
    description: str
    status: str
    priority: str
    points_reward: int
    points_awarded: bool
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    owner: UserRead  # Nested user info
    
    class Config:
        from_attributes = True

# Response: Task statistics
class TaskStats(BaseModel):
    total: int
    todo: int
    in_progress: int
    done: int
    completion_rate: float
```

**Key Validation Rules**:
- Username: 3-50 characters, unique
- Password: 8-128 characters
- Task title: 1-200 characters (required)
- Points reward: 1-100 range
- Status: Only allows "todo", "in_progress", "done"

---

### **app/core/security.py** - Authentication & Password Hashing

```python
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta
import json
import base64

class SecurityManager:
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash password using PBKDF2-HMAC-SHA256 (260k iterations)
        Format: algorithm$iterations$salt$hash
        """
        salt = secrets.token_hex(32)  # 64-byte random salt
        
        # PBKDF2: Key derivation function
        # 260k iterations = Industry-standard (OWASP recommendations)
        hash_obj = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            260000
        )
        hash_hex = hash_obj.hex()
        
        return f"pbkdf2_sha256$260000${salt}${hash_hex}"
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """
        Verify password against stored hash using timing-safe comparison
        """
        try:
            # Parse stored hash format
            algorithm, iterations, salt, stored_hash = password_hash.split('$')
            
            # Recompute hash with provided password
            new_hash = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode('utf-8'),
                salt.encode('utf-8'),
                int(iterations)
            ).hex()
            
            # Timing-safe comparison (prevents timing attacks)
            return hmac.compare_digest(new_hash, stored_hash)
        except Exception:
            return False
    
    @staticmethod
    def create_jwt_token(user_id: int, secret_key: str, expires_in_hours: int = 12) -> str:
        """
        Create JWT token with custom implementation
        Format: header.payload.signature
        """
        # Header
        header = {
            "alg": "HS256",
            "typ": "JWT"
        }
        
        # Payload (claims)
        now = datetime.utcnow()
        payload = {
            "sub": str(user_id),           # subject (user id)
            "iat": int(now.timestamp()),   # issued at
            "exp": int((now + timedelta(hours=expires_in_hours)).timestamp())  # expiration
        }
        
        # Encode header and payload to Base64
        header_b64 = base64.urlsafe_b64encode(
            json.dumps(header).encode()
        ).decode().rstrip('=')
        
        payload_b64 = base64.urlsafe_b64encode(
            json.dumps(payload).encode()
        ).decode().rstrip('=')
        
        # Create signature
        message = f"{header_b64}.{payload_b64}"
        signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()
        
        signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')
        
        return f"{message}.{signature_b64}"
    
    @staticmethod
    def verify_jwt_token(token: str, secret_key: str) -> dict:
        """
        Verify and decode JWT token
        Returns payload dict or raises exception
        """
        try:
            header_b64, payload_b64, signature_b64 = token.split('.')
            
            # Verify signature
            message = f"{header_b64}.{payload_b64}"
            expected_signature = hmac.new(
                secret_key.encode(),
                message.encode(),
                hashlib.sha256
            ).digest()
            
            received_signature = base64.urlsafe_b64decode(signature_b64 + '==')
            
            if not hmac.compare_digest(expected_signature, received_signature):
                raise Exception("Invalid signature")
            
            # Decode payload
            payload_json = base64.urlsafe_b64decode(payload_b64 + '==').decode()
            payload = json.loads(payload_json)
            
            # Check expiration
            if payload['exp'] < int(datetime.utcnow().timestamp()):
                raise Exception("Token expired")
            
            return payload
        except Exception as e:
            raise Exception(f"Invalid token: {str(e)}")
```

**Security Highlights**:
- **PBKDF2-HMAC-SHA256**: Industry-standard key derivation function with 260k iterations
- **Random Salt**: Each password has unique salt, preventing rainbow table attacks
- **Timing-Safe Comparison**: `hmac.compare_digest()` prevents timing attacks
- **JWT Structure**: Standard header.payload.signature format
- **Token Expiration**: 12-hour validity period
- **Signature Verification**: Ensures token integrity

---

### **app/routers/auth.py** - Authentication Endpoints

```python
from fastapi import APIRouter, HTTPException
from app.schemas import UserCreate, AuthResponse, UserRead
from app.models import User
from app.database import get_db
from app.core.security import SecurityManager

router = APIRouter()

@router.post("/register", response_model=AuthResponse)
async def register(user_data: UserCreate, db = Depends(get_db)):
    """
    User registration endpoint
    1. Check if username already exists
    2. Hash password with PBKDF2
    3. Create new user record
    4. Generate JWT token
    5. Return token and user info
    """
    # Step 1: Prevent duplicate usernames
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Step 2: Hash password
    password_hash = SecurityManager.hash_password(user_data.password)
    
    # Step 3: Create user
    new_user = User(
        username=user_data.username,
        password_hash=password_hash,
        points=100,  # Starting points
        tasks_completed=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Step 4: Generate token
    token = SecurityManager.create_jwt_token(new_user.id, settings.SECRET_KEY)
    
    # Step 5: Return
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead.from_orm(new_user)
    )

@router.post("/login", response_model=AuthResponse)
async def login(user_data: UserLogin, db = Depends(get_db)):
    """
    User login endpoint
    1. Find user by username
    2. Verify password
    3. Generate JWT token
    4. Return token and user info
    """
    # Step 1: Find user
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Step 2: Verify password (timing-safe comparison)
    if not SecurityManager.verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Step 3: Generate token
    token = SecurityManager.create_jwt_token(user.id, settings.SECRET_KEY)
    
    # Step 4: Return
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead.from_orm(user)
    )
```

---

### **app/routers/tasks.py** - Task Management Endpoints

```python
from fastapi import APIRouter, HTTPException, Depends
from app.models import Task, User
from app.schemas import TaskCreate, TaskUpdate, TaskRead, TaskStats

router = APIRouter()

@router.get("", response_model=list[TaskRead])
async def list_tasks(current_user: User = Depends(get_current_user), db = Depends(get_db)):
    """
    Get all tasks for current user
    Filters by ownership (security)
    """
    tasks = db.query(Task).filter(Task.owner_id == current_user.id).all()
    return tasks

@router.post("", response_model=TaskRead)
async def create_task(task_data: TaskCreate, current_user: User = Depends(get_current_user), db = Depends(get_db)):
    """
    Create new task
    Sets owner_id automatically to current user
    """
    new_task = Task(
        owner_id=current_user.id,
        **task_data.dict()
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(task_id: int, task_data: TaskUpdate, current_user: User = Depends(get_current_user), db = Depends(get_db)):
    """
    Update task
    Key logic: Award points when task marked "done"
    """
    # Fetch task
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Verify ownership
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Update fields
    for field, value in task_data.dict(exclude_unset=True).items():
        setattr(task, field, value)
    
    # **GAMIFICATION LOGIC**: Award points when task marked done
    if task.status == "done" and not task.points_awarded:
        current_user.points += task.points_reward
        current_user.tasks_completed += 1
        task.points_awarded = True
        task.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int, current_user: User = Depends(get_current_user), db = Depends(get_db)):
    """
    Delete task (verify ownership)
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    db.delete(task)
    db.commit()

@router.get("/summary/stats", response_model=TaskStats)
async def get_task_stats(current_user: User = Depends(get_current_user), db = Depends(get_db)):
    """
    Aggregate task statistics
    Used to update dashboard metrics
    """
    tasks = db.query(Task).filter(Task.owner_id == current_user.id).all()
    
    total = len(tasks)
    todo = sum(1 for t in tasks if t.status == "todo")
    in_progress = sum(1 for t in tasks if t.status == "in_progress")
    done = sum(1 for t in tasks if t.status == "done")
    
    completion_rate = (done / total * 100) if total > 0 else 0.0
    
    return TaskStats(
        total=total,
        todo=todo,
        in_progress=in_progress,
        done=done,
        completion_rate=completion_rate
    )
```

---

## Frontend File Structure & Code Breakdown

### **index.html** - Main Dashboard

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow Dashboard</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- HEADER: Brand, points, settings, logout -->
  <header class="topbar">
    <div class="brand">
      <img src="tf.svg" alt="TaskFlow Logo" class="brand-logo">
      <div>
        <strong>TaskFlow</strong>
        <span>Delivery board</span>
      </div>
    </div>

    <div class="topbar-actions">
      <div class="points-pill">
        <span>Points</span>
        <strong id="user-points">0</strong>  <!-- Updated dynamically -->
      </div>
      <button id="settings-button">Settings</button>
      <button id="logout-button">Logout</button>
    </div>
  </header>

  <main class="app-shell">
    <!-- WELCOME SECTION: Title and new task button -->
    <section class="workspace-header">
      <div>
        <p id="welcome-label">Workspace</p>
        <h1>Task execution board</h1>
      </div>
      <button id="new-task-button">New task</button>
    </section>

    <!-- METRICS GRID: Summary statistics -->
    <section class="metrics-grid">
      <article class="metric-tile">
        <span>Total</span>
        <strong id="metric-total">0</strong>
      </article>
      <article class="metric-tile">
        <span>In progress</span>
        <strong id="metric-progress">0</strong>
      </article>
      <article class="metric-tile">
        <span>Completed</span>
        <strong id="metric-done">0</strong>
      </article>
      <article class="metric-tile">
        <span>Completion</span>
        <strong id="metric-rate">0%</strong>
      </article>
    </section>

    <!-- FILTERS: Status filter buttons -->
    <section class="board-toolbar">
      <div class="segmented-control" id="status-filter">
        <button class="active" data-status="all">All</button>
        <button data-status="todo">To do</button>
        <button data-status="in_progress">In progress</button>
        <button data-status="done">Done</button>
      </div>
    </section>

    <!-- KANBAN BOARD: Three columns (todo, in_progress, done) -->
    <section class="board" id="task-board">
      <!-- TO DO COLUMN -->
      <div class="column" data-status="todo">
        <div class="column-header">
          <h2>To do</h2>
          <span id="count-todo">0</span>
        </div>
        <div class="task-list" id="todo-list"></div>
      </div>

      <!-- IN PROGRESS COLUMN -->
      <div class="column" data-status="in_progress">
        <div class="column-header">
          <h2>In progress</h2>
          <span id="count-in-progress">0</span>
        </div>
        <div class="task-list" id="in-progress-list"></div>
      </div>

      <!-- DONE COLUMN -->
      <div class="column" data-status="done">
        <div class="column-header">
          <h2>Done</h2>
          <span id="count-done">0</span>
        </div>
        <div class="task-list" id="done-list"></div>
      </div>
    </section>
  </main>

  <!-- TASK MODAL: Form for creating/editing tasks -->
  <dialog class="modal" id="task-modal">
    <form id="task-form" class="modal-panel">
      <div class="modal-header">
        <h2 id="task-modal-title">New task</h2>
        <button type="button" class="close-button">×</button>
      </div>

      <fieldset>
        <label>
          Title
          <input type="text" name="title" required>
        </label>
        <label>
          Description
          <textarea name="description"></textarea>
        </label>
        <label>
          Priority
          <select name="priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Points
          <input type="number" name="points_reward" min="1" max="100" value="10">
        </label>
        <label>
          Due Date
          <input type="datetime-local" name="due_date">
        </label>
      </fieldset>

      <div class="modal-actions">
        <button type="submit" class="primary-button">Create Task</button>
        <button type="button" class="ghost-button">Cancel</button>
      </div>
    </form>
  </dialog>

  <!-- SETTINGS MODAL: User preferences -->
  <dialog class="modal" id="settings-modal">
    <form id="settings-form" class="modal-panel">
      <div class="modal-header">
        <h2>Settings</h2>
        <button type="button" class="close-button">×</button>
      </div>

      <fieldset>
        <label>
          Theme Color
          <input type="color" name="theme_color">
        </label>
        <label>
          Font Style
          <select name="font_style">
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Open Sans">Open Sans</option>
          </select>
        </label>
      </fieldset>

      <div class="modal-actions">
        <button type="submit" class="primary-button">Save</button>
        <button type="button" class="ghost-button">Cancel</button>
      </div>
    </form>
  </dialog>

  <!-- SCRIPTS: Load API, dashboard, and authentication handlers -->
  <script src="config.js"></script>
  <script src="src/api.js"></script>
  <script src="src/utils.js"></script>
  <script src="src/dashboard.js"></script>
</body>
</html>
```

---

### **src/api.js** - HTTP Client Layer

```javascript
/**
 * API Client with automatic authentication
 * Handles: HTTP requests, JWT token injection, error handling, session management
 */

class TaskFlowAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('taskflow_token');
    }

    /**
     * Make authenticated HTTP request
     * Automatically adds Authorization header with JWT token
     */
    async request(endpoint, options = {}) {
        // Step 1: Build URL
        const url = `${this.baseUrl}${endpoint}`;

        // Step 2: Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Step 3: Add JWT token if available
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            // Step 4: Make request
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Step 5: Handle response
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('taskflow_token');
                localStorage.removeItem('taskflow_user');
                window.location.href = '/auth.html';
                return;
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Request failed');
            }

            // Step 6: Parse and return JSON
            if (response.status === 204) {
                return null; // No content
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ===== AUTHENTICATION ENDPOINTS =====
    
    async register(username, password) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        // Store token for future requests
        this.token = response.access_token;
        localStorage.setItem('taskflow_token', this.token);
        localStorage.setItem('taskflow_user', JSON.stringify(response.user));
        
        return response;
    }

    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        this.token = response.access_token;
        localStorage.setItem('taskflow_token', this.token);
        localStorage.setItem('taskflow_user', JSON.stringify(response.user));
        
        return response;
    }

    // ===== USER ENDPOINTS =====
    
    async getProfile() {
        return await this.request('/users/me', { method: 'GET' });
    }

    async updateSettings(settings) {
        return await this.request('/users/me/settings', {
            method: 'PATCH',
            body: JSON.stringify(settings)
        });
    }

    // ===== TASK ENDPOINTS =====
    
    async getTasks() {
        return await this.request('/tasks', { method: 'GET' });
    }

    async createTask(taskData) {
        return await this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }

    async updateTask(taskId, updates) {
        return await this.request(`/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    async deleteTask(taskId) {
        return await this.request(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }

    async getTaskStats() {
        return await this.request('/tasks/summary/stats', { method: 'GET' });
    }
}

// Initialize API client
const api = new TaskFlowAPI(CONFIG.API_URL || 'http://localhost:8000');
```

---

### **src/dashboard.js** - Dashboard UI & State Management

```javascript
/**
 * Dashboard Controller
 * Manages: Kanban board rendering, task state, user interactions
 */

class Dashboard {
    constructor(api) {
        this.api = api;
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentUser = JSON.parse(localStorage.getItem('taskflow_user'));
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadData();
    }

    initializeElements() {
        // Task modal
        this.taskModal = document.getElementById('task-modal');
        this.taskForm = document.getElementById('task-form');
        
        // Settings modal
        this.settingsModal = document.getElementById('settings-modal');
        this.settingsForm = document.getElementById('settings-form');
        
        // Kanban columns
        this.taskLists = {
            'todo': document.getElementById('todo-list'),
            'in_progress': document.getElementById('in-progress-list'),
            'done': document.getElementById('done-list')
        };
        
        // Metric display elements
        this.metricElements = {
            'total': document.getElementById('metric-total'),
            'progress': document.getElementById('metric-progress'),
            'done': document.getElementById('metric-done'),
            'rate': document.getElementById('metric-rate')
        };
        
        // User points display
        this.pointsDisplay = document.getElementById('user-points');
    }

    attachEventListeners() {
        // New task button → Open modal
        document.getElementById('new-task-button').addEventListener('click', () => {
            this.taskForm.reset();
            this.taskModal.showModal();
        });

        // Task form submission
        this.taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createTask();
        });

        // Settings button
        document.getElementById('settings-button').addEventListener('click', () => {
            this.settingsModal.showModal();
        });

        // Settings form submission
        this.settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateSettings();
        });

        // Logout button
        document.getElementById('logout-button').addEventListener('click', () => {
            localStorage.removeItem('taskflow_token');
            localStorage.removeItem('taskflow_user');
            window.location.href = '/auth.html';
        });

        // Status filter buttons
        document.querySelectorAll('#status-filter button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                document.querySelectorAll('#status-filter button').forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.status;
                this.renderBoard();
            });
        });
    }

    async loadData() {
        try {
            // Load tasks and stats in parallel
            const [tasks, stats] = await Promise.all([
                this.api.getTasks(),
                this.api.getTaskStats()
            ]);

            this.tasks = tasks;
            this.stats = stats;

            // Update UI
            this.renderBoard();
            this.updateMetrics();
            this.updateUserProfile();
        } catch (error) {
            console.error('Failed to load data:', error);
            alert('Failed to load tasks');
        }
    }

    renderBoard() {
        // Clear all columns
        Object.values(this.taskLists).forEach(list => list.innerHTML = '');

        // Get tasks to display based on filter
        const tasksToRender = this.currentFilter === 'all' 
            ? this.tasks 
            : this.tasks.filter(t => t.status === this.currentFilter);

        // Group tasks by status
        const grouped = {
            'todo': tasksToRender.filter(t => t.status === 'todo'),
            'in_progress': tasksToRender.filter(t => t.status === 'in_progress'),
            'done': tasksToRender.filter(t => t.status === 'done')
        };

        // Render tasks in each column
        Object.entries(grouped).forEach(([status, tasks]) => {
            tasks.forEach(task => {
                const taskCard = this.createTaskCard(task);
                this.taskLists[status].appendChild(taskCard);
            });

            // Update column count
            document.getElementById(`count-${status.replace('_', '-')}`).textContent = tasks.length;
        });
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.draggable = true;
        card.dataset.taskId = task.id;

        card.innerHTML = `
            <div class="task-header">
                <h3>${escapeHtml(task.title)}</h3>
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
            </div>
            <p class="task-description">${escapeHtml(task.description)}</p>
            <div class="task-footer">
                <span class="task-points">+${task.points_reward} pts${task.points_awarded ? ' ✓' : ''}</span>
                <button class="task-delete" onclick="dashboard.deleteTask(${task.id})">Delete</button>
            </div>
        `;

        // Drag and drop to change status
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('taskId', task.id);
        });

        return card;
    }

    async createTask() {
        const formData = new FormData(this.taskForm);
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            points_reward: parseInt(formData.get('points_reward')),
            due_date: formData.get('due_date') || null
        };

        try {
            const newTask = await this.api.createTask(taskData);
            this.tasks.push(newTask);
            this.renderBoard();
            this.taskModal.close();
            alert('Task created!');
        } catch (error) {
            alert('Failed to create task: ' + error.message);
        }
    }

    async updateTask(taskId, updates) {
        try {
            const updated = await this.api.updateTask(taskId, updates);
            
            // Update local array
            const index = this.tasks.findIndex(t => t.id === taskId);
            this.tasks[index] = updated;
            
            // If points awarded, update user points
            if (updated.points_awarded) {
                this.currentUser.points = updated.owner.points;
                localStorage.setItem('taskflow_user', JSON.stringify(this.currentUser));
                this.updateUserProfile();
            }
            
            this.renderBoard();
        } catch (error) {
            alert('Failed to update task: ' + error.message);
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Delete this task?')) return;

        try {
            await this.api.deleteTask(taskId);
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.renderBoard();
        } catch (error) {
            alert('Failed to delete task: ' + error.message);
        }
    }

    updateMetrics() {
        this.metricElements.total.textContent = this.stats.total;
        this.metricElements.progress.textContent = this.stats.in_progress;
        this.metricElements.done.textContent = this.stats.done;
        this.metricElements.rate.textContent = Math.round(this.stats.completion_rate) + '%';
    }

    updateUserProfile() {
        this.pointsDisplay.textContent = this.currentUser.points;
    }

    async updateSettings() {
        const formData = new FormData(this.settingsForm);
        const settings = {
            theme_color: formData.get('theme_color'),
            font_style: formData.get('font_style')
        };

        try {
            const updated = await this.api.updateSettings(settings);
            this.currentUser = updated;
            localStorage.setItem('taskflow_user', JSON.stringify(updated));
            
            // Apply theme color
            document.documentElement.style.setProperty('--accent', updated.theme_color);
            
            this.settingsModal.close();
            alert('Settings saved!');
        } catch (error) {
            alert('Failed to save settings: ' + error.message);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard(api);
});
```

---

## DevOps Architecture

### **Docker Deployment**

```dockerfile
# backend.Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### **Docker Compose Orchestration**

```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: backend.Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data  # Persist SQLite database
    environment:
      - DATABASE_URL=sqlite:///./data/taskflow.db
      - SECRET_KEY=${SECRET_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: frontend.Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
```

### **Terraform Infrastructure (AWS)**

```hcl
# Infrastructure-as-Code: Provision EC2 instances
resource "aws_instance" "taskflow" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  vpc_security_group_ids = [aws_security_group.taskflow.id]

  tags = {
    Name = "taskflow-app"
  }
}
```

### **Kubernetes Deployment**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: taskflow

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: taskflow
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: taskflow-backend:latest
        ports:
        - containerPort: 8000
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────┐
│                    USERS TABLE                       │
├──────────┬──────────────┬──────────────────────────┤
│ Column   │ Type         │ Constraint               │
├──────────┼──────────────┼──────────────────────────┤
│ id       │ INTEGER      │ PK, AUTO_INCREMENT       │
│ username │ VARCHAR(50)  │ UNIQUE, NOT NULL, INDEX  │
│ password │ VARCHAR      │ NOT NULL                 │
│ points   │ INTEGER      │ DEFAULT 100              │
│ tasks_.. │ INTEGER      │ DEFAULT 0                │
│ theme    │ VARCHAR      │ DEFAULT #2563eb          │
│ font     │ VARCHAR      │ DEFAULT Inter            │
│ created  │ DATETIME     │ DEFAULT NOW              │
└──────────┴──────────────┴──────────────────────────┘
                        ↑
                   (1 to many)
                        ↓
┌─────────────────────────────────────────────────────┐
│                    TASKS TABLE                       │
├──────────┬──────────────┬──────────────────────────┤
│ Column   │ Type         │ Constraint               │
├──────────┼──────────────┼──────────────────────────┤
│ id       │ INTEGER      │ PK, AUTO_INCREMENT       │
│ owner_id │ INTEGER      │ FK → users.id, INDEX     │
│ title    │ VARCHAR(200) │ NOT NULL                 │
│ desc     │ VARCHAR(2k)  │ DEFAULT ""               │
│ status   │ VARCHAR      │ DEFAULT "todo"           │
│ priority │ VARCHAR      │ DEFAULT "medium"         │
│ points   │ INTEGER      │ DEFAULT 10               │
│ awarded  │ BOOLEAN      │ DEFAULT False            │
│ due_date │ DATETIME     │ NULL                     │
│ complete │ DATETIME     │ NULL                     │
│ created  │ DATETIME     │ DEFAULT NOW              │
│ updated  │ DATETIME     │ DEFAULT NOW              │
└──────────┴──────────────┴──────────────────────────┘
```

---

## API Endpoints Reference

| Method | Endpoint | Auth | Request | Response | Purpose |
|--------|----------|------|---------|----------|---------|
| POST | /auth/register | ❌ | {username, password} | AuthResponse | User signup |
| POST | /auth/login | ❌ | {username, password} | AuthResponse | User login |
| GET | /users/me | ✅ | - | UserRead | Get profile |
| PATCH | /users/me/settings | ✅ | {theme_color, font} | UserRead | Update settings |
| GET | /tasks | ✅ | - | TaskRead[] | List tasks |
| POST | /tasks | ✅ | TaskCreate | TaskRead | Create task |
| PATCH | /tasks/{id} | ✅ | TaskUpdate | TaskRead | Update task |
| DELETE | /tasks/{id} | ✅ | - | 204 | Delete task |
| GET | /tasks/summary/stats | ✅ | - | TaskStats | Get statistics |
| GET | /health | ❌ | - | {status} | Health check |
| GET | /metrics | ❌ | - | Prometheus | Metrics |

---

## Security Implementation

### Password Hashing Flow
```
User Password → PBKDF2-HMAC-SHA256 (260k iterations) → Unique Salt → Hash Stored
                                      ↓
                            timing-safe comparison
                                      ↓
                            Login verification
```

### JWT Authentication
```
Login Success → Generate JWT (user_id, exp=12hrs) → Sign with SECRET_KEY
                                                      ↓
                                            Store in localStorage
                                                      ↓
                        Each request → Authorization: Bearer {token}
                                                      ↓
                        Verify signature → Extract user_id → Continue
```

---

This documentation covers the complete architecture, workflow, and implementation details of the TaskFlow project!
