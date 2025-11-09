# Speed Optimization & Multi-Language Lyrics

## Problem 1: Generation Taking Too Long

### Why is MuseWave Slower Than Suno.ai?

**Suno.ai's Approach:**
- ✅ **Proprietary AI models** trained specifically for music generation
- ✅ **GPU clusters** with CUDA acceleration
- ✅ **Pre-trained diffusion models** (similar to Stable Audio, AudioLDM)
- ✅ **Cached audio components** and pre-rendered stems
- ✅ **Dedicated infrastructure** optimized for audio synthesis
- ⚡ **Generation time:** 30-90 seconds for a complete track

**MuseWave's Current Approach:**
- ❌ **Open-source fallbacks** (ffmpeg DSP, procedural synthesis)
- ❌ **CPU-only processing** on Vercel serverless (no GPU)
- ❌ **Sequential pipeline** (plan → audio → vocals → mix → video)
- ❌ **No pre-trained music models** (uses n-gram melody model)
- ❌ **Browser/serverless limitations** (memory, compute, time limits)
- 🐌 **Generation time:** 5-30 minutes depending on complexity

### Current Architecture Bottlenecks

```
User Input
   ↓
Plan Generation (Gemini AI - 5-10s) ✅ Fast
   ↓
Audio Generation (ffmpeg DSP - 2-5 min) ⚠️ SLOW
   ↓
Vocal Synthesis (TTS - 1-3 min) ⚠️ SLOW
   ↓
Mixing (ffmpeg - 30-60s) ⚠️ SLOW
   ↓
Video Rendering (ffmpeg - 2-5 min) ⚠️ VERY SLOW
   ↓
Total: 5-15 minutes minimum
```

### Why Each Step is Slow

1. **Audio Generation (ffmpeg DSP)**
   - Uses procedural synthesis (sine waves, noise)
   - No real instruments or samples
   - Sequential processing (not parallel)
   - CPU-bound operations
   
2. **Vocal Synthesis (TTS)**
   - Text-to-speech is not singing
   - No pitch/melody control
   - Robotic output quality
   - No voice cloning/style transfer

3. **Mixing**
   - Manual volume balancing
   - Basic EQ/compression
   - No AI-powered mastering

4. **Video Rendering**
   - ffmpeg encoding is CPU-intensive
   - No hardware acceleration (Vercel serverless)
   - Lyric video generation is slow

## Solutions to Speed Up Generation

### Option A: Quick Wins (30-50% Faster)

#### 1. Parallel Processing
```typescript
// BEFORE: Sequential
await generateAudio();
await generateVocals();
await generateVideo();

// AFTER: Parallel where possible
await Promise.all([
  generateAudio(),
  generatePlan() // Can run in parallel
]);
await generateVocals(); // Needs audio first
await Promise.all([
  mixAudio(),
  generateVideo() // Can start as soon as audio exists
]);
```

#### 2. Skip Video by Default
Make video generation **optional** (opt-in):
```typescript
// Only generate if user explicitly requests video
if (request.generateVideo === true) {
  await generateVideo();
}
```

#### 3. Reduce Audio Quality for Preview
```typescript
// Generate 128kbps preview first (fast)
await generatePreview({ quality: 'low', duration: 30 });

// Then generate full quality in background
queueJob(async () => {
  await generateFullQuality({ quality: 'high', duration: full });
});
```

#### 4. Use Web Workers in Frontend
```typescript
// Offload audio processing to web workers
const worker = new Worker('audio-processor.worker.js');
worker.postMessage({ type: 'process', audioData });
```

**Expected Improvement:** 5-15 minutes → **3-8 minutes**

### Option B: Moderate Investment (50-70% Faster)

#### 1. Integrate Real Audio Samples
Replace ffmpeg DSP with sample libraries:
```bash
# Use royalty-free sample packs
- Drum loops (WAV files)
- Bass lines (MIDI + soundfonts)
- Synth presets (VST plugins via native modules)
```

#### 2. Use Pre-trained Music Models
Integrate open-source models:
- **AudioLDM** (Hugging Face) - Text-to-audio diffusion
- **Riffusion** - Spectrogram-based music generation
- **MusicGen** (Meta) - Autoregressive music generation

```python
# Example: MusicGen integration
from audiocraft.models import MusicGen
model = MusicGen.get_pretrained('facebook/musicgen-small')
audio = model.generate(descriptions=["upbeat techno track"])
```

#### 3. GPU Acceleration
Deploy workers with GPU support:
- **Replicate.com** - Run MusicGen/Riffusion models
- **Modal.com** - GPU serverless functions
- **RunPod** - Affordable GPU cloud

```typescript
// Call GPU-accelerated service
const audio = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  body: JSON.stringify({
    version: 'facebook/musicgen-stereo-large',
    input: { prompt: 'techno track', duration: 180 }
  })
});
```

**Expected Improvement:** 5-15 minutes → **1-3 minutes**

### Option C: Production-Ready (70-90% Faster)

#### 1. Pre-generate Common Patterns
Cache frequently requested styles:
```typescript
// Pre-render 100 popular genre combinations
const cache = {
  'techno-dark-120bpm': '/assets/cached/techno-dark-120.wav',
  'house-uplifting-128bpm': '/assets/cached/house-uplifting-128.wav',
  // ... more
};

// When user requests, customize the cached base
if (cacheHit) {
  return customizeAudio(cachedAudio, userParams);
}
```

#### 2. Streaming Audio Generation
Stream audio chunks as they're generated:
```typescript
// Instead of waiting for full track
for await (const chunk of generateAudioStream()) {
  res.write(chunk); // Send to client immediately
}
```

#### 3. Dedicated GPU Cluster
Run your own inference servers:
- **AWS EC2 G4** instances ($0.50-3/hour with GPUs)
- **Lambda Labs** GPU cloud ($0.30/hour)
- **Vast.ai** spot GPU instances ($0.10-0.50/hour)

**Expected Improvement:** 5-15 minutes → **30-90 seconds** (like Suno!)

---

## Problem 2: Multi-Language Lyrics

### Current Issue
Lyrics enhancement only uses the **first language** from the languages array:

```typescript
// CURRENT: Only uses first language
const targetLanguage = Array.isArray(context.languages) && context.languages.length > 0 
  ? context.languages[0]  // ⚠️ Ignores other languages!
  : context.language || 'English';
```

### Solution: Multi-Language Lyrics Generation

#### Approach 1: Verse-by-Verse (Recommended)
Each verse in a different language:

```
Verse 1 (English):
Dancing through the electric night
Feel the rhythm burning bright
Lost in music, pure delight

Verse 2 (Spanish):
Bailando en la noche eléctrica
Siente el ritmo que electrifica
Perdido en música, pura magia

Chorus (All Languages Mixed):
Dance, baila, danse, 踊る
Music unites us all
```

#### Approach 2: Code-Switching
Mix languages within verses (like real multilingual songs):

```
Verse 1:
We're dancing through the night
Bailando sin parar
La musique nous unit
音楽が繋ぐ心

Chorus:
Feel the beat (Siente el ritmo)
In the night (Dans la nuit)
All together (みんな一緒)
United by sound
```

#### Approach 3: Parallel Verses
Repeat verses in each language:

```
Verse 1 (English):
Dancing through the night

Verse 1 (Spanish):
Bailando en la noche

Verse 1 (French):
Dansant dans la nuit
```

## Implementation

See `SPEED_FIX_IMPLEMENTATION.md` for code changes.
See `MULTILANG_LYRICS_IMPLEMENTATION.md` for lyrics enhancement updates.

---

## Comparison: MuseWave vs. Suno.ai

| Feature | Suno.ai | MuseWave (Current) | MuseWave (After Fixes) |
|---------|---------|-------------------|------------------------|
| Speed | 30-90s | 5-15 min | 1-3 min (Option B) |
| Quality | High (AI trained) | Medium (procedural) | Medium-High (with models) |
| Cost | $10-30/month | Free (self-hosted) | $20-50/month (GPU) |
| Customization | Limited | Full control | Full control |
| Multi-language | Partial | Single language | ✅ Full multi-language |
| Open Source | No | Yes | Yes |

## Recommended Action Plan

### Phase 1: Quick Wins (This Week) - 40% Faster
1. ✅ Enable parallel processing where possible
2. ✅ Make video generation optional (off by default)
3. ✅ Add multi-language lyrics support
4. ✅ Reduce default quality for faster preview

### Phase 2: Model Integration (Next 2 Weeks) - 70% Faster
1. 🔄 Integrate MusicGen or AudioLDM via Replicate
2. 🔄 Add sample library for instruments
3. 🔄 Implement audio streaming
4. 🔄 Cache common patterns

### Phase 3: Production (Next Month) - 90% Faster
1. ⏳ Deploy GPU workers
2. ⏳ Build pre-generation cache
3. ⏳ Optimize video rendering with hardware acceleration
4. ⏳ Add real-time progress updates

---

**Bottom Line:**
- **Speed:** MuseWave will never beat Suno without GPU + pre-trained models
- **Multi-language:** Easy fix, will implement immediately
- **Trade-off:** Suno = Fast but paid/closed. MuseWave = Slower but free/open
- **Goal:** Get to 1-3 min generation time with Phase 2 improvements
