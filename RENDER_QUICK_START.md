# Render Deployment Checklist & Quick Start

## Quick Reference: Commands to Run

### 1. Initialize Git Repository (if not already done)
```powershell
cd C:\Users\PradeepMK\Desktop\TASKMANAGER-main
git init
git add .
git commit -m "Initial commit - Ready for Render deployment"
```

### 2. Push to GitHub
```powershell
git remote add origin https://github.com/YOUR-USERNAME/TASKMANAGER-main.git
git branch -M main
git push -u origin main
```

### 3. Generate SECRET_KEY for Production
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
Copy this value - you'll need it on Render.

---

## 5-Minute Deployment Summary

### Backend Deployment (3 minutes)
1. Go to render.com → Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Set Name: `taskflow-backend`
5. Set Build Command: `pip install -r app/backend/requirements.txt`
6. Set Start Command: `cd app/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add Environment Variables:
   ```
   PYTHONUNBUFFERED=1
   SECRET_KEY=<paste-generated-key-here>
   DATABASE_URL=sqlite:///./data/taskflow.db
   ACCESS_TOKEN_EXPIRE_MINUTES=720
   CORS_ORIGINS=http://localhost:3000
   ```
8. Click "Create Web Service"
9. Wait for deployment (status: Building → Deploying → Live)

### Frontend Deployment (2 minutes)
1. Click "New +" → "Static Site"
2. Connect same GitHub repository
3. Set Name: `taskflow-frontend`
4. Set Publish Directory: `app/frontend`
5. Click "Create Static Site"
6. Get your frontend URL (e.g., https://taskflow-frontend.onrender.com)

### Connect Services (1 minute)
1. Go back to backend service
2. Go to Settings → Environment Variables
3. Update CORS_ORIGINS:
   ```
   CORS_ORIGINS=http://localhost:3000,https://taskflow-frontend.onrender.com
   ```
4. Save and redeploy

---

## Deployment Checklist

### Pre-Deployment
- [ ] GitHub account created
- [ ] Project pushed to GitHub
- [ ] Render account created (render.com)
- [ ] GitHub connected to Render
- [ ] SECRET_KEY generated

### Backend Deployment
- [ ] Web Service created on Render
- [ ] GitHub repo connected
- [ ] Build command configured correctly
- [ ] Start command configured correctly
- [ ] Environment variables added:
  - [ ] PYTHONUNBUFFERED=1
  - [ ] SECRET_KEY (strong random value)
  - [ ] DATABASE_URL
  - [ ] ACCESS_TOKEN_EXPIRE_MINUTES
  - [ ] CORS_ORIGINS
- [ ] Service deployed successfully
- [ ] Backend URL obtained (e.g., https://taskflow-backend.onrender.com)
- [ ] Health check passes: /health
- [ ] API docs accessible: /docs

### Frontend Deployment
- [ ] Static Site created on Render
- [ ] GitHub repo connected
- [ ] Publish Directory set to `app/frontend`
- [ ] Site deployed successfully
- [ ] Frontend URL obtained (e.g., https://taskflow-frontend.onrender.com)

### Post-Deployment
- [ ] Backend CORS updated with frontend URL
- [ ] Frontend can reach backend (no CORS errors)
- [ ] Can create user account
- [ ] Can create tasks
- [ ] Tasks persist after page reload

---

## Environment Variables Reference

### Backend Required Variables

| Variable | Example Value | Notes |
|----------|---------------|-------|
| PYTHONUNBUFFERED | 1 | Ensures Python output is not buffered |
| SECRET_KEY | Generated value | Use: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| DATABASE_URL | sqlite:///./data/taskflow.db | For SQLite; use postgresql://... for PostgreSQL |
| ACCESS_TOKEN_EXPIRE_MINUTES | 720 | Token expiration in minutes |
| CORS_ORIGINS | https://taskflow-frontend.onrender.com | Update after frontend is deployed |

### Optional: Production Variables

| Variable | Example Value | Notes |
|----------|---------------|-------|
| RENDER | true | Set by Render automatically |
| FRONTEND_URL | https://taskflow-frontend.onrender.com | For referencing frontend from backend |

---

## Troubleshooting Quick Fixes

### Backend won't deploy
1. Check Logs tab on Render
2. Look for "No such file or directory" errors
3. Verify paths: should be `app/backend/...`
4. Check `requirements.txt` for missing dependencies

### Frontend shows blank page
1. Check browser console (F12)
2. Look for 404 errors on index.html
3. Verify Publish Directory is `app/frontend`
4. Check if all HTML/CSS/JS files are in that directory

### CORS errors in frontend
1. Update backend's CORS_ORIGINS environment variable
2. Include: `https://taskflow-frontend.onrender.com`
3. Redeploy backend

### API calls fail
1. Frontend config.js should point to backend URL
2. Check: `https://taskflow-backend.onrender.com` is correct
3. Test manually: visit `https://taskflow-backend.onrender.com/health`
4. Should return "OK"

---

## Testing After Deployment

### Test Backend
```
Visit: https://taskflow-backend.onrender.com/health
Expected response: "OK"

Visit: https://taskflow-backend.onrender.com/docs
Expected: Swagger UI with API documentation
```

### Test Frontend
```
Visit: https://taskflow-frontend.onrender.com
Expected: Task Manager dashboard loads
Check Browser Console (F12): No errors
```

### Test Integration
```
1. Open frontend
2. Create a user account
3. Try to create a task
4. Check Network tab in DevTools (F12)
5. Task creation request should go to backend URL
6. Response should be successful (200 OK)
7. Task should appear in UI
8. Refresh page - task should still be there
```

---

## Next Steps

1. **View Live Logs**: Click service → Logs tab
2. **Monitor Performance**: Dashboard shows uptime and metrics
3. **Auto-Deploy**: Push to GitHub and it redeploys automatically
4. **Scale Up**: Upgrade from Free to Paid plan if needed
5. **Add Domain**: Services → Settings → Add custom domain

---

## Useful Links

- Render Dashboard: https://render.com/dashboard
- Render Docs: https://render.com/docs
- FastAPI Deployment: https://render.com/docs/deploy-fastapi
- PostgreSQL Setup: https://render.com/docs/databases

---

Need help? Check the detailed `RENDER_DEPLOYMENT_GUIDE.md` for complete instructions!
