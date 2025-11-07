#!/usr/bin/env bash
#
# test-generation.sh - Quick Test Script for Open-Source Music Generation
#

set -e

echo "🧪 Testing Open-Source Music Generation Backend"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL=${BASE_URL:-http://localhost:3000}

echo "📡 Testing against: $BASE_URL"
echo ""

# Test 1: Health Check
echo -n "1️⃣  Health check... "
HEALTH=$(curl -s "$BASE_URL/api/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "$HEALTH"
    exit 1
fi

# Test 2: Capabilities Check
echo -n "2️⃣  Capabilities check... "
CAPS=$(curl -s "$BASE_URL/api/capabilities")
if echo "$CAPS" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ OK${NC}"
    
    # Show available models
    echo "   📦 Available models:"
    echo "$CAPS" | python3 -c "import sys,json; caps=json.load(sys.stdin)['capabilities']; [print(f'      • {k}: {\"✅\" if v else \"❌\"}') for k,v in caps.items()]" || true
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "$CAPS"
fi
echo ""

# Test 3: Short Music Generation
echo "3️⃣  Generating 15-second lofi track..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/generate-opensource" \
    -H "Content-Type: application/json" \
    -d '{
        "musicPrompt": "relaxing lofi hip-hop beats for studying",
        "genres": ["lofi"],
        "durationSec": 15,
        "generateVideo": false
    }')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Generation successful!${NC}"
    
    # Extract job ID and audio URL
    JOB_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('jobId',''))" 2>/dev/null || echo "")
    AUDIO_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('assets',{}).get('mixUrl',''))" 2>/dev/null || echo "")
    
    echo ""
    echo "📊 Results:"
    echo "   🆔 Job ID: $JOB_ID"
    echo "   🎵 Audio URL: $BASE_URL$AUDIO_URL"
    
    # Check if file exists
    if [ -n "$AUDIO_URL" ]; then
        LOCAL_PATH="./public$AUDIO_URL"
        if [ -f "$LOCAL_PATH" ]; then
            FILE_SIZE=$(du -h "$LOCAL_PATH" | cut -f1)
            echo "   📁 File size: $FILE_SIZE"
            echo -e "   ${GREEN}✅ Audio file exists${NC}"
            
            # Try to play audio (macOS)
            if command -v afplay &> /dev/null; then
                echo ""
                echo "   🔊 Playing audio... (Ctrl+C to skip)"
                afplay "$LOCAL_PATH" 2>/dev/null || echo "   ⏭️  Playback skipped"
            fi
        else
            echo -e "   ${RED}❌ Audio file not found: $LOCAL_PATH${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Generation failed${NC}"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎵 Try more examples:"
echo ""
echo "  Ambient with video:"
echo "  curl -X POST $BASE_URL/api/generate-opensource -H 'Content-Type: application/json' \\"
echo "    -d '{\"musicPrompt\":\"peaceful ambient soundscape\",\"genres\":[\"ambient\"],\"durationSec\":30,\"generateVideo\":true}'"
echo ""
echo "  Techno with vocals:"
echo "  curl -X POST $BASE_URL/api/generate-opensource -H 'Content-Type: application/json' \\"
echo "    -d '{\"musicPrompt\":\"driving techno\",\"genres\":[\"techno\"],\"durationSec\":45,\"lyrics\":\"Feel the rhythm\",\"generateVideo\":true}'"
echo ""
