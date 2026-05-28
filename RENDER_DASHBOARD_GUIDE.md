# Render Dashboard - Step-by-Step Screenshots (Text Guide)

## EXACT STEPS TO FIX PYTHON VERSION

### Step 1: Go to Render Dashboard
**URL**: https://render.com/dashboard

You should see your services listed.

---

### Step 2: Click Your Backend Service
Find in the list: `taskflow-backend`

**Click on it** → Service details page opens

---

### Step 3: Go to Settings
**Look for tabs at top**: Dashboard | Logs | Events | Settings

**Click**: **"Settings"** tab

---

### Step 4: Find Environment Variables Section
**Scroll down** until you find:
- **"Environment"** heading
- Or **"Environment Variables"** section
- You'll see existing variables like: `PYTHONUNBUFFERED`, `SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`

---

### Step 5: Add New Environment Variable
**Click button**: **"Add Environment Variable"** (or **"+ Add Variable"**)

**Two input fields appear:**

**FIELD 1 - Key:**
```
PYTHON_VERSION
```

**FIELD 2 - Value:**
```
3.11.9
```

**Click**: **"Save"** or **"Add"** button

---

### Step 6: Verify Variable Was Added
Scroll back up in the Environment section.

You should now see in the list:
```
PYTHON_VERSION = 3.11.9
```

---

### Step 7: CRITICAL - Clear Build Cache & Deploy
**Scroll down** to bottom of Settings page.

Find: **"Deploy"** section or **"Clear Cache"** button

You'll see button that says:
```
"Clear build cache & deploy"
```

**Click it** ⚠️ THIS IS CRITICAL

---

### Step 8: Confirm Action
Dialog might appear asking: "Are you sure?"

**Click**: **"Clear cache and deploy"** (confirm)

Build starts immediately.

---

### Step 9: Monitor the Logs
**Click**: **"Logs"** tab

Watch the real-time build output.

**Look for**:
```
Python 3.11.9          ← Want to see this
Successfully installed fastapi-0.109.0 uvicorn-0.27.0 sqlalchemy-2.0.25 pydantic-2.6.3
✓ Build succeeded
Service is live ✅
```

**NOT**:
```
python3.14             ← Bad, old version
error: maturin failed  ← Bad, Rust compilation error
```

---

### Step 10: Wait for Status: Live
Build typically takes 2-3 minutes.

When you see: **"Service is live"** ✅

Your backend is successfully deployed!

---

### Step 11: Test the Deployment
Open browser and visit:
```
https://taskflow-backend.onrender.com/health
```

**Expected response:**
```
"OK"
```

---

## What If It Still Shows python3.14?

### Issue: Environment variable didn't save
**Fix**:
1. Go back to Settings
2. Check if `PYTHON_VERSION=3.11.9` is there
3. If not, add it again
4. Click Save
5. Refresh page to confirm

### Issue: Did you click "Clear build cache & deploy"?
**Fix**:
1. You MUST click this button
2. It's not the same as just "Deploy"
3. Look for "Clear" keyword in button text

### Issue: Logs still showing python3.14
**Fix**:
1. Wait a bit longer - sometimes takes 30 seconds
2. Refresh the Logs tab (F5)
3. Scroll to TOP of logs to see Python version line

---

## Success Criteria

When deployment succeeds, you'll see ALL of these:

- ✅ Logs show: `Python 3.11.9`
- ✅ Logs show: `Successfully installed pydantic-2.6.3`
- ✅ NO Rust errors (no `maturin failed`)
- ✅ Status shows: **Live**
- ✅ https://taskflow-backend.onrender.com/health returns `"OK"`

---

## You're Almost There! 🚀

Just need to:
1. ✅ Go to Render Dashboard
2. ✅ Add PYTHON_VERSION=3.11.9 environment variable
3. ✅ Click "Clear build cache & deploy"
4. ✅ Wait and watch logs
5. ✅ Test the health endpoint

**That's it! Then your app goes live!** 🎉
