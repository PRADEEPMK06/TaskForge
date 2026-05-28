# TaskFlow Project - Additional 50+ Interview Questions & Answers (Part 2)

## Continuation from Part 1 - Questions 52-120

### Q52: What is a liveness probe and readiness probe in Kubernetes?

**Answer:**
```yaml
# Liveness Probe: Is the container alive?
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 10  # Wait 10s before first check
  periodSeconds: 10        # Check every 10 seconds
  timeoutSeconds: 5        # Wait 5s for response
  failureThreshold: 3      # Fail after 3 consecutive failures

# If liveness fails:
# ├─ Kubernetes kills pod
# ├─ Deployment creates replacement pod
# └─ Application restarted (automatically!)

# Readiness Probe: Is the container ready for traffic?
readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3

# If readiness fails:
# ├─ Service removes pod from load balancing
# ├─ Pod stays running (may recover)
# └─ Traffic routed to healthy pods only
```

**Difference:**
```
Liveness:   Is it alive? → No? → Kill and restart
Readiness:  Is it ready? → No? → Stop sending traffic, keep running
```

---

### Q53: How does volume mounting work in Kubernetes?

**Answer:**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: taskflow-db-pvc
  namespace: taskflow
spec:
  accessModes:
    - ReadWriteOnce  # Only one pod can write
  resources:
    requests:
      storage: 5Gi   # 5 Gigabytes

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: taskflow
spec:
  template:
    spec:
      containers:
      - name: backend
        image: taskflow-backend:latest
        
        volumeMounts:
        - name: db-storage
          mountPath: /app/data  # Inside container
      
      volumes:
      - name: db-storage
        persistentVolumeClaim:
          claimName: taskflow-db-pvc  # Use PVC
```

**What happens:**
```
Container starts
  ├─ /app/data mounted to PVC
  ├─ PVC backed by persistent storage (AWS EBS, NFS, etc)
  ├─ taskflow.db stored in PVC
  └─ Data survives pod deletion!

Without volume:
  Pod deleted → /app/data deleted → Database lost ❌

With volume:
  Pod deleted → /app/data preserved in PVC → New pod can access ✓
```

---

### Q54: Explain rolling updates in Kubernetes.

**Answer:**
```bash
# Current deployment: 3 replicas running v1.0

kubectl set image deployment/backend backend=taskflow-backend:v2

# Kubernetes performs rolling update:

Step 1: Create 1 pod with v2 (4 total: 3 v1 + 1 v2)
Step 2: Health check new v2 pod
Step 3: If healthy, kill 1 v1 pod (3 total: 2 v1 + 1 v2)
Step 4: Create another v2 pod (4 total: 2 v1 + 2 v2)
Step 5: Health check
Step 6: Kill another v1 pod (3 total: 1 v1 + 2 v2)
Step 7: Create last v2 pod (4 total: 1 v1 + 3 v2)
Step 8: Health check
Step 9: Kill last v1 pod (3 total: 0 v1 + 3 v2)

Result: Smooth transition with zero downtime!
├─ At least 2 pods always running (serving requests)
├─ Old pods kept until new ones healthy
└─ Automatic rollback if health check fails
```

**Rollback:**
```bash
# If update fails
kubectl rollout undo deployment/backend

# Reverts to previous version automatically
```

---

### Q55: How is database connection pooling handled?

**Answer:**
```python
# SQLAlchemy connection pooling
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

# Default pool (QueuePool) - efficient connection reuse
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,         # Keep 5 connections open
    max_overflow=10,     # Allow 10 overflow connections
    pool_pre_ping=True,  # Test connection before use
    pool_recycle=3600    # Recycle connections every hour
)

# SessionLocal - factory for sessions
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Usage in routes
async def get_db():
    db = SessionLocal()  # Get connection from pool
    try:
        yield db
    finally:
        db.close()       # Return connection to pool (not closed)
```

**Connection pooling benefits:**
```
Without pooling:
  Request 1 → Create connection (slow)
  Request 1 finishes
  Connection closed
  Request 2 → Create connection (slow again)
  → 1ms per request × 1000 requests = 1000ms overhead

With pooling:
  Request 1 → Reuse connection from pool (fast)
  Request 1 finishes
  Connection returned to pool
  Request 2 → Reuse same connection (fast)
  → Reuse overhead minimal
```

---

### Q56: Explain CPU and memory requests/limits in Kubernetes.

**Answer:**
```yaml
resources:
  requests:          # Minimum guaranteed
    memory: "256Mi"  # 256 Megabytes
    cpu: "250m"      # 250 millicores (0.25 CPU)
  
  limits:            # Maximum allowed
    memory: "512Mi"  # 512 Megabytes
    cpu: "500m"      # 500 millicores (0.5 CPU)

# What this means:
# 1. Kubernetes guarantees 256Mi RAM for this pod
#    └─ If node doesn't have 256Mi free, pod doesn't schedule
#
# 2. Pod can use up to 512Mi RAM
#    └─ If exceeds 512Mi, pod is killed (OOMKilled)
#
# 3. Pod guaranteed 250m CPU
#    └─ Gets 250m even if other pods need it
#
# 4. Pod can burst up to 500m CPU
#    └─ If available; else throttled to 250m
```

**Sizing for TaskFlow:**
```
Backend container:
├─ requests: 256Mi RAM, 250m CPU
│  └─ Python + FastAPI + SQLite uses ~150Mi
│
├─ limits: 512Mi RAM, 500m CPU
│  └─ Peak usage (stress testing) ~400Mi

Frontend container:
├─ requests: 64Mi RAM, 50m CPU
│  └─ Nginx very lightweight
│
└─ limits: 128Mi RAM, 100m CPU
   └─ Static files serving doesn't need much
```

---

### Q57: What is a DaemonSet vs Deployment?

**Answer:**
```
Deployment:
├─ Run N replicas (you specify count)
├─ Example: 2 backend pods
└─ Useful for: Applications

DaemonSet:
├─ Run on every node in cluster
├─ Example: Prometheus node exporter
├─ If 3 nodes → 3 pods automatically
├─ If add 4th node → 4th pod auto-created
└─ Useful for: Monitoring, logging, networking

Example DaemonSet (Monitoring Agent):
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
        ports:
        - containerPort: 9100
```

---

### Q58: How are environment variables passed to containers?

**Answer:**
```yaml
# Method 1: Direct environment variables
containers:
- name: backend
  image: taskflow-backend:latest
  env:
  - name: DEBUG
    value: "true"
  - name: LOG_LEVEL
    value: "INFO"
  - name: DATABASE_URL
    value: "sqlite:///./data/taskflow.db"

# Method 2: From ConfigMap
containers:
- name: backend
  env:
  - name: CORS_ORIGINS
    valueFrom:
      configMapKeyRef:
        name: taskflow-config
        key: cors_origins
  # Looks up ConfigMap "taskflow-config"
  # Retrieves key "cors_origins" = "http://localhost:3000"

# Method 3: From Secret
containers:
- name: backend
  env:
  - name: SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: taskflow-secrets
        key: secret-key
  # Same but values encrypted at rest

# Usage in Python
import os
debug = os.getenv("DEBUG", "false").lower() == "true"
log_level = os.getenv("LOG_LEVEL", "INFO")
```

---

### Q59: What is horizontal pod autoscaling?

**Answer:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-autoscaler
  namespace: taskflow
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  
  minReplicas: 2
  maxReplicas: 10
  
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale up at 70% CPU
  
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80  # Scale up at 80% memory

# Behavior: CPU-based autoscaling
High traffic arrives
  ├─ CPU usage spikes to 85%
  ├─ HPA detects: 85% > 70% target
  ├─ Calculates: Need 85/70 = 1.2x more pods
  ├─ Current: 2 pods → Scale to 3 pods
  ├─ 3 pods created, traffic distributed
  └─ CPU back to ~70%

Low traffic
  ├─ CPU usage drops to 40%
  ├─ HPA detects: 40% < 70% target
  ├─ Waits 300s (cooldown to prevent flapping)
  ├─ Scale down from 3 to 2 pods
  └─ Save resources!
```

---

### Q60: How does the Prometheus metrics endpoint work?

**Answer:**
```python
# app/main.py
@app.get("/metrics")
async def metrics():
    """
    Prometheus-compatible metrics endpoint
    Scraped by Prometheus every 30 seconds
    """
    metrics_text = """
# HELP taskflow_users_total Total number of users
# TYPE taskflow_users_total counter
taskflow_users_total 42

# HELP taskflow_tasks_total Total number of tasks
# TYPE taskflow_tasks_total counter
taskflow_tasks_total 150

# HELP taskflow_tasks_completed_total Completed tasks
# TYPE taskflow_tasks_completed_total counter
taskflow_tasks_completed_total 89

# HELP taskflow_http_requests_total HTTP requests
# TYPE taskflow_http_requests_total counter
taskflow_http_requests_total{method="GET",endpoint="/tasks",status="200"} 1234
taskflow_http_requests_total{method="POST",endpoint="/tasks",status="201"} 456

# HELP taskflow_request_duration_seconds Request duration
# TYPE taskflow_request_duration_seconds histogram
taskflow_request_duration_seconds_bucket{le="0.1"} 500
taskflow_request_duration_seconds_bucket{le="0.5"} 800
taskflow_request_duration_seconds_bucket{le="1.0"} 900
taskflow_request_duration_seconds_bucket{le="+Inf"} 1000
    """
    return metrics_text

# Prometheus configuration
# devops/monitoring/prometheus.yml
global:
  scrape_interval: 30s

scrape_configs:
  - job_name: 'taskflow'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'

# Prometheus collects metrics
# Stores time-series data: metric_name{labels} = value @ timestamp
# Allows queries like:
# - taskflow_tasks_completed_total[5m]  (last 5 minutes)
# - rate(taskflow_http_requests_total[1m])  (requests per second)
# - sum(taskflow_request_duration_seconds)  (total duration)
```

---

### Q61: Explain load balancing strategies.

**Answer:**
```yaml
# Kubernetes Service Load Balancing

apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: LoadBalancer  # Or ClusterIP, NodePort
  selector:
    app: taskflow-backend
  ports:
  - port: 8000
    targetPort: 8000

# How it works:
# 1. 3 pods running backend:
#    ├─ Pod A: IP 10.0.1.5:8000
#    ├─ Pod B: IP 10.0.1.6:8000
#    └─ Pod C: IP 10.0.1.7:8000
#
# 2. Service gets virtual IP: 10.100.0.1:8000
#
# 3. Client request comes in:
#    ├─ Client → 10.100.0.1:8000
#    ├─ kube-proxy intercepts (iptables rules)
#    ├─ Load balancing algorithm:
#    │  ├─ Round-robin (default): A → B → C → A ...
#    │  ├─ Client IP (hash): Same client always goes to same pod
#    │  └─ Random
#    ├─ Forward to chosen pod (e.g., Pod B: 10.0.1.6:8000)
#    └─ Response comes back through service
#
# Result: Traffic distributed across healthy pods
```

---

### Q62: How is the application health monitored?

**Answer:**
```python
# Backend health check
@app.get("/health")
async def health():
    """
    Returns 200 OK if service is healthy
    Used by:
    ├─ Kubernetes liveness/readiness probes
    ├─ Docker HEALTHCHECK
    ├─ Load balancers
    └─ Monitoring systems
    """
    try:
        # Check database connectivity
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "taskflow-backend",
            "version": "1.0.0"
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detail": str(e)}
        )
```

**Monitoring Stack:**
```
Application (health endpoint)
         ↓
Prometheus (scrapes every 30s)
         ↓
Stores metrics
         ↓
Grafana (visualizes)
   ├─ Dashboard
   ├─ Graphs
   └─ Alerts
         ↓
AlertManager
   ├─ Email notification
   ├─ Slack message
   └─ PagerDuty
         ↓
On-call engineer
```

---

### Q63: How would you implement caching for performance?

**Answer:**
```python
# Option 1: Redis cache (distributed)
import redis

cache = redis.Redis(host='localhost', port=6379)

@app.get("/tasks")
async def list_tasks(current_user: User = Depends(get_current_user)):
    # Cache key
    cache_key = f"user:{current_user.id}:tasks"
    
    # Try to get from cache
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Cache miss - fetch from DB
    tasks = db.query(Task).filter(Task.owner_id == current_user.id).all()
    
    # Store in cache (expires in 5 minutes)
    cache.setex(cache_key, 300, json.dumps(tasks))
    
    return tasks

# When task is updated, invalidate cache
@app.patch("/tasks/{task_id}")
async def update_task(task_id: int, ...):
    task = update_in_db(...)
    
    # Invalidate user's cache
    cache.delete(f"user:{task.owner_id}:tasks")
    
    return task

# Option 2: Frontend caching (localStorage)
// Already implemented in dashboard.js
this.tasks = []  // In-memory cache

async loadData() {
    const tasks = await api.getTasks()
    this.tasks = tasks  // Store in memory
    this.render()
}

// Updates immediately from cache
async updateTask(id, updates) {
    const index = this.tasks.findIndex(t => t.id === id)
    this.tasks[index] = { ...this.tasks[index], ...updates }
    this.render()  // Instant UI update
    
    // Then send to server
    await api.updateTask(id, updates)
}
```

---

### Q64: How would you add user authentication with OAuth2/Google Sign-In?

**Answer:**
```python
# Add to requirements.txt
pip install python-multipart google-auth-oauthlib

# Backend
from google.oauth2 import id_token
from google.auth.transport import requests

@app.post("/auth/google")
async def google_login(token: str, db: Session = Depends(get_db)):
    """
    User clicks "Sign in with Google"
    → Frontend gets ID token from Google
    → Sends token to backend
    → Backend verifies token
    → User logged in
    """
    try:
        # Verify token with Google
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            client_id=settings.GOOGLE_CLIENT_ID
        )
        
        email = idinfo['email']
        google_id = idinfo['sub']
        
        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Create new user from Google info
            user = User(
                email=email,
                google_id=google_id,
                username=email.split('@')[0],
                password_hash=None  # No password needed
            )
            db.add(user)
            db.commit()
        
        # Generate app JWT token
        token = create_jwt_token(user.id, settings.SECRET_KEY)
        
        return AuthResponse(
            access_token=token,
            token_type="bearer",
            user=UserRead.from_orm(user)
        )
    
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# Frontend
// Add Google Sign-In button
<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"
     data-callback="handleGoogleSignIn">
</div>

async function handleGoogleSignIn(response) {
    const token = response.credential;
    
    // Send to backend
    const response = await fetch('/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
    
    const data = await response.json();
    localStorage.setItem('taskflow_token', data.access_token);
    window.location.href = '/index.html';
}
```

---

### Q65: How would you implement task notifications?

**Answer:**
```python
# Add WebSocket support for real-time notifications
from fastapi import WebSocket
from fastapi.routing import WebSocketRoute
import asyncio

# Store active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}
    
    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: int):
        del self.active_connections[user_id]
    
    async def notify(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            ws = self.active_connections[user_id]
            await ws.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """
    WebSocket connection for real-time notifications
    """
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Keep connection alive
    except Exception:
        manager.disconnect(user_id)

# Notify on task creation
@app.post("/tasks")
async def create_task(...):
    new_task = create_in_db(...)
    
    # Send notification
    await manager.notify(current_user.id, {
        "type": "task_created",
        "task": new_task,
        "message": f"Task '{new_task.title}' created"
    })
    
    return new_task

# Frontend WebSocket
const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`);

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    if (message.type === 'task_created') {
        this.tasks.push(message.task);
        this.render();
        this.showNotification(message.message);
    }
    
    if (message.type === 'task_completed') {
        this.showNotification(`Task '${message.task.title}' completed! 🎉`);
    }
};
```

---

### Q66: How would you implement full-text search for tasks?

**Answer:**
```python
# Option 1: SQLite full-text search (simple)
@app.get("/tasks/search")
async def search_tasks(q: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Simple LIKE search
    """
    query = q.lower()
    tasks = db.query(Task).filter(
        Task.owner_id == current_user.id,
        or_(
            Task.title.ilike(f"%{query}%"),
            Task.description.ilike(f"%{query}%")
        )
    ).all()
    return tasks

# Option 2: PostgreSQL full-text search (production)
# Requires PostgreSQL (SQLite limitation)

from sqlalchemy import func, text

@app.get("/tasks/search")
async def search_tasks(q: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    PostgreSQL full-text search (faster, better ranking)
    """
    # Create search vector
    search_vector = func.to_tsvector('english', Task.title) | \
                   func.to_tsvector('english', Task.description)
    
    # Create query
    search_query = func.plainto_tsquery('english', q)
    
    # Search
    tasks = db.query(Task).filter(
        Task.owner_id == current_user.id,
        search_vector.match(search_query)
    ).order_by(
        func.ts_rank(search_vector, search_query).desc()
    ).all()
    
    return tasks

# Frontend
<input type="text" id="search-input" placeholder="Search tasks...">

document.getElementById('search-input').addEventListener('input', async (e) => {
    const query = e.target.value;
    
    if (query.length < 2) {
        this.render();
        return;
    }
    
    const results = await api.request(`/tasks/search?q=${query}`);
    this.tasks = results;
    this.render();
});
```

---

### Q67: How would you implement audit logging?

**Answer:**
```python
# Add audit trail for all changes
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)  # create, update, delete
    resource_type = Column(String)  # task, user
    resource_id = Column(Integer)
    changes = Column(String)  # JSON: {field: [old, new]}
    timestamp = Column(DateTime, default=datetime.utcnow)

@app.patch("/tasks/{task_id}")
async def update_task(task_id: int, updates: TaskUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Update task and audit changes
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    
    # Record old values
    changes = {}
    for field, new_value in updates.dict(exclude_unset=True).items():
        old_value = getattr(task, field)
        if old_value != new_value:
            changes[field] = [old_value, new_value]
        setattr(task, field, new_value)
    
    # Create audit log
    if changes:
        audit = AuditLog(
            user_id=current_user.id,
            action="update",
            resource_type="task",
            resource_id=task_id,
            changes=json.dumps(changes)
        )
        db.add(audit)
    
    db.commit()
    return task

@app.get("/audit-logs")
async def get_audit_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    View audit trail for user's activities
    """
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(
        AuditLog.timestamp.desc()
    ).all()
    
    return logs
```

---

### Q68: How would you implement role-based access control (RBAC)?

**Answer:**
```python
from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

class User(Base):
    role = Column(String, default="user")  # admin, user, viewer

class Task(Base):
    visibility = Column(String, default="private")  # private, shared, public

@app.get("/tasks")
async def list_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    User sees:
    - Their own tasks (private)
    - Shared tasks from other users
    - Admin sees all tasks
    """
    if current_user.role == "admin":
        tasks = db.query(Task).all()
    else:
        tasks = db.query(Task).filter(
            or_(
                Task.owner_id == current_user.id,
                Task.visibility == "shared"
            )
        ).all()
    
    return tasks

def require_role(required_role: Role):
    """Dependency: Check user role"""
    async def check_role(current_user: User = Depends(get_current_user)):
        if current_user.role != required_role.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    
    return check_role

@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db)
):
    """Only admin can delete users"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    
    db.delete(user)
    db.commit()
```

---

### Q69: How would you implement rate limiting?

**Answer:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/tasks")
@limiter.limit("100/minute")  # Max 100 requests per minute
async def list_tasks(request: Request, current_user: User = Depends(get_current_user)):
    """
    Rate limiting prevents abuse:
    ├─ Authenticated: 100 requests/minute
    ├─ Unauthenticated: 10 requests/minute
    ├─ Admin: No limit
    └─ Returns 429 Too Many Requests when exceeded
    """
    return await get_user_tasks(current_user)

# User perspective:
# ├─ First 100 requests in 1 minute → OK (200)
# ├─ Request 101 → 429 Too Many Requests
# ├─ Wait until 1 minute passes
# └─ Counter resets → Can make 100 more requests

# Implementation with per-user limits
def get_rate_limit(current_user: User) -> str:
    if current_user.role == "admin":
        return "1000/minute"
    elif current_user.role == "user":
        return "100/minute"
    else:
        return "10/minute"

@app.get("/tasks")
async def list_tasks(current_user: User = Depends(get_current_user)):
    limit = get_rate_limit(current_user)
    # Apply limit
    ...
```

---

### Q70: How would you add file upload (for task attachments)?

**Answer:**
```python
from fastapi import File, UploadFile
import os
from pathlib import Path

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class TaskAttachment(Base):
    __tablename__ = "task_attachments"
    
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), cascade="delete")
    filename = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

@app.post("/tasks/{task_id}/attachments")
async def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload file attachment to task
    """
    # Verify ownership
    task = db.query(Task).filter(Task.id == task_id).first()
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403)
    
    # Validate file
    MAX_SIZE = 5 * 1024 * 1024  # 5MB
    contents = await file.read()
    
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    
    # Save file
    filename = f"{task_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Record in database
    attachment = TaskAttachment(
        task_id=task_id,
        filename=file.filename,
        file_path=str(file_path),
        file_size=len(contents)
    )
    db.add(attachment)
    db.commit()
    
    return {"filename": file.filename, "size": len(contents)}

@app.get("/tasks/{task_id}/attachments")
async def list_attachments(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List attachments for task"""
    attachments = db.query(TaskAttachment).filter(
        TaskAttachment.task_id == task_id
    ).all()
    
    return attachments

@app.get("/attachments/{attachment_id}/download")
async def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    """Download attachment"""
    attachment = db.query(TaskAttachment).filter(
        TaskAttachment.id == attachment_id
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=404)
    
    return FileResponse(
        path=attachment.file_path,
        filename=attachment.filename,
        media_type='application/octet-stream'
    )
```

---

### Q71: How would you implement task reminders/notifications?

**Answer:**
```python
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

scheduler = BackgroundScheduler()

def check_due_tasks():
    """
    Background job: Check for tasks due soon
    Run every 5 minutes
    """
    db = SessionLocal()
    
    # Find tasks due in next 1 hour
    now = datetime.utcnow()
    one_hour_later = now + timedelta(hours=1)
    
    tasks = db.query(Task).filter(
        Task.status != "done",
        Task.due_date.between(now, one_hour_later),
        ~Task.reminder_sent  # Not already sent
    ).all()
    
    for task in tasks:
        # Send reminder
        send_email(
            to=task.owner.email,
            subject=f"Reminder: Task '{task.title}' due soon",
            body=f"Your task '{task.title}' is due at {task.due_date}"
        )
        
        task.reminder_sent = True
    
    db.commit()
    db.close()

# Schedule the job
scheduler.add_job(check_due_tasks, 'interval', minutes=5)
scheduler.start()

# Or use Celery for distributed task queue
# from celery import Celery
# celery_app = Celery('taskflow')
#
# @celery_app.task
# def send_reminder(task_id):
#     task = db.query(Task).get(task_id)
#     send_email(task.owner.email, f"Reminder: {task.title}")
#
# # Trigger from route
# send_reminder.delay(task_id)
```

---

### Q72: How would you implement collaborative tasks (multiple users)?

**Answer:**
```python
class TaskCollaborator(Base):
    __tablename__ = "task_collaborators"
    
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), cascade="delete")
    user_id = Column(Integer, ForeignKey("users.id"), cascade="delete")
    role = Column(String, default="viewer")  # viewer, editor, owner
    added_at = Column(DateTime, default=datetime.utcnow)

@app.post("/tasks/{task_id}/collaborators")
async def add_collaborator(
    task_id: int,
    collaborator_username: str,
    role: str = "editor",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add user as collaborator to task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    
    # Verify ownership
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403)
    
    # Find collaborator user
    collaborator = db.query(User).filter(
        User.username == collaborator_username
    ).first()
    
    if not collaborator:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add collaborator
    existing = db.query(TaskCollaborator).filter(
        TaskCollaborator.task_id == task_id,
        TaskCollaborator.user_id == collaborator.id
    ).first()
    
    if not existing:
        collab = TaskCollaborator(
            task_id=task_id,
            user_id=collaborator.id,
            role=role
        )
        db.add(collab)
        db.commit()
    
    return {"message": f"Added {collaborator_username} as {role}"}

@app.get("/tasks")
async def list_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    User sees:
    1. Tasks they own
    2. Tasks they're collaborator on
    """
    owned_tasks = db.query(Task).filter(Task.owner_id == current_user.id)
    
    collab_tasks = db.query(Task).join(TaskCollaborator).filter(
        TaskCollaborator.user_id == current_user.id
    )
    
    from sqlalchemy import union
    all_tasks = owned_tasks.union(collab_tasks).all()
    
    return all_tasks
```

---

### Q73: What are best practices for error handling and logging?

**Answer:**
```python
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

@app.get("/tasks")
async def list_tasks(current_user: User = Depends(get_current_user)):
    try:
        logger.info(f"User {current_user.id} fetching tasks")
        
        tasks = db.query(Task).filter(Task.owner_id == current_user.id).all()
        
        logger.info(f"User {current_user.id} fetched {len(tasks)} tasks")
        return tasks
    
    except Exception as e:
        logger.error(f"Error fetching tasks for user {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# Structured logging
logger.info(
    "Task created",
    extra={
        "user_id": current_user.id,
        "task_id": new_task.id,
        "title": new_task.title,
        "timestamp": datetime.utcnow().isoformat()
    }
)

# Best practices:
# 1. Log at appropriate levels
#    ├─ DEBUG: Detailed info for debugging
#    ├─ INFO: General information (task created)
#    ├─ WARNING: Something unexpected
#    ├─ ERROR: Something went wrong
#    └─ CRITICAL: System is unstable

# 2. Include context
#    ├─ User ID
#    ├─ Request ID (for tracing)
#    ├─ Timestamp
#    └─ Resource being accessed

# 3. Never log sensitive data
#    ❌ logger.info(f"User {user.email} password: {password}")
#    ✅ logger.info(f"User {user.email} authenticated")

# 4. Log exceptions with traceback
#    logger.error("Error:", exc_info=True)  # Includes stack trace
```

---

### Q74: How would you handle database migrations in production?

**Answer:**
```bash
# Using Alembic (migration tool)

# 1. Initialize migrations
alembic init migrations

# 2. Create migration
# app/models.py (modify)
class User(Base):
    points_total = Column(Integer, default=100)  # NEW field

# Generate migration
alembic revision --autogenerate -m "Add points_total to users"

# 3. Review migration file
# migrations/versions/001_add_points_total.py
def upgrade():
    op.add_column('users', 
        sa.Column('points_total', sa.Integer(), nullable=True, server_default='100'))

def downgrade():
    op.drop_column('users', 'points_total')

# 4. Test migration locally
alembic upgrade head
# Verify: SELECT * FROM users - has points_total column

# Downgrade to test rollback
alembic downgrade base
# Verify: Column removed

# Upgrade again
alembic upgrade head

# 5. Deploy to production
# Option A: Part of deployment (safe)
docker run taskflow-backend:v2 alembic upgrade head
# Wait for migration to complete
docker run taskflow-backend:v2  # Start app

# Option B: Blue-green deployment
# 1. Deploy new version (not active)
# 2. Run migrations
# 3. Verify
# 4. Switch traffic to new version
# 5. Old version stops (no downtime!)

# Best practices:
# ✅ Always write rollback (downgrade) function
# ✅ Test on staging environment first
# ✅ Schedule during low-traffic period
# ✅ Have backup before migration
# ✅ Monitor after migration for issues
# ✅ Keep migrations small and focused
```

---

### Q75: How would you implement multi-tenancy?

**Answer:**
```python
# Add tenant column to all tenant-scoped tables

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    domain = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    # Rest of fields...

class Task(Base):
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    # Rest of fields...

# Tenant detection
def get_tenant_from_request(request: Request) -> Tenant:
    """
    Determine tenant from request:
    ├─ Subdomain: taskflow-acme.example.com → acme tenant
    ├─ Domain: acme.taskflow.com → acme tenant
    └─ Header: X-Tenant-ID: 123 → tenant 123
    """
    subdomain = request.headers.get("x-forwarded-host", "").split('.')[0]
    
    db = SessionLocal()
    tenant = db.query(Tenant).filter(Tenant.domain == subdomain).first()
    return tenant

# Middleware: Inject tenant
@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    tenant = get_tenant_from_request(request)
    request.state.tenant = tenant
    response = await call_next(request)
    return response

# Route: Filter by tenant
@app.get("/tasks")
async def list_tasks(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Only see tasks from same tenant
    """
    tenant = request.state.tenant
    
    tasks = db.query(Task).filter(
        Task.tenant_id == tenant.id,
        Task.owner_id == current_user.id
    ).all()
    
    return tasks
```

---

## Final Interview Tips & Summary

### Q76: What are the main strengths of this project?

**Answer:**
1. **Full-Stack Implementation**: Shows both frontend and backend skills
2. **Production-Ready**: Includes security, testing, monitoring
3. **DevOps Excellence**: Docker, Terraform, Kubernetes, Jenkins
4. **Clean Architecture**: Separation of concerns, proper layering
5. **Security Focus**: Custom JWT, password hashing, XSS prevention
6. **Scalability**: Stateless backend, horizontal scaling, caching ready
7. **Well-Tested**: Backend tests (pytest), frontend tests (Jest)
8. **Infrastructure-as-Code**: Terraform for reproducible deployment
9. **Monitoring**: Prometheus/Grafana for production visibility
10. **Documentation**: Code is well-commented

---

### Q77: What would you improve in this project?

**Answer:**
1. **Database**: Move from SQLite to PostgreSQL for production
2. **Async Frontend**: Use React/Vue instead of vanilla JS for better UX
3. **API Documentation**: Add OpenAPI/Swagger annotations
4. **Caching Layer**: Add Redis for performance
5. **Message Queue**: Add Celery for background jobs
6. **Email Service**: Integrate email for notifications
7. **File Storage**: S3 for user uploads instead of local storage
8. **Analytics**: Track user behavior, feature usage
9. **Mobile App**: React Native for iOS/Android
10. **CI/CD**: GitHub Actions instead of Jenkins for simpler setup

---

### Q78: How would you scale this application to 1M users?

**Answer:**
```
Architecture Changes:

1. Database
   ├─ PostgreSQL with read replicas
   ├─ Sharding by user_id (distribute data)
   ├─ Read-only secondary DB for reporting
   └─ Automated backups

2. Backend
   ├─ Kubernetes cluster (auto-scaling)
   ├─ Load balancer distributing traffic
   ├─ Multiple instances handling requests
   └─ Service mesh (Istio) for traffic management

3. Caching
   ├─ Redis cluster for session cache
   ├─ CDN for static assets
   └─ Elasticsearch for search

4. Message Queue
   ├─ RabbitMQ/Kafka for async tasks
   ├─ Background workers (Celery)
   └─ Event streaming

5. Monitoring
   ├─ Prometheus + Grafana
   ├─ ELK stack for logging
   ├─ Distributed tracing (Jaeger)
   └─ Alert system (PagerDuty)

6. Frontend
   ├─ React for better UX
   ├─ Service workers for offline support
   ├─ CDN for static content
   └─ Web sockets for real-time updates

Estimated Infrastructure:
├─ API Servers: 50-100 pods
├─ Database: Master + 3 read replicas
├─ Cache: Redis cluster (10+ nodes)
├─ Message Queue: RabbitMQ cluster
└─ Monitoring: Dedicated cluster

Cost: ~$50k-100k/month AWS infrastructure
```

---

### Q79: Describe your experience with containerization and orchestration.

**Answer:**
This project demonstrates:

1. **Docker**: 
   - Wrote Dockerfiles for backend (Python + FastAPI)
   - Multi-stage builds for optimization
   - Container networking with Docker Compose
   - Volume management for persistence

2. **Docker Compose**:
   - Orchestrated 2 services (backend + frontend)
   - Defined networking between services
   - Environment variable management
   - Health checks and dependencies

3. **Kubernetes (Basics)**:
   - Deployments with replicas and rolling updates
   - Services for internal/external networking
   - ConfigMaps and Secrets for configuration
   - Persistent Volumes for databases
   - Horizontal Pod Autoscaling based on metrics
   - Ingress for HTTP routing
   - Namespace isolation

4. **Ready for Production**:
   - Liveness/readiness probes
   - Resource requests/limits
   - Automated scaling
   - Zero-downtime deployments

---

### Q80: How do you approach learning new technologies?

**Answer:**
Using this project as example:

1. **Research** (understand the why)
   - Why FastAPI over Flask? 
   - Why Kubernetes over Docker Compose?
   - Why Terraform for infrastructure?

2. **Learn by Doing**
   - Build small prototypes
   - Read official documentation
   - Study existing implementations
   - Experiment in safe environment

3. **Apply Best Practices**
   - Security (JWT, password hashing)
   - Testing (pytest, Jest)
   - Clean code (separation of concerns)
   - Documentation (README, comments)

4. **Continuous Improvement**
   - Code reviews
   - Monitoring in production
   - User feedback
   - Performance optimization

---

### Q81-Q120: Quick Fire Questions

**Q81**: What's the difference between authentication and authorization?
**A**: Authentication verifies WHO you are (login). Authorization determines WHAT you can do (permissions).

**Q82**: Explain CORS and why it's needed.
**A**: CORS (Cross-Origin Resource Sharing) allows browsers to make requests to different domains safely. Required because browsers enforce same-origin policy for security.

**Q83**: What's the purpose of JWT tokens?
**A**: Stateless authentication. Token contains user info; no server-side session needed. Scalable across multiple servers.

**Q84**: How do you handle database transactions?
**A**: Use `db.commit()` for success or `db.rollback()` for failure. SQLAlchemy handles atomicity automatically.

**Q85**: What are dependency injection benefits?
**A**: Easier testing (mock dependencies), cleaner code, reusability, decoupling components.

**Q86**: Explain N+1 query problem.
**A**: Loading parent, then for each parent, loading children = N+1 queries. Fix: use `join()` or `eager loading`.

**Q87**: How do you optimize database queries?
**A**: Add indexes on frequently searched columns, use pagination, avoid N+1 queries, monitor slow queries.

**Q88**: What's the difference between imperative and declarative code?
**A**: Imperative: HOW to do it (step by step). Declarative: WHAT you want (describe result).

**Q89**: Explain the concept of idempotency.
**A**: Operation produces same result regardless of how many times executed. Important for reliability (retries).

**Q90**: How do you prevent race conditions?
**A**: Use database locks, atomic operations, transaction isolation levels, or distributed locks (Redis).

**Q91**: What's microservices architecture?
**A**: Break application into small, independent services. Each service: separate database, deployed independently, scaled separately.

**Q92**: When would you use microservices vs monolith?
**A**: Monolith: Small teams, simple apps. Microservices: Large teams, complex domain, independent scaling needed.

**Q93**: Explain eventual consistency.
**A**: Distributed systems don't always have fresh data immediately, but will eventually be consistent. Trade-off for availability.

**Q94**: How do you handle failures in distributed systems?
**A**: Circuit breakers, retries with backoff, timeouts, fallbacks, monitoring/alerting.

**Q95**: What's the CAP theorem?
**A**: Can't have Consistency, Availability, Partition tolerance simultaneously. Choose 2 of 3.

**Q96**: How do you implement graceful shutdown?
**A**: Listen for SIGTERM, finish in-flight requests, close connections, then exit. Docker sends SIGTERM before killing container.

**Q97**: Explain blue-green deployment.
**A**: Run two identical environments (blue, green). Deploy to inactive one, test, switch traffic. Instant rollback if needed.

**Q98**: What's canary deployment?
**A**: Deploy to small % of users first, monitor, gradually increase. Catch bugs before full rollout.

**Q99**: How do you implement feature flags?
**A**: Configuration flag toggles feature on/off. Deploy code, then toggle feature without redeploying.

**Q100**: What's your approach to technical debt?
**A**: Identify critical tech debt, refactor incrementally, balance new features with code quality, use code reviews to prevent new debt.

**Q101**: How do you debug production issues?
**A**: Check logs, monitor metrics, reproduce locally, isolate component, fix, test, deploy, monitor.

**Q102**: What's the most important thing you learned from this project?
**A**: Full-stack development requires understanding every layer (frontend, backend, database, DevOps, security, testing). Communication between components critical.

**Q103**: How would you approach interviewing at a company?
**A**: Research company, understand role, ask good questions, show problem-solving skills, discuss trade-offs, explain your reasoning.

**Q104**: Tell me about a challenge you overcame.
**A**: [Personalize based on actual experience] Implemented custom JWT instead of using library - learned security details, understood token verification.

**Q105**: Why do you want this job?
**A**: Passionate about building scalable systems, enjoy learning new technologies, value clean code and good testing practices.

**Q106**: What's your biggest weakness?
**A**: [Honest + working to improve] Sometimes over-engineer simple solutions. Working to balance simplicity with extensibility.

**Q107**: Where do you see yourself in 5 years?
**A**: Senior engineer or tech lead. Want to architect large systems, mentor juniors, make architectural decisions.

**Q108**: How do you stay updated with technology?
**A**: Read blogs (Dev.to, Medium), follow GitHub trending, take online courses, build side projects, participate in open source.

**Q109**: Tell me about a project you're proud of.
**A**: [This TaskFlow project!] Full-stack implementation with production-ready security, testing, DevOps. Shows range of skills.

**Q110**: How do you handle disagreement with a team member?
**A**: Listen to their perspective, discuss trade-offs objectively, check documentation/benchmarks, escalate if needed, focus on best outcome for project.

---

## Final Summary

**This TaskFlow project demonstrates:**
- ✅ Full-stack development capability
- ✅ Production-ready security implementation
- ✅ DevOps and infrastructure knowledge
- ✅ Clean code and architecture
- ✅ Testing mindset (backend + frontend)
- ✅ Scalability consideration
- ✅ Problem-solving skills
- ✅ Documentation and communication

**Use this project to:**
1. Explain each component confidently
2. Discuss trade-offs and design decisions
3. Answer "How would you improve?" questions
4. Demonstrate problem-solving ability
5. Show full development cycle understanding

**Good luck with your interviews! 🚀**
