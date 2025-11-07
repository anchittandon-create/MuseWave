#!/bin/bash

# MuseForge Pro - Quick Setup Script
# This script automates the setup of all required dependencies

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║  🎵  MuseForge Pro - Auto Setup  🎵                      ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
else
    OS="unknown"
fi

echo "📋 Detected OS: $OS"
echo ""

# Step 1: Install system dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Installing system dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$OS" == "macos" ]; then
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Please install from https://brew.sh"
        exit 1
    fi
    
    echo "Installing FFmpeg, FluidSynth, Python..."
    brew install ffmpeg fluidsynth python@3.11
    
elif [ "$OS" == "linux" ]; then
    echo "Installing FFmpeg, FluidSynth, Python..."
    sudo apt-get update
    sudo apt-get install -y ffmpeg fluidsynth python3 python3-pip python3-venv
    
else
    echo "⚠️  Unsupported OS. Please install manually:"
    echo "   - FFmpeg"
    echo "   - FluidSynth"
    echo "   - Python 3.10+"
    exit 1
fi

echo "✅ System dependencies installed"
echo ""

# Step 2: Download SoundFont
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Downloading SoundFont..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p assets

if [ ! -f "assets/GeneralUser.sf2" ]; then
    echo "Downloading GeneralUser GS SoundFont (~30MB)..."
    wget https://schristiancollins.com/GeneralUser_GS_1.471.sf2 -O assets/GeneralUser.sf2
    echo "✅ SoundFont downloaded"
else
    echo "✅ SoundFont already exists"
fi

echo ""

# Step 3: Setup Python virtual environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Setting up Python environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing Python packages (this may take 5-10 minutes)..."
echo "  - riffusion (text-to-audio diffusion)"
echo "  - magenta (MIDI generation)"
echo "  - TTS (Coqui text-to-speech)"
echo "  - torch (PyTorch)"

pip install riffusion magenta TTS torch torchvision

echo "✅ Python environment ready"
echo ""

# Step 4: Install Node dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Installing Node.js dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

echo "Running npm install..."
npm install

echo "✅ Node dependencies installed"
echo ""

# Step 5: Configure environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Configuring environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example.opensource .env
    
    # Generate random AUTH_SECRET
    AUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    # Update .env with paths
    if [ "$OS" == "macos" ]; then
        sed -i '' "s|PYTHON_BIN=python3|PYTHON_BIN=$(pwd)/venv/bin/python3|g" .env
        sed -i '' "s|SOUND_FONT_PATH=./assets/GeneralUser.sf2|SOUND_FONT_PATH=$(pwd)/assets/GeneralUser.sf2|g" .env
        sed -i '' "s|AUTH_SECRET=change-this-to-secure-random-string-min-8-chars|AUTH_SECRET=$AUTH_SECRET|g" .env
    else
        sed -i "s|PYTHON_BIN=python3|PYTHON_BIN=$(pwd)/venv/bin/python3|g" .env
        sed -i "s|SOUND_FONT_PATH=./assets/GeneralUser.sf2|SOUND_FONT_PATH=$(pwd)/assets/GeneralUser.sf2|g" .env
        sed -i "s|AUTH_SECRET=change-this-to-secure-random-string-min-8-chars|AUTH_SECRET=$AUTH_SECRET|g" .env
    fi
    
    echo "✅ Environment configured"
else
    echo "✅ .env file already exists"
fi

echo ""

# Step 6: Verify installation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Verifying installation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Checking Python packages..."
source venv/bin/activate

python3 -c "import riffusion; print('  ✅ Riffusion')" || echo "  ❌ Riffusion failed"
python3 -c "import magenta; print('  ✅ Magenta')" || echo "  ❌ Magenta failed"
python3 -c "import TTS; print('  ✅ Coqui TTS')" || echo "  ❌ Coqui TTS failed"

echo "Checking system binaries..."
ffmpeg -version > /dev/null 2>&1 && echo "  ✅ FFmpeg" || echo "  ❌ FFmpeg failed"
fluidsynth --version > /dev/null 2>&1 && echo "  ✅ FluidSynth" || echo "  ❌ FluidSynth failed"

echo ""

# Done!
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║  ✅  Setup Complete!  ✅                                  ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 To start the server:"
echo ""
echo "   source venv/bin/activate"
echo "   npm run dev"
echo ""
echo "   Server will run on: http://localhost:4000"
echo ""
echo "📚 Next steps:"
echo "   1. Read SETUP_MODELS.md for detailed docs"
echo "   2. Test with: curl -X POST http://localhost:4000/api/generate ..."
echo "   3. Check /health endpoint for dependency status"
echo ""
