#!/bin/bash

# MuseForge Pro - Test Script
# Verifies all components are working correctly

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║  🧪  MuseForge Pro - System Test  🧪                     ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0

# Helper function
test_command() {
    local name=$1
    local command=$2
    
    echo -n "Testing $name... "
    if eval "$command" > /dev/null 2>&1; then
        echo "✅ PASS"
        ((PASSED++))
    else
        echo "❌ FAIL"
        ((FAILED++))
    fi
}

# System binaries
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "System Binaries"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_command "FFmpeg" "ffmpeg -version"
test_command "FFprobe" "ffprobe -version"
test_command "FluidSynth" "fluidsynth --version"
test_command "Python 3" "python3 --version"
test_command "Node.js" "node --version"
test_command "npm" "npm --version"

echo ""

# Python packages
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Python Packages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "venv" ]; then
    source venv/bin/activate
    
    test_command "Riffusion" "python -c 'import riffusion'"
    test_command "Magenta" "python -c 'import magenta'"
    test_command "Coqui TTS" "python -c 'import TTS'"
    test_command "PyTorch" "python -c 'import torch'"
else
    echo "❌ Virtual environment not found. Run setup.sh first."
    FAILED=$((FAILED + 4))
fi

echo ""

# Files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Required Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_command "SoundFont" "test -f assets/GeneralUser.sf2"
test_command ".env file" "test -f .env"
test_command "node_modules" "test -d node_modules"
test_command "package.json" "test -f package.json"

echo ""

# TypeScript compilation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TypeScript Compilation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Compiling TypeScript... "
if npm run build > /dev/null 2>&1; then
    echo "✅ PASS"
    ((PASSED++))
else
    echo "❌ FAIL"
    ((FAILED++))
fi

echo ""

# API test (if server is running)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API Endpoints (optional - only if server running)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Testing /health endpoint... "
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ PASS"
    
    echo ""
    echo "Health check response:"
    curl -s http://localhost:4000/health | python -m json.tool
else
    echo "⚠️  SKIP (server not running)"
fi

echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                     Test Summary                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed! Ready to generate music."
    echo ""
    echo "Start the server with:"
    echo "  source venv/bin/activate"
    echo "  npm run dev"
    exit 0
else
    echo "⚠️  Some tests failed. Check SETUP_MODELS.md for troubleshooting."
    exit 1
fi
