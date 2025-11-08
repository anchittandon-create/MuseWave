# 🚀 MuseWave - Quick Start Guide

## ✅ You're All Set Up!

Your app is running at: **http://localhost:3001**

---

## 🎵 Current Setup

### Frontend (React + Vite)
- **URL**: http://localhost:3001
- **Status**: ✅ Running
- **Features**: AI-powered form with autosuggestion dropdowns

### Backend (Node.js + Express)
- **URL**: http://localhost:4000
- **Status**: ✅ Running (backend-open)
- **Features**: Music generation, job management, async processing

---

## 📝 Quick Commands

### Start Everything (if not running)

```bash
# Terminal 1 - Backend
cd backend-open
npm run dev

# Terminal 2 - Frontend  
npm run dev
```

### Stop Everything

```bash
# Find and kill processes
lsof -ti:3001 | xargs kill -9  # Frontend
lsof -ti:4000 | xargs kill -9  # Backend
```

---

## 🎨 How to Use

1. **Open Browser**: http://localhost:3001

2. **Fill the Form**:
   - **Music Prompt**: "upbeat electronic dance music"
   - **Genres**: Select from dropdown (e.g., "Electronic", "Dance")
   - **Duration**: Use slider (15 sec to 20 hours)
   - **Languages** (optional): Select vocal languages
   - **Artists** (optional): Add artist inspiration
   - **Lyrics** (optional): Add custom lyrics
   - **Video**: Toggle on/off, select style

3. **Generate**: Click "Generate Music Only" or "Generate Music & Videos"

4. **Wait**: Watch progress bar (30-60 seconds typically)

5. **Download**: Click download buttons when ready

---

## 🔧 Troubleshooting

### "Port 3000 in use"
✅ **This is fine!** Vite automatically uses port 3001 instead.

### "Failed to fetch from backend"
```bash
# Check backend is running
curl http://localhost:4000/health

# If not running, start it:
cd backend-open
npm run dev
```

### "Module not found: lucide-react"
```bash
# Install missing dependency
npm install lucide-react
```

### Frontend won't load
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 🆕 Autosuggestion Feature (Optional - Advanced)

The new **backend-complete** has ML-powered autosuggestion, but requires Python 3.9-3.11.

**Your current Python (3.12)** is too new for some dependencies. You have two options:

### Option 1: Use Current Setup (Recommended)
Your current setup with **backend-open** works perfectly! The form has dropdown selections that work great.

### Option 2: Enable ML Autosuggestion
If you want the ML-powered suggestions:

1. **Install Python 3.11**:
   ```bash
   brew install python@3.11
   ```

2. **Create venv with Python 3.11**:
   ```bash
   cd backend-complete
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Start backend-complete**:
   ```bash
   npm run dev  # Runs on port 4000
   ```

4. **Update frontend** to use port 4000 (already configured)

---

## 📊 What Works Now

✅ Frontend running on http://localhost:3001  
✅ Backend running on http://localhost:4000  
✅ Music generation with all options  
✅ Video generation (3 styles)  
✅ Job management & polling  
✅ Download audio/video files  
✅ Genre/Language/Artist selection  
✅ Custom lyrics support  
✅ Duration from 15 sec to 20 hours  

---

## 🎯 Next Steps

1. **Open browser** → http://localhost:3001
2. **Create your first track** with the form
3. **Experiment** with different genres, durations, styles
4. **Download** your generated music

---

## 📚 Documentation

- **Frontend**: `README.frontend.md`
- **Backend**: `backend-open/README.md`
- **Autosuggestion**: `backend-complete/AUTOSUGGESTION.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`

---

## 💡 Tips

- **Shorter durations** generate faster (30-45 seconds recommended)
- **Video generation** adds ~10-20 seconds to generation time
- **Lyrics** enable vocal synthesis
- **Multiple genres** create interesting fusion styles
- **Artist inspiration** guides the musical style

---

**Enjoy creating music with MuseWave! 🎵✨**
