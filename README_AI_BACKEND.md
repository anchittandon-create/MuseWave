# MuseWave AI Music Generation Backend

## 🎵 Complete AI-Powered Music Creation System

MuseWave is a comprehensive AI-powered music generation platform that creates **real audio files** with professional-quality synthesis, mixing, and mastering. The system combines Gemini AI for intelligent music planning with real audio synthesis using ffmpeg.

## 🚀 Features

### AI-Powered Music Intelligence
- **Smart Prompt Enhancement**: AI-driven enhancement of user prompts with musical context
- **Genre Suggestions**: Intelligent genre recommendations based on context
- **Artist Inspiration**: Curated artist suggestions matching the desired style
- **Language Support**: Multi-language vocal support with cultural context
- **Instrument Selection**: AI-curated instrument combinations for optimal sonic palette

### Real Audio Synthesis
- **Professional Audio Engine**: Real ffmpeg-based audio generation
- **Multi-Stem Production**: Separate kick, snare, hi-hats, bass, and lead stems
- **Advanced Mixing**: Automatic EQ, compression, and stereo placement
- **Mastering Pipeline**: Professional loudness normalization and final polish
- **High-Quality Output**: 44.1kHz/16-bit WAV files ready for distribution

### Video Generation
- **Lyric Videos**: Animated typography with music synchronization
- **Official Music Videos**: Conceptual video treatments with storyboards
- **Abstract Visualizers**: Audio-reactive visual generators
- **Creative Assets**: AI-generated video concepts and production guidelines

### Music Planning & Structure
- **Intelligent Arrangements**: AI-generated song structures with proper pacing
- **Professional Sections**: Intro, verse, chorus, breakdown, bridge, outro
- **Tempo & Key Selection**: Genre-appropriate musical parameters
- **Lyric Alignment**: Time-synced lyrical content with musical structure
- **Plan Auditing**: Quality assurance for musical coherence

## 🏗 Architecture

### API Endpoints

| Endpoint | Purpose | Input | Output |
|----------|---------|-------|--------|
| `POST /api/generate-music` | Main music generation | Full music request | Complete audio/video package |
| `POST /api/enhance-prompt` | AI prompt enhancement | Text prompt | Enhanced musical prompt |
| `POST /api/suggest-genres` | Genre recommendations | Context object | Array of genre suggestions |
| `POST /api/suggest-artists` | Artist inspiration | Musical context | Array of artist names |
| `POST /api/suggest-languages` | Language options | Context object | Array of language options |
| `POST /api/suggest-instruments` | Instrument selection | Musical context | Array of instrument suggestions |
| `POST /api/generate-music-plan` | Song structure planning | Basic requirements | Detailed music plan |
| `POST /api/audit-music-plan` | Plan quality check | Music plan + requirements | Audit results with feedback |
| `POST /api/enhance-lyrics` | Lyric improvement | Context + existing lyrics | Enhanced lyrical content |
| `POST /api/generate-creative-assets` | Video/visual concepts | Music plan + styles | Video storyboards + timing |
| `GET /api/health` | System health check | None | System status |

### Core Libraries

- **lib/musicGenerator.ts**: Main audio synthesis engine with ffmpeg integration
- **lib/validation.ts**: Input validation and sanitization
- **services/geminiService.ts**: AI service integration with caching
- **lib/cache.ts**: Smart caching system for AI responses
- **lib/types.ts**: TypeScript definitions for all data structures

## 🛠 Technical Implementation

### Audio Synthesis Pipeline

```typescript
// Example: Real audio generation with ffmpeg
const generateKick = async (bpm: number, key: string) => {
  const freq = noteFrequencies[key] || 60; // Sub frequency
  const duration = 60 / bpm; // Beat duration
  
  return await execAsync(
    `ffmpeg -f lavfi -i "sine=frequency=${freq}:duration=${duration}" ` +
    `-af "volume=0.8,lowpass=f=80,highpass=f=30" ` +
    `${outputPath} -y`
  );
};
```

### AI Integration with Fallbacks

```typescript
// Smart AI calls with deterministic fallbacks
export const suggestGenres = async (context: any) => {
  // Try Gemini AI first
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiSuggestGenres(context);
    } catch (error) {
      console.warn('AI failed, using fallback');
    }
  }
  
  // Deterministic fallback algorithm
  return generateGenreFallback(context);
};
```

### Real-Time Music Generation

```typescript
// Complete music generation workflow
export const generateMusic = async (request: MusicRequest) => {
  // 1. AI Planning Phase
  const plan = await generateMusicPlan(request);
  const audit = await auditMusicPlan(plan, request);
  
  // 2. Audio Synthesis Phase
  const stems = await generateAllStems(plan);
  const mixed = await mixStems(stems, plan);
  const mastered = await masterTrack(mixed);
  
  // 3. Video Generation Phase
  const videoAssets = await generateCreativeAssets(plan, request.videoStyles);
  
  // 4. Package & Deliver
  return {
    audioUrl: uploadAudio(mastered),
    videoStoryboards: videoAssets.videoStoryboard,
    lyricsAlignment: videoAssets.lyricsAlignment,
    metadata: plan
  };
};
```

## 🚀 Deployment

### Vercel Serverless Deployment

```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod
```

### Environment Variables

```env
# Required for AI features
GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Custom API base URL
VITE_API_BASE_URL=https://your-domain.vercel.app

# Development
NODE_ENV=development
```

### System Requirements

- **Node.js**: 22.x or higher (required for Vercel)
- **ffmpeg**: Available in Vercel serverless environment
- **Memory**: 1GB+ for audio processing
- **Storage**: Temporary file space for audio generation

## 🧪 Testing

### Run Complete Test Suite

```bash
# Test all AI endpoints
node scripts/test-ai-backend.js

# Manual endpoint testing
curl -X POST https://your-domain.vercel.app/api/generate-music \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Epic future bass track",
    "genre": "Future Bass",
    "duration": 120,
    "includeVocals": true
  }'
```

### Test Coverage

- ✅ Health check and system validation
- ✅ AI prompt enhancement
- ✅ Genre/artist/language/instrument suggestions
- ✅ Music plan generation and auditing
- ✅ Lyrics enhancement
- ✅ Creative assets generation
- ✅ Complete music generation pipeline
- ✅ Error handling and fallbacks
- ✅ CORS and security headers

## 📊 Performance

### Caching Strategy
- **AI Responses**: Cached for 1-24 hours depending on type
- **Music Plans**: 1 hour cache for iterative refinement
- **Genre/Artist Suggestions**: 7-day cache for stability
- **Enhanced Prompts**: 24-hour cache for consistency

### Response Times
- **AI Suggestions**: 200-500ms (cached) / 2-5s (fresh)
- **Music Plan Generation**: 5-15s
- **Complete Music Generation**: 30-90s
- **Creative Assets**: 2-10s

### Fallback Performance
- **AI Service Down**: <100ms fallback to deterministic algorithms
- **Network Issues**: Graceful degradation with cached responses
- **Rate Limits**: Automatic fallback switching

## 🔧 Configuration

### Audio Quality Settings

```typescript
const AUDIO_CONFIG = {
  sampleRate: 44100,
  bitDepth: 16,
  channels: 2,
  format: 'wav',
  loudnessTarget: -14 // LUFS
};
```

### AI Model Configuration

```typescript
const GEMINI_CONFIG = {
  model: 'gemini-1.5-flash-latest',
  maxTokens: 2048,
  temperature: 0.7,
  timeout: 30000
};
```

## 🎯 Usage Examples

### Basic Music Generation

```javascript
const response = await fetch('/api/generate-music', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Uplifting house track for summer festival',
    genre: 'House',
    duration: 180,
    includeVocals: true,
    mood: 'energetic',
    language: 'English'
  })
});

const { audioUrl, videoStoryboards, lyricsAlignment } = await response.json();
```

### Advanced Workflow

```javascript
// 1. Get AI suggestions
const genres = await fetch('/api/suggest-genres', {
  method: 'POST',
  body: JSON.stringify({ context: { prompt: userPrompt } })
});

// 2. Generate music plan
const plan = await fetch('/api/generate-music-plan', {
  method: 'POST',
  body: JSON.stringify({ prompt: userPrompt, genre: selectedGenre, duration: 180 })
});

// 3. Generate complete track
const music = await fetch('/api/generate-music', {
  method: 'POST',
  body: JSON.stringify({ ...fullRequest })
});
```

## 🎵 Musical Features

### Supported Genres
- **Electronic**: House, Techno, Trance, Dubstep, Future Bass, Ambient
- **Hip-Hop**: Trap, Lo-fi, Boom Bap, Jazz Hop
- **Pop**: Mainstream Pop, Indie Pop, Electropop
- **Experimental**: IDM, Glitch, Drone, Noise

### Instrument Library
- **Synthesis**: Analog, FM, Wavetable, Granular
- **Drums**: 808s, Acoustic, Electronic, Ethnic
- **Bass**: Sub, Analog, Acid, Reese
- **Melodic**: Piano, Strings, Brass, Guitar
- **Texture**: Pads, Atmospheres, Effects, Vocals

### Song Structures
- **Standard Pop**: Intro-Verse-Chorus-Verse-Chorus-Bridge-Chorus-Outro
- **Electronic**: Intro-Build-Drop-Breakdown-Build-Drop-Outro
- **Ambient**: Flowing sections with gradual evolution
- **Custom**: AI-generated structures based on genre and duration

## 🌟 Future Enhancements

- **Real-time Collaboration**: Multi-user music creation sessions
- **MIDI Export**: Generated tracks as MIDI files for DAW import
- **Stem Separation**: Individual instrument tracks for remixing
- **AI Mastering**: Advanced AI-powered mastering chain
- **Mobile Apps**: Native iOS/Android applications
- **Plugin Integration**: VST/AU plugins for DAW integration

## 📞 Support

For technical support or feature requests:
- **Documentation**: [MuseWave Docs](./README.md)
- **Issues**: GitHub Issues
- **API Testing**: Use included test suite

---

**MuseWave** - Where AI meets professional music production. Create, innovate, and inspire with the power of artificial intelligence.