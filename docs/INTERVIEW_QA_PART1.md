# TaskFlow Project - 100+ Interview Questions & Answers

## Table of Contents
- [Architecture & Design (Q1-Q15)](#architecture--design)
- [Backend Development (Q16-Q40)](#backend-development)
- [Frontend Development (Q41-Q60)](#frontend-development)
- [Database & Data Management (Q61-Q75)](#database--data-management)
- [Security & Authentication (Q76-Q90)](#security--authentication)
- [DevOps & Deployment (Q91-Q110)](#devops--deployment)

---

## Architecture & Design

### Q1: What is the overall architecture of this project?

**Answer:**
TaskFlow follows a **3-tier architecture**:

1. **Presentation Layer (Frontend)**
   - HTML/CSS/Vanilla JavaScript
   - Runs in browser
   - Communicates via REST API

2. **Application Layer (Backend)**
   - FastAPI Python framework
   - REST API endpoints
   - Business logic & validation
   - JWT authentication

3. **Data Layer (Database)**
   - SQLite database
   - SQLAlchemy ORM
   - 2 tables: users, tasks

The architecture is stateless on the backend, allowing horizontal scaling. Each request contains all necessary authentication information (JWT token).

---

### Q2: Why was FastAPI chosen over Django or Flask?

**Answer:**
**FastAPI advantages:**
- **Async/await support**: Built on Starlette (async framework), unlike Flask
- **Automatic API documentation**: Swagger UI (/docs) automatically generated
- **Validation**: Pydantic schemas provide automatic request validation
- **Performance**: ~3x faster than Flask (benchmarks: ~15k req/s vs ~5k req/s)
- **Type hints**: Full type annotation support improves code maintainability
- **Dependency injection**: Clean way to manage database connections

**Why not Django?**
- Overkill for a simple REST API (too many features)
- Heavier memory footprint
- More configuration overhead

---

### Q3: Explain the frontend-to-backend communication flow.

**Answer:**
```
Browser (Frontend) 
  ↓ (HTTP Request with JWT in header)
  ├─ GET /tasks HTTP/1.1
  ├─ Authorization: Bearer eyJhbGc...
  ├─ Content-Type: application/json
  └─ [Optional body for POST/PATCH]
  
       ↓ (FastAPI receives request)
       
Dependency Injection (dependencies.py)
  ├─ Extract Bearer token from Authorization header
  ├─ Verify JWT signature
  ├─ Extract user_id from payload
  ├─ Query database for user
  └─ Inject user object into route handler
  
       ↓ (Route handler processes)
       
Route Handler (routers/tasks.py)
  ├─ Verify user owns the resource (authorization)
  ├─ Execute business logic
  ├─ Update database
  └─ Return response object
  
       ↓ (Response converted to JSON)
       
HTTP Response
  ├─ 200 OK / 201 Created / 400 Bad Request
  ├─ Content-Type: application/json
  └─ [JSON body]
  
       ↓ (Frontend receives response)
       
JavaScript Handler
  ├─ Parse JSON response
  ├─ Update local state (this.tasks array)
  ├─ Re-render UI
  └─ Show success/error notification
```

---

### Q4: How does the gamification system (points) work?

**Answer:**
```
1. USER REGISTRATION
   ├─ Starting points = 100
   ├─ tasks_completed = 0
   └─ Stored in users table

2. USER CREATES TASK
   ├─ Task has points_reward (default 10, range 1-100)
   ├─ Task has points_awarded = False initially
   └─ No points earned yet

3. USER MARKS TASK "DONE"
   ├─ Backend checks: if !task.points_awarded:
   ├─ Add points: user.points += task.points_reward
   ├─ Increment counter: user.tasks_completed += 1
   ├─ Mark task: task.points_awarded = True
   └─ Prevent double-awarding (if status changes back to "todo", points not refunded)

4. POINTS DISPLAY
   ├─ Updated in topbar.points-pill
   ├─ Fetched from user object
   └─ Refreshed on each task update or dashboard reload
```

**Why this design?**
- **One-time reward**: Prevents exploiting the system by repeatedly marking/unmarking tasks
- **User motivation**: Points create motivation to complete tasks
- **Database efficiency**: Boolean flag instead of complex calculations

---

### Q5: What design patterns are used in this project?

**Answer:**
1. **MVC Pattern**: Model-View-Controller separated into models, schemas, routers
2. **Dependency Injection**: FastAPI's Depends() for database sessions and user context
3. **Repository Pattern**: Database queries abstracted in models
4. **Service Layer**: Business logic (points calculation) in route handlers
5. **Data Transfer Objects (DTO)**: Pydantic schemas for validation
6. **Middleware Pattern**: CORS middleware for request preprocessing
7. **Observer Pattern**: Event listeners in frontend (click handlers)
8. **State Management**: Dashboard class manages task state

---

### Q6: How does the database relationship work between users and tasks?

**Answer:**
```
One-to-Many Relationship:
  1 User --- owns many Tasks
  
SQLAlchemy Configuration:

class User(Base):
    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")
    # cascade="all, delete-orphan" means:
    # - When user deleted → all their tasks auto-deleted
    # - When task removed from user.tasks → task deleted from DB

class Task(Base):
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="tasks")
    # ForeignKey: ensures task.owner_id must reference existing user
    # nullable=False: every task MUST have an owner

Database Level:
  users table
  ├─ id (PK)
  ├─ username
  └─ ...
  
  tasks table
  ├─ id (PK)
  ├─ owner_id (FK → users.id)
  └─ ...
  
Indexes:
  - tasks.owner_id indexed for fast filtering
  - users.username indexed for login queries
```

---

### Q7: Why is the project stateless on the backend?

**Answer:**
A stateless backend means each request contains all information needed to process it. Benefits:

1. **Horizontal Scaling**: Can run multiple backend instances behind a load balancer
   ```
   Load Balancer
   ├─ Instance 1 (processes request A)
   ├─ Instance 2 (processes request B) 
   └─ Instance 3 (processes request C)
   ```
   Each request succeeds because JWT token contains all auth info.

2. **No Session Affinity**: Requests don't need to go to same server
3. **Kubernetes Friendly**: Can auto-scale pods without session replication
4. **Deployment Simplicity**: No need for Redis/Memcached for session storage
5. **REST Compliant**: Statelessness is REST architecture principle

**Stateless in this project:**
- JWT token in each request contains user_id
- No server-side sessions stored
- Database is single source of truth

---

### Q8: Explain the task status workflow and why it was designed this way.

**Answer:**
```
Status Workflow:
  
  ┌─────────┐
  │  TODO   │ ← Task created here
  └────┬────┘
       │ User clicks "Start"
       ↓
  ┌─────────────────┐
  │ IN_PROGRESS     │ ← Task being worked on
  └────┬────────────┘
       │ User clicks "Complete"
       ↓
  ┌─────────┐
  │  DONE   │ ← Points awarded HERE
  └─────────┘
       ↑
       │ (One-way - cannot reverse)
       
Possible transitions:
  ✅ TODO → IN_PROGRESS (valid)
  ✅ IN_PROGRESS → DONE (valid)
  ✅ TODO → DONE (direct completion, valid)
  ✅ IN_PROGRESS → TODO (pause work, valid)
  ❌ DONE → IN_PROGRESS (invalid - prevent)
  ❌ DONE → TODO (invalid - prevent)
```

**Why this design?**
- **Clear progress**: Users can see task status at a glance
- **Business logic enforcement**: Points only awarded once
- **Analytics**: Can track time spent (created_at → completed_at)
- **Prevents cheating**: Once done, can't revert to claim points again
- **Kanban visualization**: Standard columns (todo, in progress, done)

---

### Q9: How does the filtering system work on the frontend?

**Answer:**
```javascript
// Status filter has 4 buttons
<button data-status="all">All</button>
<button data-status="todo">To do</button>
<button data-status="in_progress">In progress</button>
<button data-status="done">Done</button>

// Click handler
document.querySelectorAll('#status-filter button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        this.currentFilter = e.target.dataset.status;  // Update state
        this.renderBoard();  // Re-render with filter applied
    });
});

// Render logic
renderBoard() {
    const tasksToRender = this.currentFilter === 'all' 
        ? this.tasks  // All tasks
        : this.tasks.filter(t => t.status === this.currentFilter);  // Filtered
        
    // Group by status and render
    const grouped = {
        'todo': tasksToRender.filter(t => t.status === 'todo'),
        'in_progress': tasksToRender.filter(t => t.status === 'in_progress'),
        'done': tasksToRender.filter(t => t.status === 'done')
    };
}
```

**Performance Consideration:**
- Filtering done **client-side** (in-memory)
- Not fetching from server each time
- Fast switching between filters
- Trade-off: Doesn't work if 10k+ tasks (would need server-side pagination)

---

### Q10: Explain the modal dialog system for creating/editing tasks.

**Answer:**
```html
<!-- HTML5 dialog element -->
<dialog class="modal" id="task-modal">
    <form id="task-form" class="modal-panel">
        <!-- Form fields -->
    </form>
</dialog>

<!-- JavaScript -->
// Open modal
document.getElementById('new-task-button').addEventListener('click', () => {
    this.taskForm.reset();  // Clear previous values
    this.taskModal.showModal();  // Open dialog
});

// Handle submission
this.taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();  // Prevent page reload
    await this.createTask();  // Send API request
    this.taskModal.close();  // Close after success
});

// Close button
closeBtn.addEventListener('click', () => {
    this.taskModal.close();
});
```

**Why HTML `<dialog>` element?**
- Native browser support (no jQuery needed)
- Automatic focus management
- Backdrop dimming built-in
- Escape key closes automatically
- Semantic HTML (accessible to screen readers)

---

### Q11: What is the purpose of the config.js file?

**Answer:**
```javascript
// frontend/config.js
const CONFIG = {
    API_URL: 'http://localhost:8000',  // Backend URL
    // Can be overridden:
    // - Development: http://localhost:8000
    // - Staging: https://staging-api.taskflow.com
    // - Production: https://api.taskflow.com
};
```

**Benefits:**
1. **Environment flexibility**: Change API endpoint without modifying code
2. **DevOps integration**: CI/CD can inject different URLs per environment
3. **Single source of truth**: All components use CONFIG.API_URL

**In Docker deployment:**
```dockerfile
# During build, inject production URL
RUN echo "const CONFIG = { API_URL: 'https://api.taskflow.com' };" > /app/config.js
```

---

### Q12: Describe the localStorage usage in this application.

**Answer:**
```javascript
// localStorage keys used:

1. taskflow_token
   ├─ Value: JWT token string (e.g., "eyJhbGc...")
   ├─ Purpose: Authentication - sent with each API request
   ├─ Lifetime: Until logout or token expires
   └─ Cleared on: Logout, 401 response

2. taskflow_user
   ├─ Value: JSON string { id, username, points, tasks_completed, ... }
   ├─ Purpose: Display user info without API call
   ├─ Lifetime: Until logout or refresh
   └─ Updated on: Settings change, task completion

3. taskflow_api_url
   ├─ Value: Backend URL
   ├─ Purpose: Allow user to configure API endpoint
   └─ Cleared on: Browser clear cache

// Usage in JavaScript
const token = localStorage.getItem('taskflow_token');
if (token) {
    api.token = token;  // Restore from cache
    dashboard.show();
} else {
    window.location.href = '/auth.html';  // Redirect to login
}
```

**Security Consideration:**
- ⚠️ localStorage is accessible to JavaScript (XSS vulnerable)
- ✅ Mitigated by: HTML escaping in dashboard.js, CSP headers
- Better alternative: HTTPOnly cookies (but requires backend support)

---

### Q13: How does the real-time statistics update work?

**Answer:**
```javascript
// Option 1: Poll on time interval
setInterval(async () => {
    const stats = await this.api.getTaskStats();
    this.updateMetrics(stats);
}, 5000);  // Every 5 seconds

// Option 2: Update after each action
async updateTask(taskId, updates) {
    const updated = await this.api.updateTask(taskId, updates);
    // After successful update, refresh stats
    const stats = await this.api.getTaskStats();
    this.updateMetrics(stats);
}

// Option 3: WebSocket (not implemented, but possible)
socket.on('task:updated', (updatedTask) => {
    this.tasks[index] = updatedTask;
    this.updateMetrics();  // Instant update
});
```

**Current Implementation:**
- Stats fetched on **initial page load**
- Stats refetch on each **task creation/update/delete**
- No real-time polling

**Why this approach?**
- Sufficient for single-user app
- Reduces API calls
- Better than polling (no unnecessary requests)

---

### Q14: Explain the grid layout system for the Kanban board.

**Answer:**
```css
/* styles.css */
.board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);  /* 3 equal columns */
    gap: 24px;  /* Space between columns */
    min-height: 100%;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
    .board {
        grid-template-columns: repeat(2, 1fr);  /* 2 columns on tablet */
    }
}

@media (max-width: 640px) {
    .board {
        grid-template-columns: 1fr;  /* 1 column on mobile */
    }
}
```

**Why CSS Grid?**
- Native browser support (no flexbox limitations)
- Equal-width columns automatically
- Responsive with media queries
- No JavaScript needed for layout

---

### Q15: What is the purpose of the health check endpoint?

**Answer:**
```python
# Backend: app/main.py
@app.get("/health")
async def health():
    return {"status": "ok"}

# Usage:
# 1. Docker container health check
#    HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1

# 2. Kubernetes liveness probe
#    livenessProbe:
#      httpGet:
#        path: /health
#        port: 8000
#      initialDelaySeconds: 10
#      periodSeconds: 10

# 3. Load balancer health check
#    AWS ELB: GET /health → 200 = healthy, 5xx = unhealthy
```

**Why important?**
- **Container orchestration**: Kubernetes uses to determine pod health
- **Auto-restart**: If health check fails, restart pod
- **Load balancing**: Only route traffic to healthy instances
- **Monitoring**: Alert if service becomes unhealthy

---

## Backend Development

### Q16: How does FastAPI handle automatic documentation?

**Answer:**
```python
# FastAPI automatically generates OpenAPI (Swagger) docs from:

1. Route handlers with type hints
   @app.get("/tasks", response_model=list[TaskRead])
   async def list_tasks(current_user: User = Depends(get_current_user)):
       pass
   # → Generates:
   #   - Endpoint: /tasks
   #   - Method: GET
   #   - Auth required: ✓
   #   - Response type: List of TaskRead objects

2. Pydantic schemas
   class TaskRead(BaseModel):
       id: int
       title: str  # Non-optional
       description: Optional[str] = None  # Optional
   # → Generates:
   #   - Field validation rules
   #   - Example JSON schema
   #   - Required vs optional fields

3. HTTP status codes
   @app.post("/tasks", status_code=201)
   # → Documents 201 Created response

4. Documentation access
   GET /docs          → Swagger UI (interactive)
   GET /redoc         → ReDoc (alternative)
   GET /openapi.json  → OpenAPI schema (machine-readable)
```

**Business Value:**
- Frontend developers can understand API without reading code
- Auto-generated, always in sync with implementation
- Interactive API testing in browser

---

### Q17: Explain the Pydantic validation system.

**Answer:**
```python
from pydantic import BaseModel, Field, validator

class TaskCreate(BaseModel):
    # Basic validation with Field
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    priority: str = Field(default="medium")
    points_reward: int = Field(default=10, ge=1, le=100)
    # ge=1, le=100 → value >= 1 AND value <= 100
    
    due_date: Optional[datetime] = None
    
    # Custom validation logic
    @validator('priority')
    def priority_must_be_valid(cls, v):
        valid = ['low', 'medium', 'high']
        if v not in valid:
            raise ValueError(f'Priority must be one of {valid}')
        return v
    
    @validator('title')
    def title_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()

# Usage in route
@app.post("/tasks")
async def create_task(task_data: TaskCreate):
    # FastAPI automatically:
    # 1. Parses JSON body
    # 2. Validates against TaskCreate schema
    # 3. Returns 422 Unprocessable Entity if validation fails
    # 4. Calls route only if valid
    pass

# Example validation errors:
# Request: { "title": "", "priority": "urgent", "points_reward": 150 }
# Response:
{
    "detail": [
        {
            "loc": ["body", "title"],
            "msg": "Title cannot be empty",
            "type": "value_error"
        },
        {
            "loc": ["body", "priority"],
            "msg": "Priority must be one of ['low', 'medium', 'high']",
            "type": "value_error"
        },
        {
            "loc": ["body", "points_reward"],
            "msg": "ensure this value is less than or equal to 100",
            "type": "value_error.number.not_le"
        }
    ]
}
```

**Benefits:**
- Type safety
- Auto-generated error messages
- Prevents invalid data reaching database
- Reduces defensive coding

---

### Q18: How does dependency injection work in FastAPI?

**Answer:**
```python
# dependencies.py
from fastapi import Depends, HTTPException, Header
from app.models import User
from app.database import get_db
from app.core.security import SecurityManager

async def get_db():
    """Dependency: Provide database session to route handlers"""
    db = SessionLocal()
    try:
        yield db  # Route handler uses this db session
    finally:
        db.close()  # Cleanup after request

async def get_current_user(
    authorization: str = Header(None),  # Extract from Authorization header
    db: Session = Depends(get_db)  # Get DB from previous dependency
) -> User:
    """Dependency: Extract and verify JWT, return current user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")
    
    try:
        # Extract token from "Bearer {token}"
        scheme, token = authorization.split()
        if scheme != "Bearer":
            raise HTTPException(status_code=401, detail="Invalid scheme")
        
        # Verify JWT and extract user_id
        payload = SecurityManager.verify_jwt_token(token, settings.SECRET_KEY)
        user_id = int(payload['sub'])
        
        # Fetch user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user  # Return to route handler
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# routers/tasks.py
@app.get("/tasks")
async def list_tasks(
    current_user: User = Depends(get_current_user),  # Dependency
    db: Session = Depends(get_db)  # Dependency
):
    """
    FastAPI executes dependencies in order:
    1. get_db() → db session
    2. get_current_user(authorization_header, db) → user object
    3. Call route handler with db and current_user
    """
    tasks = db.query(Task).filter(Task.owner_id == current_user.id).all()
    return tasks
```

**Why Dependency Injection?**
- **Reusability**: `get_current_user()` used in 10+ routes
- **Testability**: Easy to mock dependencies in tests
- **Separation of concerns**: Auth logic separate from route logic
- **DRY principle**: Don't repeat token verification code

---

### Q19: Explain the startup event and database initialization.

**Answer:**
```python
# app/main.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/taskflow.db")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@app.on_event("startup")
async def startup():
    """
    Runs once when server starts (before first request)
    Creates all database tables if they don't exist
    """
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized")

# What happens:
# 1. FastAPI application starts
# 2. startup event triggered
# 3. Iterate through all models (User, Task)
# 4. For each model, generate CREATE TABLE statement from ORM
# 5. Execute CREATE TABLE IF NOT EXISTS (safe - doesn't error if exists)
# 6. Application ready to handle requests
```

**Why `if_exists` behavior?**
- Safe for production (run migration multiple times)
- No errors if tables already exist
- Allows container restarts without data loss

**For production, use migrations:**
```bash
# Alembic (migration tool)
alembic init migrations
alembic revision --autogenerate -m "Create users and tasks tables"
alembic upgrade head
```

---

### Q20: How is user ownership enforced for tasks?

**Answer:**
```python
# Pattern: Always filter by current_user.id

@app.get("/tasks")
async def list_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Only return tasks owned by current user
    ✅ Prevents user A from seeing user B's tasks
    """
    tasks = db.query(Task).filter(
        Task.owner_id == current_user.id  # Filter by owner
    ).all()
    return tasks

@app.patch("/tasks/{task_id}")
async def update_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update task only if owned by current user
    ✅ Prevents user A from modifying user B's tasks
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Authorization check (security-critical!)
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Safe to update
    task.status = "done"
    db.commit()
    return task

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Delete only own tasks
    ✅ Prevents user A from deleting user B's tasks
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    db.delete(task)
    db.commit()
```

**Common mistakes to avoid:**
```python
# ❌ WRONG: No ownership check
@app.patch("/tasks/{task_id}")
async def update_task(task_id: int, updates: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()  # No current_user!
    task.status = "done"  # Any user can modify any task!
    db.commit()

# ✅ CORRECT: Always verify ownership
@app.patch("/tasks/{task_id}")
async def update_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task.owner_id != current_user.id:  # Ownership check
        raise HTTPException(status_code=403, detail="Unauthorized")
    task.status = "done"
    db.commit()
```

---

### Q21: Explain error handling patterns in the backend.

**Answer:**
```python
from fastapi import HTTPException

# Pattern 1: Return 404 if resource not found
@app.get("/tasks/{task_id}")
async def get_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )
    return task

# Pattern 2: Return 400 for validation errors
@app.post("/tasks")
async def create_task(task_data: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Pydantic validates automatically
    # Invalid data returns 422 Unprocessable Entity
    
    # Business logic validation
    if task_data.points_reward > 100:
        raise HTTPException(
            status_code=400,
            detail="Points reward cannot exceed 100"
        )
    return task

# Pattern 3: Return 401 for authentication errors
@app.get("/users/me")
async def get_profile(current_user: User = Depends(get_current_user)):
    # If token missing or invalid, dependency raises 401
    return current_user

# Pattern 4: Return 403 for authorization errors
@app.delete("/tasks/{task_id}")
async def delete_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized - you can only delete your own tasks"
        )
    db.delete(task)
    db.commit()

# Pattern 5: Return 409 for business logic conflicts
@app.post("/auth/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(
            status_code=409,  # Conflict
            detail="Username already exists"
        )
    return create_user(db, user_data)

# Pattern 6: Return 500 for server errors (should not happen in prod)
# FastAPI automatically catches exceptions and returns 500

# Custom exception handler
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid request data"}
    )
```

**HTTP Status Code Reference:**
- **200 OK**: Request succeeded
- **201 Created**: Resource created
- **204 No Content**: Request succeeded, no body (DELETE operations)
- **400 Bad Request**: Client error in request
- **401 Unauthorized**: Authentication required/failed
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Request conflicts with current state
- **422 Unprocessable Entity**: Request body validation failed
- **500 Internal Server Error**: Server error

---

### Q22: How is the request-response cycle for task completion with points?

**Answer:**
```
USER ACTION: Drag task to "Done" column
                          ↓
FRONTEND (dashboard.js)
  ├─ Send PATCH /tasks/{id} {status: "done", completed_at: NOW}
  ├─ Headers: Authorization: Bearer {jwt_token}
  └─ Content-Type: application/json
                          ↓
BACKEND (routers/tasks.py)
  ├─ @app.patch("/tasks/{task_id}")
  ├─ Dependency Injection:
  │  ├─ Extract JWT from Authorization header
  │  ├─ Verify signature + expiration
  │  ├─ Query user from DB (get_current_user dependency)
  │  └─ Get DB session (get_db dependency)
  │
  ├─ Authorization Check:
  │  ├─ Query task by id
  │  ├─ Verify task.owner_id == current_user.id
  │  └─ If not owned → return 403 Forbidden
  │
  ├─ Update Task Status:
  │  ├─ Set task.status = "done"
  │  ├─ Set task.updated_at = NOW
  │  └─ Set task.completed_at = NOW
  │
  ├─ **GAMIFICATION LOGIC**:
  │  ├─ Check: if task.status == "done" and not task.points_awarded:
  │  │  ├─ current_user.points += task.points_reward
  │  │  ├─ current_user.tasks_completed += 1
  │  │  ├─ task.points_awarded = True ← Prevents double-awarding
  │  │  └─ Commit to database
  │  └─ Return TaskRead object (includes owner.points - updated value)
                          ↓
RESPONSE (JSON)
{
    "id": 1,
    "title": "Implement auth",
    "status": "done",
    "completed_at": "2026-05-10T14:30:00",
    "points_awarded": true,
    "owner": {
        "id": 1,
        "username": "john",
        "points": 150,  ← Updated!
        "tasks_completed": 5  ← Updated!
    }
}
                          ↓
FRONTEND (dashboard.js)
  ├─ Parse JSON response
  ├─ Update local tasks array
  ├─ Extract updated.owner.points = 150
  ├─ Update this.currentUser.points = 150
  ├─ Re-render metrics tiles
  ├─ Move task card to "Done" column
  ├─ Update column counts
  └─ Show success notification: "Task completed! +50 points 🎉"
                          ↓
USER SEES
  ├─ Points pill updated (100 → 150)
  ├─ Task moved to "Done" column
  ├─ Completion rate updated (3/5 = 60%)
  └─ Success toast notification
```

**Key Points:**
1. **One-time reward**: `points_awarded` flag prevents exploits
2. **Atomic operation**: Points and task status updated in single transaction
3. **Response includes updated data**: Frontend doesn't need separate API call
4. **Ownership verified**: Only user's own tasks can be updated

---

### Q23: What testing strategies are used in the backend?

**Answer:**
```python
# tests/conftest.py - Test fixtures (shared setup)
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, User
from app.database import get_db

# Use in-memory SQLite for tests (fast, isolated)
@pytest.fixture
def db():
    """Create fresh database for each test"""
    engine = create_engine("sqlite:///:memory:")  # :memory: = temp DB
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session  # Provide to test
    
    session.close()

@pytest.fixture
def test_user(db):
    """Create a test user"""
    user = User(
        username="testuser",
        password_hash=hash_password("testpass123"),
        points=100
    )
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def auth_headers(test_user):
    """Return Authorization header with test user's token"""
    token = create_jwt_token(test_user.id, settings.SECRET_KEY)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def client(db):
    """FastAPI test client"""
    from fastapi.testclient import TestClient
    from app.main import app
    
    # Override get_db dependency
    def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

# tests/test_auth.py
def test_register_success(client, db):
    """Test successful user registration"""
    response = client.post("/auth/register", json={
        "username": "newuser",
        "password": "securepass123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["user"]["username"] == "newuser"
    assert data["user"]["points"] == 100  # Starting points

def test_register_duplicate_username(client, test_user):
    """Test registration with existing username"""
    response = client.post("/auth/register", json={
        "username": "testuser",  # Already exists
        "password": "securepass123"
    })
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post("/auth/login", json={
        "username": "testuser",
        "password": "testpass123"
    })
    
    assert response.status_code == 200
    assert response.json()["access_token"]

def test_login_invalid_password(client, test_user):
    """Test login with wrong password"""
    response = client.post("/auth/login", json={
        "username": "testuser",
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

# tests/test_tasks.py
def test_create_task_requires_auth(client):
    """Test that task creation requires authentication"""
    response = client.post("/tasks", json={
        "title": "Test task",
        "points_reward": 10
    })
    
    assert response.status_code == 401  # Unauthorized

def test_create_task_success(client, test_user, auth_headers):
    """Test successful task creation"""
    response = client.post("/tasks",
        json={
            "title": "Implement feature",
            "description": "Build auth module",
            "priority": "high",
            "points_reward": 50
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Implement feature"
    assert data["status"] == "todo"  # Default status
    assert data["owner_id"] == test_user.id

def test_complete_task_awards_points(client, test_user, auth_headers, db):
    """Test that completing task awards points"""
    # Create task
    task_response = client.post("/tasks",
        json={
            "title": "Test task",
            "points_reward": 25
        },
        headers=auth_headers
    )
    task_id = task_response.json()["id"]
    
    # Get initial points
    initial_points = test_user.points
    
    # Mark as done
    response = client.patch(f"/tasks/{task_id}",
        json={"status": "done"},
        headers=auth_headers
    )
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert data["points_awarded"] == True
    assert data["owner"]["points"] == initial_points + 25  # Points awarded
    
    # Verify database
    db.refresh(test_user)
    assert test_user.points == initial_points + 25
    assert test_user.tasks_completed == 1

def test_points_awarded_only_once(client, test_user, auth_headers, db):
    """Test that points awarded only once (prevent exploits)"""
    # Create task and mark done
    task_response = client.post("/tasks",
        json={
            "title": "Test task",
            "points_reward": 25
        },
        headers=auth_headers
    )
    task_id = task_response.json()["id"]
    
    client.patch(f"/tasks/{task_id}",
        json={"status": "done"},
        headers=auth_headers
    )
    
    db.refresh(test_user)
    points_after_first = test_user.points
    
    # Try to change status back and forth
    client.patch(f"/tasks/{task_id}",
        json={"status": "todo"},
        headers=auth_headers
    )
    client.patch(f"/tasks/{task_id}",
        json={"status": "done"},
        headers=auth_headers
    )
    
    # Points should not increase again
    db.refresh(test_user)
    assert test_user.points == points_after_first  # Same as before

def test_cannot_access_other_users_tasks(client, auth_headers, db):
    """Test authorization: User A cannot see User B's tasks"""
    # Create user B and their task
    user_b = User(username="userb", password_hash="hash")
    db.add(user_b)
    db.commit()
    
    task = Task(owner_id=user_b.id, title="User B's task")
    db.add(task)
    db.commit()
    
    # Try to access with User A's token
    response = client.get(f"/tasks/{task.id}", headers=auth_headers)
    
    # Should return 403 Unauthorized (or 404 if hidden)
    assert response.status_code in [403, 404]
```

**Testing Best Practices:**
1. **Arrange-Act-Assert pattern**: Setup, execute, verify
2. **One assertion per test**: Tests easier to debug
3. **Descriptive names**: `test_complete_task_awards_points` vs `test_task_1`
4. **Fixtures for reusability**: `test_user`, `auth_headers`
5. **Test edge cases**: Duplicate, unauthorized, invalid input
6. **Use in-memory DB**: Fast, isolated per test

---

### Q24: How is CORS middleware configured?

**Answer:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    # Which origins can make cross-origin requests
    allow_origins=[
        "http://localhost:3000",      # Frontend (dev)
        "http://127.0.0.1:3000",      # Same (alternative)
        "http://localhost:8080",      # Alternative port
        # "https://taskflow.com",      # Production (uncomment)
    ],
    
    # Allow credentials (cookies, auth headers)
    allow_credentials=True,
    
    # Allowed HTTP methods
    allow_methods=["*"],  # All methods (GET, POST, PATCH, DELETE)
    
    # Allowed request headers
    allow_headers=["*"],  # All headers (Authorization, Content-Type, etc)
)
```

**What is CORS?**
```
Browser Security Model:
  When JavaScript in page A tries to fetch from server B,
  browser blocks request (same-origin policy)
  
  Request:
    GET http://localhost:8000/tasks
    From: http://localhost:3000
    Headers: Authorization: Bearer ...
  
  Browser checks:
    ├─ Origin (localhost:3000) in allow_origins? ✓
    ├─ Method (GET) in allow_methods? ✓
    ├─ Headers (Authorization) in allow_headers? ✓
    └─ Allow response to cross origin? YES
  
  Response:
    Access-Control-Allow-Origin: http://localhost:3000
    → Browser allows JavaScript to access response
```

**Without CORS:**
```
XMLHttpRequest cannot load http://localhost:8000/tasks
from origin http://localhost:3000.
No 'Access-Control-Allow-Origin' header is present.
```

---

### Q25: Explain environment variables and configuration management.

**Answer:**
```python
# app/core/config.py
import os
from typing import Optional

class Settings:
    """Application configuration from environment variables"""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./data/taskflow.db"  # Default for development
    )
    
    # Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "local-development-secret-change-me"  # NEVER use in production!
    )
    
    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "720"  # 12 hours
    ))
    
    # CORS
    CORS_ORIGINS: list = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
    ]
    
    # Debug mode
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

settings = Settings()

# Usage
app = FastAPI(debug=settings.DEBUG)
```

**Environment Files:**
```bash
# devops/environments/local.env
DATABASE_URL=sqlite:///./data/taskflow.db
SECRET_KEY=local-development-secret-change-me
ACCESS_TOKEN_EXPIRE_MINUTES=720
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Usage in development
source devops/environments/local.env
python -m uvicorn app.main:app --reload

# Usage in Docker
docker run -e DATABASE_URL="postgresql://..." \
           -e SECRET_KEY="production-secret-key" \
           taskflow-backend:latest

# Usage in Kubernetes
kubectl create secret generic taskflow-secrets \
  --from-literal=SECRET_KEY="production-key" \
  --from-literal=DATABASE_URL="postgresql://..."
```

**Why not hardcode?**
- Different values per environment (dev, staging, production)
- Never expose secrets in version control
- Easy to change without code modification
- Deployment platform (Docker, Kubernetes) injects values at runtime

---

## Frontend Development

### Q26: How does the authentication flow work on the frontend?

**Answer:**
```javascript
// src/auth.js
class AuthHandler {
    constructor(api) {
        this.api = api;
        this.mode = 'login';  // or 'register'
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mode switching
        document.querySelectorAll('#auth-mode button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.mode = e.target.dataset.mode;  // 'login' or 'register'
                this.updateUI();
            });
        });
        
        // Form submission
        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }
    
    async handleSubmit() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Validate
        if (!username || !password) {
            this.showMessage('Please fill all fields', 'error');
            return;
        }
        
        if (password.length < 8) {
            this.showMessage('Password must be 8+ characters', 'error');
            return;
        }
        
        try {
            // Call API (api.js handles token storage)
            if (this.mode === 'login') {
                await this.api.login(username, password);
            } else {
                await this.api.register(username, password);
            }
            
            // Success: Redirect to dashboard
            window.location.href = '/index.html';
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }
    
    showMessage(message, type) {
        const messageEl = document.getElementById('auth-message');
        messageEl.textContent = message;
        messageEl.className = `form-message ${type}`;
    }
    
    updateUI() {
        // Update button labels, title, etc
        document.getElementById('auth-submit').textContent = 
            this.mode === 'login' ? 'Login' : 'Register';
    }
}

// On page load
document.addEventListener('DOMContentLoaded', () => {
    const authHandler = new AuthHandler(api);
});
```

**Token Storage & Retrieval:**
```javascript
// src/api.js
class TaskFlowAPI {
    async login(username, password) {
        const response = await fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) throw new Error('Login failed');
        
        const data = await response.json();
        
        // Store token in localStorage
        this.token = data.access_token;
        localStorage.setItem('taskflow_token', data.access_token);
        localStorage.setItem('taskflow_user', JSON.stringify(data.user));
        
        return data;
    }
    
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Add token to Authorization header
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            // Token expired/invalid
            localStorage.removeItem('taskflow_token');
            localStorage.removeItem('taskflow_user');
            window.location.href = '/auth.html';
        }
        
        return await response.json();
    }
}
```

---

### Q27: How is local state managed in the dashboard?

**Answer:**
```javascript
// src/dashboard.js
class Dashboard {
    constructor(api) {
        this.api = api;
        
        // Local state (in-memory)
        this.tasks = [];              // All tasks
        this.stats = {};              // Aggregated statistics
        this.currentUser = null;      // Current user info
        this.currentFilter = 'all';   // Active filter
        
        this.initializeElements();
        this.loadData();
    }
    
    async loadData() {
        try {
            // Fetch from server
            const [tasks, stats] = await Promise.all([
                this.api.getTasks(),
                this.api.getTaskStats()
            ]);
            
            // Store in local state
            this.tasks = tasks;
            this.stats = stats;
            this.currentUser = JSON.parse(localStorage.getItem('taskflow_user'));
            
            // Render UI
            this.renderBoard();
            this.updateMetrics();
        } catch (error) {
            console.error('Failed to load:', error);
        }
    }
    
    async createTask(taskData) {
        try {
            // Send to server
            const newTask = await this.api.createTask(taskData);
            
            // Update local state (don't wait for another fetch)
            this.tasks.push(newTask);
            this.stats.total += 1;
            this.stats.todo += 1;
            
            // Re-render
            this.renderBoard();
            this.updateMetrics();
        } catch (error) {
            console.error('Failed to create:', error);
        }
    }
    
    async updateTask(taskId, updates) {
        try {
            const updatedTask = await this.api.updateTask(taskId, updates);
            
            // Update local state
            const index = this.tasks.findIndex(t => t.id === taskId);
            this.tasks[index] = updatedTask;
            
            // Update stats if status changed
            if (updates.status) {
                this.recalculateStats();
            }
            
            // Re-render
            this.renderBoard();
        } catch (error) {
            console.error('Failed to update:', error);
        }
    }
    
    renderBoard() {
        // Clear existing
        Object.values(this.taskLists).forEach(list => list.innerHTML = '');
        
        // Filter tasks
        const tasksToRender = this.currentFilter === 'all'
            ? this.tasks
            : this.tasks.filter(t => t.status === this.currentFilter);
        
        // Group and render
        const grouped = this.groupBy(tasksToRender, 'status');
        Object.entries(grouped).forEach(([status, tasks]) => {
            tasks.forEach(task => {
                const card = this.createTaskCard(task);
                this.taskLists[status].appendChild(card);
            });
        });
    }
    
    updateMetrics() {
        // Update metric tiles from this.stats
        document.getElementById('metric-total').textContent = this.stats.total;
        document.getElementById('metric-progress').textContent = this.stats.in_progress;
        document.getElementById('metric-done').textContent = this.stats.done;
        document.getElementById('metric-rate').textContent = 
            Math.round(this.stats.completion_rate) + '%';
    }
}
```

**Why local state?**
- **Responsiveness**: UI updates immediately after action
- **Reduced API calls**: Don't fetch entire list after each change
- **Offline capability**: Can still view tasks if connection drops
- **Trade-off**: Must keep in sync with server

**State synchronization pattern:**
```javascript
// Optimistic update (update UI immediately)
async updateTask(taskId, updates) {
    // 1. Optimistic: Update local state immediately
    const index = this.tasks.findIndex(t => t.id === taskId);
    this.tasks[index] = { ...this.tasks[index], ...updates };
    this.renderBoard();
    
    // 2. Send to server
    try {
        const response = await this.api.updateTask(taskId, updates);
        
        // 3. Confirm: Update with server response
        this.tasks[index] = response;
        this.renderBoard();
    } catch (error) {
        // 4. Revert: If failed, revert to previous state
        this.loadData();  // Fetch fresh data from server
        showError('Failed to update task');
    }
}
```

---

### Q28: How is XSS (Cross-Site Scripting) prevented?

**Answer:**
```javascript
// src/utils.js
function escapeHtml(text) {
    /**
     * Prevent XSS by escaping HTML special characters
     * 
     * If task title contains: <img src=x onerror="alert('hacked')">
     * Without escaping: Would execute JavaScript
     * With escaping: Renders as literal text
     */
    const div = document.createElement('div');
    div.textContent = text;  // textContent uses text, not HTML
    return div.innerHTML;
}

// Before rendering
const taskTitle = "<img src=x onerror='alert(\"XSS\")'>"; // Malicious input
const escaped = escapeHtml(taskTitle);

// Without escaping:
element.innerHTML = taskTitle;
// Result: <img src=x onerror='alert("XSS")'> 
// → JavaScript executes! ❌

// With escaping:
element.innerHTML = `<h3>${escaped}</h3>`;
// Result: <h3>&lt;img src=x onerror='alert("XSS")'&gt;</h3>
// → Displays as text, no execution ✓

// In dashboard.js
createTaskCard(task) {
    const card = document.createElement('div');
    card.innerHTML = `
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.description)}</p>
    `;
    return card;
}
```

**Alternative: Content Security Policy (CSP)**
```html
<!-- In HTML head -->
<meta http-equiv="Content-Security-Policy" 
      content="script-src 'self'; object-src 'none'">

<!-- Prevents inline scripts and external script injection -->
```

**Defense layers:**
1. **Input validation**: Backend validates all input
2. **Output encoding**: Frontend escapes HTML
3. **CSP headers**: Browser enforces content policy
4. **HTTPOnly cookies**: JavaScript can't access cookies

---

### Q29: Explain the drag-and-drop implementation for kanban board.

**Answer:**
```html
<!-- HTML -->
<div class="task-list" id="todo-list" data-status="todo"></div>
<div class="task-list" id="in-progress-list" data-status="in_progress"></div>
<div class="task-list" id="done-list" data-status="done"></div>

<div class="task-card" draggable="true" data-task-id="1">
    <h3>Task Title</h3>
</div>
```

```javascript
// JavaScript - Drag and Drop API
class Dashboard {
    setupDragDrop() {
        // Make columns drop targets
        document.querySelectorAll('.task-list').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();  // Allow drop
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');  // Visual feedback
            });
            
            column.addEventListener('dragleave', (e) => {
                column.classList.remove('drag-over');
            });
            
            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                
                // Get dragged task ID
                const taskId = e.dataTransfer.getData('taskId');
                
                // Get target status from column's data attribute
                const newStatus = column.dataset.status;
                
                // Update task on server
                await this.updateTask(taskId, { status: newStatus });
                
                column.classList.remove('drag-over');
            });
        });
        
        // Make task cards draggable
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-card')) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('taskId', e.target.dataset.taskId);
                e.target.classList.add('dragging');  // Visual feedback
            }
        });
        
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('task-card')) {
                e.target.classList.remove('dragging');
            }
        });
    }
    
    async updateTask(taskId, updates) {
        // Send to backend
        const response = await this.api.updateTask(taskId, updates);
        
        // Update local state
        const index = this.tasks.findIndex(t => t.id === taskId);
        this.tasks[index] = response;
        
        // Re-render
        this.renderBoard();
    }
}
```

**Drag and Drop Events:**
```
1. dragstart    → User starts dragging element
2. drag         → Element is being dragged
3. dragover     → Dragged element is over drop target
4. dragleave    → Dragged element leaves drop target
5. drop         → Element dropped on target
6. dragend      → Drag operation ended
```

---

### Q30: How are date inputs handled and formatted?

**Answer:**
```html
<!-- HTML -->
<input type="datetime-local" name="due_date">
<!-- value format: "2026-05-15T14:30" -->
```

```javascript
// src/utils.js
function formatDate(dateString) {
    /**
     * Convert ISO date to readable format
     * "2026-05-15T14:30:00" → "May 15, 2026 at 2:30 PM"
     */
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Usage
const task = {
    due_date: "2026-05-15T14:30:00",
    completed_at: "2026-05-10T09:00:00"
};

console.log(formatDate(task.due_date));
// Output: "May 15, 2026 at 2:30 PM"
```

**API Communication:**
```javascript
// When sending to backend (POST/PATCH)
const taskData = {
    title: "Implement API",
    due_date: "2026-05-15T14:30:00"  // ISO format
};

await api.createTask(taskData);
// Backend receives: ISO format (stored in DB)

// When receiving from backend (GET)
const task = {
    due_date: "2026-05-15T14:30:00"  // ISO format from DB
};

// Frontend converts to readable
const readableDate = formatDate(task.due_date);
// "May 15, 2026 at 2:30 PM"
```

---

### Q31: Explain error handling on the frontend.

**Answer:**
```javascript
// src/api.js
class TaskFlowAPI {
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(url, {
                headers,
                ...options
            });
            
            // Handle HTTP errors
            if (response.status === 401) {
                // Unauthorized - token expired/invalid
                localStorage.removeItem('taskflow_token');
                window.location.href = '/auth.html';
                return;
            }
            
            if (response.status === 403) {
                // Forbidden - insufficient permissions
                throw new Error('You do not have permission to perform this action');
            }
            
            if (response.status === 404) {
                // Not found
                throw new Error('Resource not found');
            }
            
            if (response.status >= 400) {
                // Other client/server errors
                const error = await response.json();
                throw new Error(error.detail || 'Request failed');
            }
            
            // Success
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

// src/dashboard.js
class Dashboard {
    async createTask(taskData) {
        try {
            const newTask = await this.api.createTask(taskData);
            this.tasks.push(newTask);
            this.renderBoard();
            
            // Success notification
            this.showNotification('Task created successfully! 🎉', 'success');
        } catch (error) {
            // Error notification
            this.showNotification(`Failed to create task: ${error.message}`, 'error');
            console.error(error);
        }
    }
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}
```

---

### Q32: How is the form validation handled?

**Answer:**
```javascript
// Client-side validation (immediate feedback)
class AuthHandler {
    validateForm() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Validation rules
        const errors = [];
        
        if (!username) {
            errors.push('Username is required');
        } else if (username.length < 3) {
            errors.push('Username must be at least 3 characters');
        } else if (username.length > 50) {
            errors.push('Username must not exceed 50 characters');
        }
        
        if (!password) {
            errors.push('Password is required');
        } else if (password.length < 8) {
            errors.push('Password must be at least 8 characters');
        } else if (password.length > 128) {
            errors.push('Password must not exceed 128 characters');
        }
        
        return errors;
    }
    
    async handleSubmit() {
        const errors = this.validateForm();
        
        if (errors.length > 0) {
            // Show errors
            this.showMessage(errors.join('; '), 'error');
            return;
        }
        
        // Try to submit
        try {
            await this.api.login(...);
        } catch (error) {
            // Server-side error
            this.showMessage(error.message, 'error');
        }
    }
}
```

**HTML5 Input Validation:**
```html
<input 
    type="text"
    name="username"
    minlength="3"
    maxlength="50"
    required
>

<input 
    type="email"
    name="email"
    required
>

<input 
    type="number"
    name="points"
    min="1"
    max="100"
    required
>
```

**Validation Flow:**
```
User input → HTML5 validation → Client-side JS → Submit → Backend validation → DB save
                ↓                        ↓                        ↓
        (type, min, max)      (complex rules)      (Pydantic schemas)
                ↓                        ↓                        ↓
        Red outline           Error message          422 response
```

---

### Q33: How does the "New Task" modal work?

**Answer:**
```html
<!-- Modal HTML -->
<dialog class="modal" id="task-modal">
    <form id="task-form" class="modal-panel">
        <div class="modal-header">
            <h2 id="task-modal-title">New task</h2>
            <button type="button" class="close-button">×</button>
        </div>

        <fieldset>
            <label>
                Title
                <input type="text" name="title" required minlength="1" maxlength="200">
            </label>
            <label>
                Description
                <textarea name="description" maxlength="2000"></textarea>
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
```

```javascript
// Modal control logic
class Dashboard {
    setupModal() {
        // Open modal
        document.getElementById('new-task-button').addEventListener('click', () => {
            this.taskForm.reset();  // Clear previous values
            this.taskModal.showModal();
        });
        
        // Submit form
        this.taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
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
                
                this.showNotification('Task created!', 'success');
            } catch (error) {
                this.showNotification(`Error: ${error.message}`, 'error');
            }
        });
        
        // Close button
        document.querySelector('#task-modal .close-button').addEventListener('click', () => {
            this.taskModal.close();
        });
        
        // Close on Escape key (automatic with <dialog>)
        // Close on backdrop click
        this.taskModal.addEventListener('click', (e) => {
            if (e.target === this.taskModal) {
                this.taskModal.close();  // Click outside dialog
            }
        });
    }
}
```

---

### Q34: How is user settings/preferences updated?

**Answer:**
```html
<!-- Settings Modal -->
<dialog class="modal" id="settings-modal">
    <form id="settings-form" class="modal-panel">
        <div class="modal-header">
            <h2>Settings</h2>
            <button type="button" class="close-button">×</button>
        </div>

        <fieldset>
            <label>
                Theme Color
                <input type="color" name="theme_color" id="color-picker">
            </label>
            <label>
                Font Style
                <select name="font_style">
                    <option value="Inter">Inter (Default)</option>
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
```

```javascript
// Settings handler
class Dashboard {
    async loadUserSettings() {
        // Populate form with current settings
        const user = this.currentUser;
        document.getElementById('color-picker').value = user.theme_color;
        document.querySelector('[name="font_style"]').value = user.font_style;
    }
    
    setupSettingsModal() {
        // Open settings
        document.getElementById('settings-button').addEventListener('click', () => {
            this.loadUserSettings();
            this.settingsModal.showModal();
        });
        
        // Submit settings
        this.settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(this.settingsForm);
            const settings = {
                theme_color: formData.get('theme_color'),
                font_style: formData.get('font_style')
            };
            
            try {
                // Send to backend
                const updatedUser = await this.api.updateSettings(settings);
                
                // Update local state
                this.currentUser = updatedUser;
                localStorage.setItem('taskflow_user', JSON.stringify(updatedUser));
                
                // Apply theme to UI
                this.applyTheme(updatedUser.theme_color, updatedUser.font_style);
                
                this.settingsModal.close();
                this.showNotification('Settings saved!', 'success');
            } catch (error) {
                this.showNotification(`Error: ${error.message}`, 'error');
            }
        });
    }
    
    applyTheme(color, font) {
        // Update CSS variables dynamically
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--font-family', font);
        
        // All elements using these CSS variables update automatically
        // --accent used for: buttons, badges, accents
        // --font-family used for: body text
    }
}
```

---

### Q35: Explain the metric calculation and display.

**Answer:**
```javascript
// Fetching stats from backend
async loadData() {
    const stats = await this.api.getTaskStats();
    this.stats = stats;
    // {
    //   total: 15,
    //   todo: 4,
    //   in_progress: 3,
    //   done: 8,
    //   completion_rate: 53.33
    // }
}

// Displaying metrics
updateMetrics() {
    document.getElementById('metric-total').textContent = this.stats.total;
    document.getElementById('metric-progress').textContent = this.stats.in_progress;
    document.getElementById('metric-done').textContent = this.stats.done;
    document.getElementById('metric-rate').textContent = 
        Math.round(this.stats.completion_rate) + '%';
}

// Updates after each action
async updateTask(taskId, updates) {
    const response = await this.api.updateTask(taskId, updates);
    
    // Recalculate stats
    const stats = await this.api.getTaskStats();
    this.stats = stats;
    this.updateMetrics();
}
```

**Backend calculation:**
```python
@app.get("/tasks/summary/stats")
async def get_task_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.owner_id == current_user.id).all()
    
    total = len(tasks)
    todo = sum(1 for t in tasks if t.status == 'todo')
    in_progress = sum(1 for t in tasks if t.status == 'in_progress')
    done = sum(1 for t in tasks if t.status == 'done')
    
    # Completion rate: (done / total) * 100
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

## Database & Data Management

### Q36: Why SQLite for this project?

**Answer:**
```
SQLite Characteristics:
├─ File-based (no server needed)
├─ Single file: taskflow.db
├─ Perfect for: Development, small projects, mobile apps
├─ Limitations: Single writer, not suitable for high concurrency

Comparison:
┌─────────────┬────────────────┬──────────────┬─────────────┐
│             │ SQLite         │ PostgreSQL   │ MySQL       │
├─────────────┼────────────────┼──────────────┼─────────────┤
│ Setup       │ None           │ Server       │ Server      │
│ Scalability │ Small projects │ Enterprise   │ Enterprise  │
│ Concurrency │ Limited        │ High         │ High        │
│ Cost        │ Free           │ Free         │ Free        │
│ Dev Speed   │ Fastest        │ Slower       │ Slower      │
└─────────────┴────────────────┴──────────────┴─────────────┘

For this project:
✅ SQLite is perfect - single user/testing
For production (10k+ users):
❌ Switch to PostgreSQL
```

---

### Q37: Explain indexes and their purpose.

**Answer:**
```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True)
    # Indexes:
    # - Primary key (id) → auto-indexed
    # - Unique constraint (username) → auto-indexed
    # - Explicit index=True → user-requested index

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True)
    # Why index on owner_id?
    # Query: SELECT * FROM tasks WHERE owner_id = 5
    # Without index: Linear scan O(n)
    # With index: Binary search O(log n)
    status = Column(String, index=False)
    # Why no index on status?
    # - Only 3 values (todo, in_progress, done)
    # - High cardinality issues
    # - Queries filter by owner_id mostly
```

**Index Performance Example:**
```
Database: 1 million tasks

Query: SELECT * FROM tasks WHERE owner_id = 5
User has 50 tasks

Without index:
├─ Scan all 1M rows
├─ Check owner_id == 5 for each
├─ Found 50 matching rows
└─ Time: ~500ms (slow)

With index on owner_id:
├─ B-tree lookup: owner_id = 5
├─ Found reference to 50 rows
├─ Fetch 50 rows
└─ Time: ~1ms (50x faster!)
```

---

### Q38: How are database relationships handled?

**Answer:**
```python
# One-to-Many: User has many Tasks

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String)
    
    # Relationship (ORM-level, not in DB)
    tasks = relationship(
        "Task",
        back_populates="owner",
        cascade="all, delete-orphan"
    )

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String)
    
    # Relationship (ORM-level)
    owner = relationship("User", back_populates="tasks")

# Usage:
user = db.query(User).filter(User.id == 1).first()
user.tasks  # All tasks for this user [Task, Task, Task, ...]

task = db.query(Task).filter(Task.id == 5).first()
task.owner  # The user object that owns this task

# Delete cascade
user.delete()
# All user.tasks automatically deleted (cascade="all, delete-orphan")
```

**Cascade Delete Example:**
```python
# Without cascade:
user.delete()
# ❌ Error: Foreign key constraint violation (tasks still reference user)

# With cascade="all, delete-orphan":
user.delete()
# ✅ All user's tasks deleted automatically
```

---

### Q39: How is the database queried for filtering/sorting?

**Answer:**
```python
# Basic queries
from sqlalchemy import desc

db = Session()

# Get all tasks
all_tasks = db.query(Task).all()

# Filter by status
todo_tasks = db.query(Task).filter(Task.status == 'todo').all()

# Filter by multiple conditions (AND)
user_done_tasks = db.query(Task).filter(
    Task.owner_id == 1,
    Task.status == 'done'
).all()

# OR conditions
from sqlalchemy import or_
high_priority_or_done = db.query(Task).filter(
    or_(
        Task.priority == 'high',
        Task.status == 'done'
    )
).all()

# Sort
sorted_asc = db.query(Task).order_by(Task.created_at).all()
sorted_desc = db.query(Task).order_by(desc(Task.created_at)).all()

# Pagination
page = 1
page_size = 10
tasks = db.query(Task).offset((page - 1) * page_size).limit(page_size).all()

# Count
total = db.query(Task).filter(Task.owner_id == 1).count()

# Aggregation
from sqlalchemy import func
total_points = db.query(func.sum(Task.points_reward)).filter(
    Task.owner_id == 1,
    Task.status == 'done'
).scalar()
```

**Query statistics aggregation:**
```python
# In routers/tasks.py
@app.get("/tasks/summary/stats")
async def get_task_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # All user's tasks
    tasks = db.query(Task).filter(Task.owner_id == current_user.id).all()
    
    # Count by status
    total = len(tasks)
    todo = sum(1 for t in tasks if t.status == 'todo')
    in_progress = sum(1 for t in tasks if t.status == 'in_progress')
    done = sum(1 for t in tasks if t.status == 'done')
    
    # Or using SQL aggregation (more efficient for large datasets)
    from sqlalchemy import func
    stats = db.query(
        func.count(Task.id).label('total'),
        func.sum((Task.status == 'done').cast(Integer)).label('done'),
        func.sum((Task.status == 'in_progress').cast(Integer)).label('in_progress'),
        func.sum((Task.status == 'todo').cast(Integer)).label('todo')
    ).filter(Task.owner_id == current_user.id).first()
```

---

### Q40: How is database migration/schema changes handled?

**Answer:**
```python
# Current approach (simple, but not ideal for production)
# app/main.py
@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    # Creates tables if they don't exist
    # Safe for development

# Limitations:
# ❌ Can't rename columns
# ❌ Can't add constraints to existing columns
# ❌ Can't safely modify data during migrations
# ❌ No version tracking

# Better approach for production: Alembic
"""
Alembic is a database migration tool for SQLAlchemy

1. Initialize
   alembic init migrations

2. Create migration
   alembic revision --autogenerate -m "Add points to users"

3. Review migration (migrations/versions/001_add_points.py)
   def upgrade():
       op.add_column('users', sa.Column('points', sa.Integer(), default=100))
   
   def downgrade():
       op.drop_column('users', 'points')

4. Apply migration
   alembic upgrade head

5. Rollback
   alembic downgrade -1
"""
```

---

## Security & Authentication

### Q41: How does password hashing work?

**Answer:**
```python
# Password Hashing: PBKDF2-HMAC-SHA256
import hashlib
import secrets

def hash_password(password: str) -> str:
    """
    Hash password with PBKDF2
    Format: algorithm$iterations$salt$hash
    """
    # Step 1: Generate random salt (64 bytes = 128 hex chars)
    salt = secrets.token_hex(32)  # Cryptographically secure
    
    # Step 2: Derive key using PBKDF2
    # PBKDF2: Password-Based Key Derivation Function 2
    # Input: password, salt, 260,000 iterations
    # Output: 32-byte hash
    hash_obj = hashlib.pbkdf2_hmac(
        'sha256',                    # Hash algorithm
        password.encode('utf-8'),    # Password to hash
        salt.encode('utf-8'),        # Salt
        260000                       # Iterations (OWASP recommendation)
    )
    
    hash_hex = hash_obj.hex()
    
    # Step 3: Return formatted string
    return f"pbkdf2_sha256$260000${salt}${hash_hex}"

# Result: "pbkdf2_sha256$260000$a1b2c3d4...$e5f6g7h8..."
#                         ^^^^^^^^            ^^^^^^^^
#                         salt                hash
```

**Why 260,000 iterations?**
```
Purpose: Make brute-force attacks expensive

Each attempt requires:
├─ 260,000 SHA-256 computations
├─ ~5-10ms per password (on modern CPU)
└─ 1 billion attempts = 5-10 million seconds = 58+ days

Without iterations:
├─ SHA-256 only: ~1 nanosecond
├─ 1 billion attempts = 1 second
└─ GPU can try billions of passwords instantly ❌

With iterations:
├─ Attacker needs 58+ days to try 1 billion passwords
├─ User only waits 100ms once per login ✓
└─ Time to try 1 billion: User wait * 1 billion attempts
```

---

### Q42: How is JWT token verification implemented?

**Answer:**
```python
import json
import base64
import hmac
import hashlib
from datetime import datetime

def create_jwt_token(user_id: int, secret_key: str) -> str:
    """Create JWT token"""
    
    # Header
    header = {
        "alg": "HS256",    # Algorithm
        "typ": "JWT"       # Type
    }
    
    # Payload (claims)
    now = datetime.utcnow()
    payload = {
        "sub": str(user_id),         # Subject (who)
        "iat": int(now.timestamp()), # Issued at (when)
        "exp": int((now + timedelta(hours=12)).timestamp())  # Expiration
    }
    
    # Encode header and payload to Base64URL
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
    
    # Return complete JWT
    return f"{message}.{signature_b64}"
    # Result: "eyJhbGc...eyJzdW...SflKxw..."
    #         header . payload . signature

def verify_jwt_token(token: str, secret_key: str) -> dict:
    """Verify and decode JWT token"""
    
    try:
        # Step 1: Split token
        header_b64, payload_b64, signature_b64 = token.split('.')
        
        # Step 2: Verify signature
        message = f"{header_b64}.{payload_b64}"
        
        # Compute expected signature
        expected_signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()
        
        # Decode received signature
        received_signature = base64.urlsafe_b64decode(signature_b64 + '==')
        
        # Timing-safe comparison (prevents timing attacks)
        if not hmac.compare_digest(expected_signature, received_signature):
            raise Exception("Invalid signature - token tampered with")
        
        # Step 3: Decode payload
        payload_json = base64.urlsafe_b64decode(payload_b64 + '==').decode()
        payload = json.loads(payload_json)
        
        # Step 4: Check expiration
        current_time = int(datetime.utcnow().timestamp())
        if payload['exp'] < current_time:
            raise Exception("Token expired")
        
        # Step 5: Return payload
        return payload  # {"sub": "1", "iat": 1234567890, "exp": 1234571490}
    
    except Exception as e:
        raise Exception(f"Invalid token: {str(e)}")
```

**JWT Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxIiwiaWF0IjoxNjMxMDEyMDAwLCJleHAiOjE2MzEwOTg0MDB9.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

├─ Header (Base64 decoded):
│  {
│    "alg": "HS256",
│    "typ": "JWT"
│  }
│
├─ Payload (Base64 decoded):
│  {
│    "sub": "1",      ← User ID
│    "iat": 1631012000,  ← Issued at
│    "exp": 1631098400   ← Expires at (12 hours later)
│  }
│
└─ Signature: HMAC-SHA256(header.payload, secret_key)
   ├─ Create: message = "eyJhbGc...Km9k..."
   ├─ Compute: HMAC-SHA256(message, "secret-key")
   ├─ Encode: Base64URL(signature)
   └─ Result: "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
```

---

### Q43: What are timing attacks and how are they prevented?

**Answer:**
```python
# ❌ VULNERABLE: Timing attack
def verify_password_wrong(password, password_hash):
    computed_hash = hash_password(password)
    return computed_hash == password_hash
    # Problem: String comparison stops on first mismatch
    # "aaaa..." vs "bbbb..." → 1 iteration (fast)
    # "baaa..." vs "bbbb..." → 1 iteration (fast)
    # "abaa..." vs "abcd..." → 2 iterations (slightly slower)
    # Attacker measures timing to brute-force character by character

# ✅ SECURE: Timing-safe comparison
import hmac

def verify_password_correct(password, password_hash):
    computed_hash = hash_password(password)
    return hmac.compare_digest(computed_hash, password_hash)
    # hmac.compare_digest compares ALL characters
    # Takes same time regardless of where mismatch occurs
    # Prevents timing-based attacks
```

**Why timing matters:**
```
Timing Attack Scenario:

Correct password: "correct123"
Attacker guesses: "aaaaaa"

Without timing-safe:
└─ Comparison: "aaaa..." == "corr..." → Mismatch at position 0
   └─ Time: 0.001ms (very fast)
   └─ Attacker knows: First letter is wrong

Attacker tries: "caaa..."
└─ Comparison: "caaa..." == "corr..." → Mismatch at position 1
   └─ Time: 0.002ms (slightly slower)
   └─ Attacker knows: First letter might be 'c'

After many attempts:
└─ Builds password character by character based on timing variations

With timing-safe comparison:
└─ All comparisons take 0.5ms regardless of mismatch position
└─ No timing information leaked
```

---

### Q44: How is CORS security configured?

**Answer:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Specific origins
    allow_credentials=True,                    # Allow cookies/auth headers
    allow_methods=["GET", "POST", "PATCH", "DELETE"],  # Specific methods
    allow_headers=["*"]
)

# Security decisions:
1. allow_origins: SPECIFIC list (not "*")
   ❌ Wrong: allow_origins=["*"]  # Any origin can access
   ✅ Right: allow_origins=["https://taskflow.com"]  # Only production

2. allow_credentials=True
   Allows: Authorization header, cookies
   Required for JWT authentication

3. allow_methods: Only needed methods
   ❌ Don't allow TRACE, CONNECT, etc.
   ✅ Allow: GET, POST, PATCH, DELETE

4. allow_headers: Be specific
   ❌ Wrong: allow_headers=["*"]  # Too permissive
   ✅ Right: allow_headers=["Authorization", "Content-Type"]
```

**CORS Preflight Request:**
```
User's browser (http://localhost:3000):
  ├─ OPTIONS /tasks  (preflight request)
  ├─ Origin: http://localhost:3000
  ├─ Access-Control-Request-Method: PATCH
  └─ Access-Control-Request-Headers: Authorization

Server response:
  ├─ Access-Control-Allow-Origin: http://localhost:3000
  ├─ Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
  ├─ Access-Control-Allow-Headers: Authorization, Content-Type
  └─ 200 OK

Browser checks:
  ├─ Requested origin in allowed list? ✓
  ├─ Requested method in allowed methods? ✓
  ├─ Requested headers in allowed headers? ✓
  └─ Proceed with actual request

Actual request:
  ├─ PATCH /tasks
  ├─ Authorization: Bearer {token}
  └─ [Allowed because preflight passed]
```

---

### Q45: Explain SQL injection prevention.

**Answer:**
```python
# ❌ VULNERABLE: String concatenation
username = request.query_params.get("username")
query = f"SELECT * FROM users WHERE username = '{username}'"
# SQL: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
# Returns all users!

# ✅ SECURE: Parameterized queries (SQLAlchemy)
username = request.query_params.get("username")
user = db.query(User).filter(User.username == username).first()
# SQLAlchemy automatically:
# 1. Escapes input
# 2. Separates query from data
# 3. Prevents injection

# How SQLAlchemy prevents injection:
# Backend query:
#   query = User table.filter(User.username == ?)
#   parameter = username
# Database:
#   SELECT * FROM users WHERE username = ?
#   [parameter: "admin' OR '1'='1"]
# Result: Treated as literal string, not SQL code
```

**Attack examples and prevention:**
```sql
-- Attack 1: Comment out password check
Input: admin' --
Query: SELECT * FROM users WHERE username = 'admin' -- ' AND password_hash = '...'
Result: Logs in as admin without password!

With parameterization:
Query: SELECT * FROM users WHERE username = ?
Parameter: "admin' --"
Result: No match (looking for username literally containing "admin' --")

-- Attack 2: OR condition
Input: ' OR '1'='1
Query: SELECT * FROM users WHERE username = '' OR '1'='1' AND ...
Result: Returns all users!

With parameterization:
Query: SELECT * FROM users WHERE username = ?
Parameter: "' OR '1'='1"
Result: No match
```

---

## DevOps & Deployment

### Q46: Explain the Docker Compose setup.

**Answer:**
```yaml
# devops/containers/docker-compose.yml
version: '3.8'

services:
  # Backend service
  backend:
    build:
      context: .                    # Build from current directory
      dockerfile: ../build/dockerfiles/backend.Dockerfile  # Dockerfile path
    ports:
      - "8000:8000"                # Host:Container mapping
    volumes:
      - ./data:/app/data           # Persist database file
    environment:
      - DATABASE_URL=sqlite:///./data/taskflow.db
      - SECRET_KEY=local-dev-key
      - CORS_ORIGINS=http://localhost:3000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s                # Check every 30 seconds
      timeout: 10s                 # Timeout after 10 seconds
      retries: 3                   # Fail after 3 failed checks
    depends_on:
      - frontend                   # Wait for frontend to start? (No actual wait)

  # Frontend service
  frontend:
    build:
      context: ./frontend
      dockerfile: ../build/dockerfiles/frontend.Dockerfile
    ports:
      - "3000:80"                  # Port 80 inside container → 3000 on host
    depends_on:
      - backend
```

**Docker Compose commands:**
```bash
# Start services
docker compose -f devops/containers/docker-compose.yml up

# Start in detached mode (background)
docker compose -f devops/containers/docker-compose.yml up -d

# Rebuild images and start
docker compose -f devops/containers/docker-compose.yml up --build

# Stop services
docker compose -f devops/containers/docker-compose.yml down

# View logs
docker compose -f devops/containers/docker-compose.yml logs -f

# Execute command in container
docker compose -f devops/containers/docker-compose.yml exec backend bash

# View running containers
docker compose -f devops/containers/docker-compose.yml ps
```

---

### Q47: What is in the backend Dockerfile?

**Answer:**
```dockerfile
# devops/build/dockerfiles/backend.Dockerfile

# Step 1: Start from Python 3.12 slim image
FROM python:3.12-slim
# slim = minimal image (~150MB vs ~900MB for full)

# Step 2: Set working directory
WORKDIR /app
# All commands run inside /app directory

# Step 3: Copy requirements and install
COPY requirements.txt .
# Copy from build context to image
RUN pip install --no-cache-dir -r requirements.txt
# --no-cache-dir = Don't store package cache (reduces image size)

# Step 4: Copy application code
COPY . .
# Copy everything from build context to /app

# Step 5: Expose port
EXPOSE 8000
# Document that container listens on port 8000
# (Doesn't actually publish - done in docker-compose)

# Step 6: Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# Command run when container starts
# --host 0.0.0.0 = Listen on all interfaces (required in Docker)
```

**Build layers:**
```
Layer 1: FROM python:3.12-slim         (150MB)
Layer 2: WORKDIR /app                  (0MB - metadata)
Layer 3: COPY requirements.txt .        (+1MB)
Layer 4: RUN pip install ...            (+50MB - packages)
Layer 5: COPY . .                       (+10MB - source code)
Layer 6: EXPOSE 8000                    (0MB - metadata)
Layer 7: CMD [...]                      (0MB - metadata)
──────────────────────────
Total: ~210MB image size

Caching:
├─ If requirements.txt unchanged → Reuse Layer 4 (fast)
└─ If only source code changed → Reuse Layers 1-4 (fast)
```

---

### Q48: How does the Jenkins pipeline work?

**Answer:**
```groovy
// devops/ci-cd/Jenkinsfile
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/user/taskflow.git'
            }
        }
        
        stage('Backend Tests') {
            steps {
                dir('backend') {
                    sh 'pip install -r requirements.txt'
                    sh 'python -m pytest --cov'
                }
            }
        }
        
        stage('Frontend Tests') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }
        
        stage('Build Docker Images') {
            steps {
                sh 'docker build -f devops/build/dockerfiles/backend.Dockerfile -t taskflow-backend:latest .'
                sh 'docker build -f devops/build/dockerfiles/frontend.Dockerfile -t taskflow-frontend:latest frontend/'
            }
        }
        
        stage('Terraform Validation') {
            steps {
                dir('devops/infra-build/terraform') {
                    sh 'terraform init'
                    sh 'terraform validate'
                    sh 'terraform plan -out=tfplan'
                }
            }
        }
        
        stage('Ansible Validation') {
            steps {
                dir('devops/configure-infra/ansible') {
                    sh 'ansible-playbook playbook.yml --syntax-check'
                }
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'  // Only on main branch
            }
            steps {
                dir('devops/infra-build/terraform') {
                    sh 'terraform apply tfplan'
                }
                
                dir('devops/configure-infra/ansible') {
                    sh 'ansible-playbook -i inventory.ini playbook.yml'
                }
            }
        }
    }
    
    post {
        always {
            junit 'backend/test-results.xml'
            publishHTML([
                reportDir: 'backend/htmlcov',
                reportFiles: 'index.html',
                reportName: 'Coverage Report'
            ])
        }
        failure {
            mail to: 'team@taskflow.com',
                 subject: "Pipeline failed: ${env.JOB_NAME}",
                 body: "Check: ${env.BUILD_URL}"
        }
    }
}
```

**Pipeline Flow:**
```
1. Checkout
   └─ Pull latest code from git
        ↓
2. Backend Tests  (Parallel with Frontend Tests)
   ├─ Run pytest
   └─ Generate coverage report
        ↓
3. Frontend Tests
   ├─ npm install
   └─ npm test
        ↓
4. Build Docker Images
   ├─ docker build backend
   └─ docker build frontend
        ↓
5. Terraform Validation
   ├─ terraform validate
   └─ terraform plan (shows what will change)
        ↓
6. Ansible Validation
   ├─ ansible-playbook --syntax-check
        ↓
7. Deploy (only on main branch)
   ├─ terraform apply (provision infrastructure)
   └─ ansible-playbook (configure servers)
```

---

### Q49: Explain Terraform infrastructure-as-code.

**Answer:**
```hcl
# devops/infra-build/terraform/main.tf

# Define AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC (Virtual Private Cloud)
resource "aws_vpc" "taskflow" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "taskflow-vpc"
  }
}

# Security Group (Firewall)
resource "aws_security_group" "taskflow" {
  name_prefix = "taskflow-"
  vpc_id      = aws_vpc.taskflow.id
  
  # Allow HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Public
  }
  
  # Allow SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["203.0.113.0/32"]  # Only my IP
  }
  
  # Allow outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"  # All protocols
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instance
resource "aws_instance" "taskflow" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3.micro"  # Small, free-tier eligible
  key_name               = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.taskflow.id]
  
  # Run on startup
  user_data = base64encode(file("${path.module}/user_data.sh"))
  
  tags = {
    Name = "taskflow-app"
  }
}

# Elastic IP (Static IP)
resource "aws_eip" "taskflow" {
  instance = aws_instance.taskflow.id
  domain   = "vpc"
  
  depends_on = [aws_internet_gateway.taskflow]
}

# Output (Display after creation)
output "instance_public_ip" {
  value = aws_eip.taskflow.public_ip
  description = "Public IP of TaskFlow instance"
}
```

**Terraform workflow:**
```bash
# 1. Initialize (download AWS provider)
terraform init

# 2. Plan (preview what will be created)
terraform plan
# Output:
#   + aws_instance.taskflow
#   + aws_security_group.taskflow
#   + aws_eip.taskflow
#   Total: 3 resources to create

# 3. Apply (actually create resources)
terraform apply
# Prompts: "Do you want to perform these actions?" → Type 'yes'
# Creates infrastructure on AWS
# Saves state to terraform.tfstate (DO NOT COMMIT to git!)

# 4. Inspect (view created resources)
terraform state list
terraform state show aws_instance.taskflow

# 5. Destroy (delete infrastructure - CAREFUL!)
terraform destroy
# Prompts: "Do you really want to destroy?" → Type 'yes'
# Deletes all AWS resources
```

**IaC Benefits:**
- Version controlled infrastructure (git history)
- Reproducible deployments (same code = same infrastructure)
- Easy scaling (change instance_count variable)
- Cost tracking (see what resources cost)

---

### Q50: How does Ansible configure servers?

**Answer:**
```yaml
# devops/configure-infra/ansible/playbook.yml

---
- name: Configure TaskFlow Server
  hosts: taskflow_servers
  become: yes  # Run with sudo
  
  vars:
    app_dir: /opt/taskflow
    docker_compose_file: /opt/taskflow/devops/containers/docker-compose.yml
  
  tasks:
    # Update system packages
    - name: Update package cache
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
    
    # Install Docker
    - name: Install Docker
      apt:
        name: docker.io
        state: present
    
    - name: Start Docker service
      service:
        name: docker
        state: started
        enabled: yes  # Start on boot
    
    # Clone repository
    - name: Clone TaskFlow repository
      git:
        repo: 'https://github.com/user/taskflow.git'
        dest: "{{ app_dir }}"
        version: main
    
    # Create environment file
    - name: Create .env file
      template:
        src: env.j2
        dest: "{{ app_dir }}/.env"
      vars:
        database_url: "{{ db_url }}"
        secret_key: "{{ secret_key }}"
    
    # Start services with Docker Compose
    - name: Start application
      docker_compose:
        project_src: "{{ app_dir }}"
        files:
          - devops/containers/docker-compose.yml
        state: present
        pull: yes  # Pull latest images
    
    # Verify application is running
    - name: Wait for application to be ready
      wait_for:
        host: localhost
        port: 8000
        state: started
        timeout: 300
    
    # Health check
    - name: Check application health
      uri:
        url: http://localhost:8000/health
        method: GET
        status_code: 200
      register: result
      until: result.status == 200
      retries: 5
      delay: 10
```

**Ansible execution:**
```bash
# 1. Prepare inventory (list of servers)
cat > inventory.ini <<EOF
[taskflow_servers]
taskflow.example.com ansible_user=ec2-user

[taskflow_servers:vars]
db_url=postgresql://...
secret_key=prod-secret-key
EOF

# 2. Run playbook
ansible-playbook -i inventory.ini playbook.yml

# 3. Idempotent (safe to run multiple times)
# First run: Installs Docker, clones repo, starts app
# Second run: Checks, updates repo, restarts if needed (no errors)

# 4. Dry run (preview what will change)
ansible-playbook -i inventory.ini playbook.yml --check

# 5. Only run specific tasks
ansible-playbook -i inventory.ini playbook.yml --tags "install_docker,start_app"
```

**Ansible vs. Terraform:**
```
Terraform: Infrastructure Provisioning
├─ Creates EC2 instances
├─ Creates security groups
├─ Creates networks
└─ Infrastructure-level

Ansible: Server Configuration
├─ Installs software
├─ Configures settings
├─ Deploys applications
└─ Application-level

Together:
1. Terraform provisions 3 EC2 instances
2. Ansible configures all 3 with same setup
3. Result: 3 identical servers running TaskFlow
```

---

### Q51: Explain Kubernetes deployment.

**Answer:**
```yaml
# devops/kubernetes/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: taskflow
---

# devops/kubernetes/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: taskflow-config
  namespace: taskflow
data:
  DATABASE_URL: "sqlite:///./data/taskflow.db"
  CORS_ORIGINS: "http://localhost:3000"
---

# devops/kubernetes/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: taskflow
  labels:
    app: taskflow-backend
spec:
  replicas: 2  # Run 2 copies for redundancy
  selector:
    matchLabels:
      app: taskflow-backend
  
  template:
    metadata:
      labels:
        app: taskflow-backend
    spec:
      containers:
      - name: backend
        image: taskflow-backend:latest
        imagePullPolicy: Always
        
        ports:
        - name: http
          containerPort: 8000
        
        env:
        - name: DATABASE_URL
          valueFrom:
            configMapKeyRef:
              name: taskflow-config
              key: DATABASE_URL
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: taskflow-secrets
              key: secret-key
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
---

# devops/kubernetes/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: taskflow
spec:
  type: LoadBalancer
  ports:
  - port: 8000
    targetPort: http
    protocol: TCP
  selector:
    app: taskflow-backend
---

# devops/kubernetes/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: taskflow
spec:
  replicas: 2
  selector:
    matchLabels:
      app: taskflow-frontend
  
  template:
    metadata:
      labels:
        app: taskflow-frontend
    spec:
      containers:
      - name: frontend
        image: taskflow-frontend:latest
        ports:
        - containerPort: 80
        
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---

# devops/kubernetes/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: taskflow-ingress
  namespace: taskflow
spec:
  ingressClassName: nginx
  rules:
  - host: taskflow.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 8000
```

**Kubernetes deployment flow:**
```bash
# 1. Create namespace and secrets
kubectl apply -f devops/kubernetes/namespace.yaml
kubectl create secret generic taskflow-secrets \
  --from-literal=secret-key="prod-key" \
  -n taskflow

# 2. Deploy backend (2 replicas)
kubectl apply -f devops/kubernetes/backend-deployment.yaml
# Creates: 2 Pod instances running backend container
# Each Pod: 256Mi RAM, 250m CPU request

# 3. Expose backend with service
kubectl apply -f devops/kubernetes/backend-service.yaml
# Creates: LoadBalancer service (external IP)
# Maps: External port 8000 → Internal container port 8000

# 4. Deploy frontend (2 replicas)
kubectl apply -f devops/kubernetes/frontend-deployment.yaml

# 5. Configure ingress (routing)
kubectl apply -f devops/kubernetes/ingress.yaml
# Configures: Nginx ingress controller
# Routes: taskflow.example.com → frontend OR backend

# 6. View deployments
kubectl get deployments -n taskflow
kubectl get pods -n taskflow
kubectl get services -n taskflow

# 7. View logs
kubectl logs -n taskflow deployment/backend

# 8. Scale deployment
kubectl scale deployment backend -n taskflow --replicas=3
# Now running 3 copies of backend

# 9. Rolling update
kubectl set image deployment/backend \
  backend=taskflow-backend:v2 \
  -n taskflow
# Updates: Gradually kills old pods, starts new ones (zero downtime)
```

**Kubernetes architecture:**
```
┌─────────────────────────────────────────────────────┐
│                Kubernetes Cluster                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │             Namespace: taskflow               │  │
│  ├───────────────────────────────────────────────┤  │
│  │                                               │  │
│  │  Frontend Deployment (replicas: 2)           │  │
│  │  ├─ Pod 1: frontend:latest                   │  │
│  │  └─ Pod 2: frontend:latest                   │  │
│  │                                               │  │
│  │  Backend Deployment (replicas: 2)            │  │
│  │  ├─ Pod 1: backend:latest (8000)             │  │
│  │  └─ Pod 2: backend:latest (8000)             │  │
│  │                                               │  │
│  │  Services                                     │  │
│  │  ├─ Frontend Service → Port 80 → Frontend    │  │
│  │  └─ Backend Service → Port 8000 → Backend    │  │
│  │                                               │  │
│  │  Ingress                                      │  │
│  │  └─ taskflow.example.com/api → Backend       │  │
│  │  └─ taskflow.example.com/ → Frontend         │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
         ↑
         │ External traffic
    Load Balancer / Ingress Controller
```

---

This comprehensive documentation should give you excellent material for interviews! Continue to the Interview Q&A section for practice questions.
