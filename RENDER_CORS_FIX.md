# 🔧 CORS Error - FIXED!

## What Was Wrong

**Frontend** (`https://taskforge-fontend.onrender.com`) was trying to reach:
- ❌ `http://localhost:8000` (doesn't exist on internet)
- ❌ No CORS headers from backend

**Should reach**:
- ✅ `https://taskflow-backend.onrender.com` (actual backend URL)
- ✅ With CORS headers allowing the frontend origin

---

## What I Fixed

### 1. Frontend Configuration (config.js)
**Updated** to auto-detect environment:
- ✅ On Render → Use `https://taskflow-backend.onrender.com`
- ✅ On localhost → Use `http://localhost:8000`
- ✅ Custom domain → Auto-detect

### 2. API Client (api.js)
**Updated** to use intelligent API URL detection instead of hardcoded localhost

---

## What You Need to Do on Render

### CRITICAL: Update Backend CORS Environment Variable

1. **Go to**: https://render.com/dashboard
2. **Click**: `taskflow-backend` service
3. **Click**: **Settings** tab
4. **Find**: Environment Variables
5. **Edit**: `CORS_ORIGINS` variable

**Current value** (wrong):
```
http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080
```

**Change to** (correct):
```
https://taskflow-backend.onrender.com,https://taskforge-fontend.onrender.com
```

⚠️ **Note**: Your frontend URL has a typo: `taskforge-fontend` (should be `frontend`)
- Is this intentional? If not, you may need to redeploy the frontend with correct name.
- For now, use: `https://taskforge-fontend.onrender.com`

### Save & Redeploy

6. **Click**: Save
7. **Scroll down** and click: **"Clear build cache & deploy"**
8. **Wait** for logs to show: "Service is live" ✅

---

## Step-by-Step After Fix

### Step 1: Commit Frontend Changes
```powershell
cd C:\Users\PradeepMK\Desktop\TASKMANAGER-main
git add app/frontend/config.js app/frontend/src/api.js
git commit -m "Fix: Auto-detect API URL based on environment (Render vs localhost)"
git push origin main
```

### Step 2: Frontend Will Auto-Redeploy
Since you have auto-deploy enabled, the changes should deploy automatically.

### Step 3: Update Backend CORS on Render
```
CORS_ORIGINS = https://taskflow-backend.onrender.com,https://taskforge-fontend.onrender.com
```

### Step 4: Backend Redeploy
Click "Clear build cache & deploy" on backend service.

### Step 5: Test
```
https://taskforge-fontend.onrender.com
```

Try to register → Should work now ✅

---

## What the Fix Does

### config.js
Runs once when page loads and sets the correct API URL:
```javascript
// On Render
window.TASKFLOW_API_URL = "https://taskflow-backend.onrender.com/api/v1"

// On localhost
window.TASKFLOW_API_URL = "http://localhost:8000/api/v1"
```

### api.js
Uses the configured URL instead of hardcoded localhost:
```javascript
const apiUrl = window.TASKFLOW_API_URL // Gets value from config.js
```

### Backend CORS
Allows requests from the frontend origin:
```
Access-Control-Allow-Origin: https://taskforge-fontend.onrender.com
```

---

## Testing the Fix

### Before Fix ❌
```
Frontend tries: http://localhost:8000
CORS error: No Access-Control-Allow-Origin header
```

### After Fix ✅
```
Frontend uses: https://taskflow-backend.onrender.com
Backend allows: https://taskforge-fontend.onrender.com
Response includes: Access-Control-Allow-Origin header
✅ Works!
```

---

## Files Changed

| File | Change |
|------|--------|
| `config.js` | Auto-detect API URL based on hostname |
| `api.js` | Use auto-detected URL instead of hardcoded localhost |
| Backend CORS | ⏳ **YOU update this on Render** |

---

## Important Notes

### Frontend URL Typo
Your frontend is at: `https://taskforge-fontend.onrender.com`

This has `fontend` instead of `frontend`. Is this intentional?
- If you need to fix it, redeploy frontend with correct name

### CORS Header
The error you saw:
```
No 'Access-Control-Allow-Origin' header is present on the requested resource
```

This happens when:
1. ❌ Frontend origin not in CORS_ORIGINS list
2. ❌ Frontend calls wrong URL (localhost instead of backend)

Both are now fixed!

---

## Quick Checklist

- [ ] Committed frontend changes
- [ ] Frontend auto-redeployed (check logs)
- [ ] Updated CORS_ORIGINS on backend with:
  ```
  https://taskflow-backend.onrender.com,https://taskforge-fontend.onrender.com
  ```
- [ ] Clicked "Clear build cache & deploy" on backend
- [ ] Backend service shows "Live"
- [ ] Tested: `/health` endpoint works
- [ ] Tested: Frontend registration works
- [ ] Tasks save and persist

---

## If It Still Doesn't Work

### Check 1: Frontend is using correct URL
```
Open DevTools (F12) → Console
Type: window.TASKFLOW_API_URL
Should show: https://taskflow-backend.onrender.com/api/v1
```

### Check 2: Backend CORS is updated
```
Go to Render Dashboard
taskflow-backend → Settings → Environment
Look for CORS_ORIGINS
Should include: https://taskforge-fontend.onrender.com
```

### Check 3: Backend redeployed
```
Check backend Logs tab
Should show: Service is live
Rebuild time should be recent (last 5 min)
```

### Check 4: Network Request
```
Open DevTools (F12) → Network tab
Try to register
Look for POST request to /auth/register
Should show Status: 200 or 201 (not 0 or blocked)
Look for: Access-Control-Allow-Origin header in response
```

---

## Support

Read: `RENDER_CORS_FIX.md` (this file) for detailed explanation

Need help? Check the logs in Render dashboard for specific error messages.

---

**Go push your changes and update Render CORS now!** 🚀
