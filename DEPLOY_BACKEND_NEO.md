# Deploy Backend-Neo to Vercel

## Quick Fix: Deploy Your Backend

Your frontend is deployed but trying to connect to a backend that doesn't exist yet!

### Step 1: Deploy Backend-Neo

```bash
cd backend-neo
vercel --prod
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name?** → `musewave-backend-neo` (or your choice)
- **Directory?** → `./` (current)
- **Override settings?** → No

**Copy the deployment URL** (e.g., `https://musewave-backend-neo.vercel.app`)

### Step 2: Add Backend URL to Frontend

Go to your **frontend** Vercel project:

1. **Vercel Dashboard** → Your MuseWave project
2. **Settings** → **Environment Variables**
3. **Add New**:
   ```
   Name: VITE_BACKEND_NEO_URL
   Value: https://musewave-backend-neo.vercel.app
   ```
4. **Redeploy** the frontend (Settings → Deployments → Latest → ⋯ → Redeploy)

### Step 3: Add Required Environment Variables to Backend

In your **backend-neo** Vercel project, add these environment variables:

```bash
# Required for AI features
GEMINI_API_KEY=your_gemini_api_key_here

# Required for authentication
DEFAULT_API_KEY=your-api-key-here

# Required for MusicGen
REPLICATE_API_TOKEN=your_replicate_token_here

# Database (Vercel will auto-add if using Vercel Postgres)
DATABASE_URL=your_database_url
```

---

## Alternative: Quick Test with Local Backend

Want to test immediately? Run backend locally:

```bash
# Terminal 1: Backend
cd backend-neo
npm install
npm start  # Should start on http://localhost:3002

# Terminal 2: Frontend with local backend
cd ..
VITE_BACKEND_NEO_URL=http://localhost:3002 npm run dev
```

---

## Verification Checklist

After deployment:

- [ ] Backend deployed: `curl https://your-backend.vercel.app/health`
- [ ] Frontend has `VITE_BACKEND_NEO_URL` set in Vercel
- [ ] Frontend redeployed after adding env var
- [ ] Test generation: Open frontend, try creating a song

---

## Troubleshooting

**"Backend URL not configured"** → Frontend missing `VITE_BACKEND_NEO_URL`
**"Network Error"** → Backend URL wrong or backend not deployed
**"API Key required"** → Backend missing `DEFAULT_API_KEY`
**"Gemini API error"** → Backend missing `GEMINI_API_KEY`

---

## What's Happening?

Your app architecture:
```
Frontend (Vercel) ──VITE_BACKEND_NEO_URL──> Backend-Neo (Vercel)
                                             │
                                             ├─> Gemini AI
                                             ├─> Replicate (MusicGen)
                                             └─> Database
```

Both need to be deployed separately, then connected via environment variable.
