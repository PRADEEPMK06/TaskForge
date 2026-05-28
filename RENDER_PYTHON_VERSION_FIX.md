# CRITICAL: Fix Python Version on Render

## Current Problem
Render is using Python 3.14 (doesn't exist) instead of 3.11.9, causing `pydantic-core` compilation failures.

**Evidence from logs:**
```
/opt/render/project/src/.venv/bin/python3.14  ❌ WRONG!
```

Should be:
```
/opt/render/project/src/.venv/bin/python3.11  ✅ CORRECT
```

---

## Solution: Set Python Version Explicitly on Render

### Step 1: Go to Render Dashboard
https://render.com/dashboard

### Step 2: Open Backend Service Settings
1. Click: `taskflow-backend` service
2. Click: **"Settings"** (top right area)
3. Find: **"Environment"** section

### Step 3: Add Python Version Environment Variable
Look for "Environment Variables" section

**Click**: "Add Variable"

| Field | Value |
|-------|-------|
| Key | `PYTHON_VERSION` |
| Value | `3.11.9` |

**Click**: "Save"

---

## Step 4: CRITICAL - Clear Build Cache & Deploy

1. **Still in Settings**, find **"Deploy"** section at bottom
2. Click: **"Clear build cache & deploy"** button

⚠️ **THIS STEP IS CRITICAL** - without it, old Python 3.14 cache will be used!

---

## Step 5: Monitor Logs

1. Go to **"Logs"** tab
2. Watch for these messages:

### ✅ SUCCESS (You'll see):
```
Python 3.11.9
Successfully installed fastapi-0.109.0 uvicorn-0.27.0...
pydantic-2.6.3 pydantic-core-2.16.3...
✓ Build succeeded
Service is live ✅
```

### ❌ FAILURE (If still wrong):
```
python3.14
error: failed to create directory
💥 maturin failed
```

---

## Step 6: Verify Success

Once logs show "Service is live", test:

```
https://taskflow-backend.onrender.com/health
```

Expected: `"OK"` response ✅

---

## Why This Works

1. **PYTHON_VERSION env var** - Tells Render explicitly which Python to use
2. **Clear build cache** - Removes old Python 3.14 configuration
3. **Fresh build** - Starts completely fresh with Python 3.11.9
4. **pydantic-core installs** - Pre-built wheels available for Python 3.11.9

---

## Files Status

✅ **runtime.txt** - Already created and pushed
✅ **requirements.txt** - Already fixed with wheel versions
⏳ **PYTHON_VERSION env var** - YOU ADD THIS IN RENDER DASHBOARD
⏳ **Clear build cache** - YOU CLICK THIS IN RENDER DASHBOARD

---

## Quick Reference: What To Do in Render

```
1. Click taskflow-backend service
2. Click Settings
3. Add Environment Variable:
   Key: PYTHON_VERSION
   Value: 3.11.9
4. Click Save
5. Find "Clear build cache & deploy" button
6. Click it
7. Watch Logs tab
8. Wait for "Service is live"
9. Test: https://taskflow-backend.onrender.com/health
```

---

## If It Still Fails

Check these:
1. **Environment Variable saved?** → Refresh page and verify it's there
2. **Clicked "Clear build cache & deploy"?** → Must click this button
3. **Logs showing Python 3.11.9?** → Scroll to top of logs to see Python version
4. **Requirements.txt pushed?** → Must have pydantic==2.6.3 (with .11 wheels)

---

**GO TO RENDER DASHBOARD NOW AND ADD THE ENVIRONMENT VARIABLE!** 🚀
