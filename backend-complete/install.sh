#!/bin/bash

# MuseForge Pro Backend - Quick Install Script
# This script sets up everything you need to run the backend

set -e

echo "🎵 MuseForge Pro Backend - Quick Install"
echo "=========================================="
echo ""

# Check if running from backend-complete directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend-complete directory"
    exit 1
fi

# 1. System dependencies
echo "📦 Step 1/5: Installing system dependencies..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Install from https://brew.sh"
        exit 1
    fi
    brew install ffmpeg fluidsynth python@3.10
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    sudo apt-get update
    sudo apt-get install -y ffmpeg fluidsynth python3.10 python3-pip fluid-soundfont-gm
else
    echo "⚠️  Unsupported OS. Please install ffmpeg, fluidsynth, and python3.10 manually."
    exit 1
fi

# 2. Python virtual environment
echo ""
echo "🐍 Step 2/5: Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel

# 3. Install AI models
echo ""
echo "🤖 Step 3/5: Installing AI models (this may take a few minutes)..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install riffusion magenta TTS soundfile librosa

# 4. Node dependencies
echo ""
echo "📦 Step 4/5: Installing Node.js dependencies..."
npm install

# 5. Configuration
echo ""
echo "⚙️  Step 5/5: Setting up configuration..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file"
else
    echo "⚠️  .env already exists, skipping..."
fi

# Create assets directory
mkdir -p public/assets

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Review .env configuration (optional)"
echo "   2. Start server: npm run dev"
echo "   3. Test generation: npm run test"
echo ""
echo "📚 Documentation: README.md"
echo "🏥 Health check: http://localhost:4000/health"
echo ""
