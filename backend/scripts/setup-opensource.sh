#!/usr/bin/env bash
#
# setup.sh - Complete Setup Script for Open-Source Music Backend
# Installs all dependencies, models, and configuration
#

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎵 Open-Source Music Generation Backend Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detect OS
OS="$(uname -s)"
echo "📊 Detected OS: $OS"
echo ""

# 1. Check Node.js
echo "🔍 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi
echo ""

# 2. Check Python
echo "🔍 Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python installed: $PYTHON_VERSION"
else
    echo "❌ Python not found. Please install Python 3.10+"
    exit 1
fi
echo ""

# 3. Check/Install FFmpeg
echo "🔍 Checking FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n1)
    echo "✅ FFmpeg installed: $FFMPEG_VERSION"
else
    echo "⚠️  FFmpeg not found. Installing..."
    case "$OS" in
        Darwin*)
            brew install ffmpeg
            ;;
        Linux*)
            sudo apt update
            sudo apt install -y ffmpeg
            ;;
        *)
            echo "❌ Unsupported OS. Please install FFmpeg manually."
            exit 1
            ;;
    esac
    echo "✅ FFmpeg installed"
fi
echo ""

# 4. Check/Install FluidSynth
echo "🔍 Checking FluidSynth..."
if command -v fluidsynth &> /dev/null; then
    FLUIDSYNTH_VERSION=$(fluidsynth --version 2>&1 | head -n1)
    echo "✅ FluidSynth installed: $FLUIDSYNTH_VERSION"
else
    echo "⚠️  FluidSynth not found. Installing..."
    case "$OS" in
        Darwin*)
            brew install fluidsynth
            ;;
        Linux*)
            sudo apt update
            sudo apt install -y fluidsynth
            ;;
        *)
            echo "❌ Unsupported OS. Please install FluidSynth manually."
            exit 1
            ;;
    esac
    echo "✅ FluidSynth installed"
fi
echo ""

# 5. Download GeneralUser SoundFont
echo "🎹 Checking SoundFont..."
SOUNDFONT_PATH="./assets/GeneralUser.sf2"
if [ -f "$SOUNDFONT_PATH" ]; then
    echo "✅ SoundFont already exists: $SOUNDFONT_PATH"
else
    echo "⬇️  Downloading GeneralUser SoundFont..."
    mkdir -p assets
    curl -L "https://schristiancollins.com/soundfonts/GeneralUser_GS_1.471/GeneralUser_GS_1.471.zip" -o /tmp/generaluser.zip
    unzip -q /tmp/generaluser.zip -d /tmp/
    mv "/tmp/GeneralUser GS 1.471/GeneralUser GS v1.471.sf2" "$SOUNDFONT_PATH"
    rm -rf /tmp/generaluser.zip "/tmp/GeneralUser GS 1.471"
    echo "✅ SoundFont downloaded: $SOUNDFONT_PATH"
fi
echo ""

# 6. Install Python Dependencies
echo "🐍 Installing Python dependencies..."
cd python
pip3 install -r requirements.txt
echo "✅ Python packages installed"
echo ""

# 7. (Optional) Download Magenta Model
echo "🎼 Checking Magenta model..."
MAGENTA_MODEL="$HOME/.magenta/models/melody_rnn/basic_rnn.mag"
if [ -f "$MAGENTA_MODEL" ]; then
    echo "✅ Magenta model already exists: $MAGENTA_MODEL"
else
    echo "⚠️  Magenta model not found. Would you like to download it? (500MB) [y/N]"
    read -r DOWNLOAD_MAGENTA
    if [[ "$DOWNLOAD_MAGENTA" =~ ^[Yy]$ ]]; then
        echo "⬇️  Downloading Magenta melody_rnn model..."
        mkdir -p "$HOME/.magenta/models/melody_rnn"
        curl -L "https://storage.googleapis.com/magentadata/models/melody_rnn/basic_rnn.mag" \
            -o "$MAGENTA_MODEL"
        echo "✅ Magenta model downloaded"
    else
        echo "⏭️  Skipping Magenta model (fallback will be used)"
    fi
fi
echo ""

# 8. (Optional) Install Heavy Models
echo "🤖 Would you like to install Riffusion? (Requires ~2GB, GPU recommended) [y/N]"
read -r INSTALL_RIFFUSION
if [[ "$INSTALL_RIFFUSION" =~ ^[Yy]$ ]]; then
    echo "⬇️  Installing Riffusion dependencies..."
    pip3 install torch diffusers transformers accelerate
    echo "✅ Riffusion dependencies installed"
else
    echo "⏭️  Skipping Riffusion (fallback will be used)"
fi
echo ""

# 9. Install Node Dependencies
echo "📦 Installing Node.js dependencies..."
cd ..
npm install
echo "✅ Node.js packages installed"
echo ""

# 10. Create Directories
echo "📁 Creating directories..."
mkdir -p public/assets
mkdir -p tmp
echo "✅ Directories created"
echo ""

# 11. Create .env file
echo "⚙️  Creating .env configuration..."
cat > .env << EOF
# Node.js Configuration
PORT=3000
NODE_ENV=development

# Python
PYTHON_PATH=python3

# Paths
ASSETS_DIR=./public/assets
TEMP_DIR=./tmp
SOUNDFONT_PATH=./assets/GeneralUser.sf2

# Optional: Model Paths
# RIFFUSION_MODEL_PATH=riffusion/riffusion-model-v1
# MAGENTA_MODEL_PATH=~/.magenta/models/melody_rnn/basic_rnn.mag
EOF
echo "✅ .env file created"
echo ""

# 12. Test Installation
echo "🧪 Testing installation..."
echo ""

echo "  Testing Python..."
python3 -c "import numpy, soundfile, scipy; print('  ✅ Core packages OK')"

echo "  Testing FFmpeg..."
ffmpeg -version > /dev/null 2>&1 && echo "  ✅ FFmpeg OK"

echo "  Testing FluidSynth..."
fluidsynth --version > /dev/null 2>&1 && echo "  ✅ FluidSynth OK"

echo "  Testing SoundFont..."
[ -f "$SOUNDFONT_PATH" ] && echo "  ✅ SoundFont OK"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "  1. Start development server:"
echo "     npm run dev"
echo ""
echo "  2. Test generation:"
echo "     curl -X POST http://localhost:3000/api/generate-opensource \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"musicPrompt\":\"lofi hip-hop\",\"genres\":[\"lofi\"],\"durationSec\":30}'"
echo ""
echo "  3. Check capabilities:"
echo "     curl http://localhost:3000/api/capabilities"
echo ""
echo "📚 Documentation: ./README_OPENSOURCE.md"
echo ""
