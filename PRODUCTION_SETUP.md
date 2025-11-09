# MuseWave Production Setup Guide

This guide will help you deploy MuseWave with the real backend (backend-neo). **Mock implementations have been removed** - the app now requires a properly configured backend.

## Prerequisites

- Vercel account (for frontend and backend deployment)
- Neon Postgres database (or any Postgres database)
- Google Gemini API key (optional, for AI features)

## Step 1: Deploy Backend (backend-neo)

### 1.1 Create Neon Postgres Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your connection string (format: `postgresql://user:password@host/database`)

### 1.2 Deploy Backend to Vercel

```bash
cd backend-neo
vercel deploy --prod
```

When prompted, set these environment variables:

```bash
# Required
DATABASE_URL=postgresql://user:password@host/database
DEFAULT_API_KEY=your-secure-api-key-here

# Optional (for AI features)
GEMINI_API_KEY=your-gemini-api-key
```

### 1.3 Note Your Backend URL

After deployment, Vercel will give you a URL like:
```
https://your-backend-neo.vercel.app
```

**Save this URL - you'll need it for the frontend!**

## Step 2: Configure Frontend

### 2.1 Create .env File

In the root directory (not in backend-neo):

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
# REQUIRED: Your deployed backend URL
VITE_BACKEND_NEO_URL=https://your-backend-neo.vercel.app

# REQUIRED: Same API key as backend
VITE_API_KEY=your-secure-api-key-here

# OPTIONAL: For AI suggestions
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### 2.2 Deploy Frontend to Vercel

```bash
# From root directory
vercel deploy --prod
```

When prompted in Vercel dashboard, set the same environment variables:
- `VITE_BACKEND_NEO_URL`
- `VITE_API_KEY`
- `VITE_GEMINI_API_KEY` (optional)

## Step 3: Verify Deployment

### 3.1 Test Backend

```bash
curl https://your-backend-neo.vercel.app/api/health
```

Should return: `{"status":"ok"}`

### 3.2 Test Frontend

1. Open your frontend URL
2. Try generating music
3. Check browser console for any errors

**Expected behavior:**
- ✅ Generation starts immediately
- ✅ Progress updates every 2 seconds
- ✅ Audio/video files download correctly

**If you see errors:**
- ❌ "Backend URL not configured" → Check VITE_BACKEND_NEO_URL
- ❌ "Fetch failed: 401" → Check VITE_API_KEY matches backend
- ❌ "Fetch failed: 404" → Backend not deployed correctly

## Local Development Setup

### Terminal 1: Backend
```bash
cd backend-neo
npm install
npm run dev
```
Backend runs on http://localhost:3002

### Terminal 2: Frontend
```bash
# From root directory
npm install
npm run dev
```
Frontend runs on http://localhost:5173

### Local .env
```bash
VITE_BACKEND_NEO_URL=http://localhost:3002
VITE_API_KEY=dev-key-123
```

## Troubleshooting

### Problem: "Backend URL not configured"

**Solution:** Set environment variables in both:
1. `.env` file (for local development)
2. Vercel dashboard (for production)

### Problem: Generation fails with 401 Unauthorized

**Solution:** Ensure `VITE_API_KEY` in frontend matches `DEFAULT_API_KEY` in backend.

### Problem: Backend deployment fails

**Check:**
1. Database URL is correct
2. All required env vars are set
3. Check backend logs: `vercel logs <deployment-url>`

### Problem: Assets not loading (404 errors)

**Solution:** 
1. Check backend asset storage configuration
2. Ensure backend has write permissions
3. For production, configure Cloudflare R2 or S3

## Architecture Overview

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ VITE_BACKEND_NEO_URL
       │
┌──────▼──────┐
│ backend-neo │  ← Vercel Serverless Functions
│  API Server │
└──────┬──────┘
       │ DATABASE_URL
       │
┌──────▼──────┐
│    Neon     │  ← Postgres Database
│  Postgres   │
└─────────────┘
```

## Cost Optimization

### Free Tier Usage
- **Neon Postgres:** 0.5 GB storage (free)
- **Vercel:** 100 GB bandwidth/month (free)
- **Gemini AI:** 15 requests/minute (free tier)

### Tips to Stay Free
1. Enable caching in backend (reduces API calls)
2. Use Gemini Flash 8B model (cheapest)
3. Set rate limits to prevent abuse
4. Monitor usage in Vercel dashboard

## Security Checklist

- [ ] Changed DEFAULT_API_KEY from example value
- [ ] Set strong database password
- [ ] Enabled CORS only for your frontend domain
- [ ] Set rate limits in backend
- [ ] Never commit .env to Git
- [ ] Rotate API keys regularly

## Next Steps

1. **Custom Domain:** Add your domain in Vercel dashboard
2. **Analytics:** Add Vercel Analytics to track usage
3. **Monitoring:** Set up Sentry or LogRocket for error tracking
4. **CDN:** Configure Cloudflare R2 for better asset delivery

## Support

If you encounter issues:
1. Check browser console logs
2. Check Vercel deployment logs
3. Check backend logs: `vercel logs --follow`
4. Review this guide step-by-step

---

**Remember:** Mock implementations have been removed. The app **requires** a properly configured backend to work.
