#!/bin/bash
#
# MuseWave Dependency Setup Script
# Installs and configures all required tools for audio/video generation
#
# Usage: bash setup_dependencies.sh
#

set -e  # Exit on error

echo "======================================================================"
echo "🎵 MuseWave - Dependency Setup"
echo "======================================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS
OS="$(uname -s)"
echo "📱 Detected OS: $OS"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# 1. Install Homebrew (macOS)
echo "======================================================================"
echo "📦 Step 1: Package Manager"
echo "======================================================================"

if [[ "$OS" == "Darwin" ]]; then
    if ! command_exists brew; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        print_status "Homebrew installed"
    else
        echo "✅ Homebrew already installed"
    fi
elif [[ "$OS" == "Linux" ]]; then
    if ! command_exists apt-get && ! command_exists yum; then
        echo -e "${RED}❌ No supported package manager found${NC}"
        exit 1
    fi
    echo "✅ Package manager found"
fi

echo ""

# 2. Install FFmpeg
echo "======================================================================"
echo "🎬 Step 2: FFmpeg (Audio/Video Processing)"
echo "======================================================================"

if ! command_exists ffmpeg; then
    echo "Installing FFmpeg..."
    if [[ "$OS" == "Darwin" ]]; then
        brew install ffmpeg
    elif command_exists apt-get; then
        sudo apt-get update && sudo apt-get install -y ffmpeg
    elif command_exists yum; then
        sudo yum install -y ffmpeg
    fi
    print_status "FFmpeg installed"
else
    echo "✅ FFmpeg already installed"
    ffmpeg -version | head -n 1
fi

if ! command_exists ffprobe; then
    echo -e "${RED}❌ ffprobe not found (should come with ffmpeg)${NC}"
else
    echo "✅ ffprobe found"
fi

echo ""

# 3. Install FluidSynth
echo "======================================================================"
echo "🎹 Step 3: FluidSynth (MIDI to Audio)"
echo "======================================================================"

if ! command_exists fluidsynth; then
    echo "Installing FluidSynth..."
    if [[ "$OS" == "Darwin" ]]; then
        brew install fluidsynth
    elif command_exists apt-get; then
        sudo apt-get install -y fluidsynth
    elif command_exists yum; then
        sudo yum install -y fluidsynth
    fi
    print_status "FluidSynth installed"
else
    echo "✅ FluidSynth already installed"
    fluidsynth --version | head -n 1
fi

echo ""

# 4. Download SoundFont
echo "======================================================================"
echo "🎼 Step 4: SoundFont Files"
echo "======================================================================"

SOUNDFONT_DIR="/usr/local/share/soundfonts"
SOUNDFONT_FILE="$SOUNDFONT_DIR/GeneralUser.sf2"

if [ ! -f "$SOUNDFONT_FILE" ]; then
    echo "Downloading GeneralUser soundfont..."
    sudo mkdir -p "$SOUNDFONT_DIR"
    
    # Try multiple sources
    if curl -L "https://schristiancollins.com/generaluser/GeneralUser_GS_v1.471.zip" -o /tmp/soundfont.zip; then
        sudo unzip -o /tmp/soundfont.zip -d "$SOUNDFONT_DIR"
        sudo mv "$SOUNDFONT_DIR/GeneralUser GS v1.471/GeneralUser GS v1.471.sf2" "$SOUNDFONT_FILE" 2>/dev/null || true
        rm /tmp/soundfont.zip
        print_status "SoundFont downloaded"
    else
        echo -e "${YELLOW}⚠️  Failed to download soundfont from primary source${NC}"
        echo "   Please manually download from:"
        echo "   https://schristiancollins.com/generaluser.php"
        echo "   And place it at: $SOUNDFONT_FILE"
    fi
else
    echo "✅ SoundFont already exists: $SOUNDFONT_FILE"
    ls -lh "$SOUNDFONT_FILE"
fi

echo ""

# 5. Install Python dependencies
echo "======================================================================"
echo "🐍 Step 5: Python Dependencies"
echo "======================================================================"

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.8 or higher${NC}"
    exit 1
else
    echo "✅ Python found: $(python3 --version)"
fi

if ! command_exists pip3; then
    echo "Installing pip..."
    python3 -m ensurepip --upgrade
    print_status "pip installed"
else
    echo "✅ pip found"
fi

echo ""
echo "Installing Python packages..."
echo ""

# Core dependencies
pip3 install --upgrade pip setuptools wheel

# Install MIDIUtil (for fallback MIDI generation)
echo "- Installing MIDIUtil..."
pip3 install MIDIUtil
print_status "MIDIUtil installed"

# Install Magenta (optional, for advanced melody generation)
echo ""
echo "- Installing Magenta (optional, may take a while)..."
if pip3 install magenta==2.1.3; then
    print_status "Magenta installed"
    
    # Download Magenta models
    MAGENTA_DIR="/usr/local/share/magenta_models"
    MODEL_FILE="$MAGENTA_DIR/attention_rnn.mag"
    
    if [ ! -f "$MODEL_FILE" ]; then
        echo "  Downloading Magenta model..."
        sudo mkdir -p "$MAGENTA_DIR"
        sudo curl -L "https://storage.googleapis.com/magentadata/models/melody_rnn/attention_rnn.mag" \
             -o "$MODEL_FILE"
        print_status "Magenta model downloaded"
    else
        echo "  ✅ Magenta model already exists"
    fi
else
    echo -e "${YELLOW}⚠️  Magenta installation failed (optional)${NC}"
    echo "   Fallback MIDI generation will be used"
fi

# Install Riffusion (optional, for texture generation)
echo ""
echo "- Installing Riffusion (optional)..."
if pip3 install riffusion; then
    print_status "Riffusion installed"
else
    echo -e "${YELLOW}⚠️  Riffusion installation failed (optional)${NC}"
    echo "   Fallback texture generation will be used"
fi

# Install Coqui TTS (for vocals)
echo ""
echo "- Installing Coqui TTS (for vocals)..."
if pip3 install TTS; then
    print_status "Coqui TTS installed"
else
    echo -e "${YELLOW}⚠️  TTS installation failed${NC}"
    echo "   Vocal generation will be disabled"
fi

echo ""

# 6. Verification
echo "======================================================================"
echo "🔍 Step 6: Verification"
echo "======================================================================"
echo ""

echo "Checking core dependencies..."
echo ""

ERRORS=0

# Check FFmpeg
if command_exists ffmpeg && command_exists ffprobe; then
    echo -e "${GREEN}✅ FFmpeg & ffprobe${NC}"
else
    echo -e "${RED}❌ FFmpeg or ffprobe missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check FluidSynth
if command_exists fluidsynth; then
    echo -e "${GREEN}✅ FluidSynth${NC}"
else
    echo -e "${RED}❌ FluidSynth missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check SoundFont
if [ -f "$SOUNDFONT_FILE" ]; then
    echo -e "${GREEN}✅ SoundFont ($SOUNDFONT_FILE)${NC}"
else
    echo -e "${RED}❌ SoundFont missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Python packages
if python3 -c "import midiutil" 2>/dev/null; then
    echo -e "${GREEN}✅ MIDIUtil${NC}"
else
    echo -e "${RED}❌ MIDIUtil missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Optional packages
if python3 -c "import magenta" 2>/dev/null; then
    echo -e "${GREEN}✅ Magenta (optional)${NC}"
else
    echo -e "${YELLOW}⚠️  Magenta not installed (optional)${NC}"
fi

if python3 -c "import riffusion" 2>/dev/null; then
    echo -e "${GREEN}✅ Riffusion (optional)${NC}"
else
    echo -e "${YELLOW}⚠️  Riffusion not installed (optional)${NC}"
fi

if python3 -c "import TTS" 2>/dev/null; then
    echo -e "${GREEN}✅ Coqui TTS (optional)${NC}"
else
    echo -e "${YELLOW}⚠️  Coqui TTS not installed (optional)${NC}"
fi

echo ""

# 7. Test generation
echo "======================================================================"
echo "🧪 Step 7: Test Generation"
echo "======================================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATOR_SCRIPT="$SCRIPT_DIR/generate_media.py"

if [ -f "$GENERATOR_SCRIPT" ]; then
    echo "Testing media generation..."
    echo ""
    
    if python3 "$GENERATOR_SCRIPT" --help > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Generator script is executable${NC}"
        echo ""
        echo "Run a test generation:"
        echo "  python3 $GENERATOR_SCRIPT \"test prompt\""
    else
        echo -e "${RED}❌ Generator script has errors${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Generator script not found at $GENERATOR_SCRIPT${NC}"
fi

echo ""
echo "======================================================================"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Setup Complete! All core dependencies are ready.${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Test generation: python3 backend-complete/scripts/generate_media.py \"dreamy synthwave\""
    echo "   2. Check output in: public/assets/"
    echo ""
else
    echo -e "${RED}❌ Setup completed with $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
    exit 1
fi

echo "======================================================================"
