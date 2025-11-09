# ⚠️ IMPORTANT: Mock Implementations Removed

All mock implementations have been **completely removed** from MuseWave. The app now requires a properly configured backend to work.

## What This Means

**Before:** The app had mock fallbacks. If no backend was configured, it would silently use mock data for development.

**Now:** The app **requires** a real backend. If the backend is not configured, you'll see clear error messages guiding you to fix it.

## Quick Start (Choose One)

### Option A: I Just Want to See It Work Locally

```bash
# Terminal 1: Start backend
cd backend-neo
npm install
npm run dev

# Terminal 2: Start frontend (in new terminal)
cd ..
cp .env.example .env
# Edit .env and set:
# VITE_BACKEND_NEO_URL=http://localhost:3002
# VITE_API_KEY=dev-key-123
npm run check:config  # Verify configuration
npm run dev
```

Open http://localhost:5173 and try generating music!

### Option B: I Want to Deploy to Production

See **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)** for complete deployment instructions.

## Check Your Configuration

Run this anytime to verify your environment is properly configured:

```bash
npm run check:config
```

This will check:
- ✅ VITE_BACKEND_NEO_URL is set
- ✅ VITE_API_KEY is set  
- ⚠️ Whether you're using development keys in production
- ⚠️ Whether optional features (Gemini AI) are configured

## Common Errors

### "Backend URL not configured"

**Fix:** Create a `.env` file with:
```bash
VITE_BACKEND_NEO_URL=http://localhost:3002  # or your production URL
VITE_API_KEY=your-api-key
```

### "Fetch failed: 401 Unauthorized"

**Fix:** Ensure your frontend `VITE_API_KEY` matches the backend's `DEFAULT_API_KEY`

### "Connection refused"

**Fix:** Make sure backend is running:
```bash
cd backend-neo
npm run dev
```

## What Changed

See **[MOCK_REMOVAL.md](./MOCK_REMOVAL.md)** for technical details about what was removed and why.

## Files You Need

### Required
- ✅ `.env` - Must have `VITE_BACKEND_NEO_URL` and `VITE_API_KEY`
- ✅ `backend-neo/` - Must be running (local or deployed)

### Optional
- 📄 `.env` - Add `VITE_GEMINI_API_KEY` for enhanced AI suggestions

## Architecture

```
Frontend (Vite + React)
    ↓ VITE_BACKEND_NEO_URL
Backend-neo (Vercel Serverless)
    ↓ DATABASE_URL
Neon Postgres
```

## Need Help?

1. **Configuration issues:** Run `npm run check:config`
2. **Local development:** See "Option A" above
3. **Production deployment:** See [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)
4. **Understanding changes:** See [MOCK_REMOVAL.md](./MOCK_REMOVAL.md)

---

**Remember:** No mocks = proper backend required. This is a good thing! It forces proper deployment and prevents confusion.
