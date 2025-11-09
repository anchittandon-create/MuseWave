# Media Files Configuration Fix

## Problem
Audio and video files were being served as HTML files instead of their correct media formats because:

1. **Vercel rewrite rule**: The catch-all `"source": "/(.*)"` was rewriting ALL requests to `/index.html`, including media files
2. **Missing media files**: Test video files didn't exist in the `public/` folder
3. **Wrong location**: Audio files were in the root directory instead of `public/`
4. **Vercel ignore**: `.vercelignore` was explicitly excluding `test*.wav` files

## Solution Applied

### 1. Fixed `vercel.json` Rewrite Rules
Added explicit rules to serve media files directly before the catch-all HTML rewrite:

```json
{
  "headers": [
    {
      "source": "/(.*\\.wav)",
      "headers": [{ "key": "Content-Type", "value": "audio/wav" }]
    },
    {
      "source": "/(.*\\.mp3)",
      "headers": [{ "key": "Content-Type", "value": "audio/mpeg" }]
    },
    {
      "source": "/(.*\\.mp4)",
      "headers": [{ "key": "Content-Type", "value": "video/mp4" }]
    },
    {
      "source": "/(.*\\.webm)",
      "headers": [{ "key": "Content-Type", "value": "video/webm" }]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*\\.(wav|mp3|mp4|webm|ogg|flac))",
      "destination": "/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Key changes:**
- Added explicit `Content-Type` headers for each media format
- Added media file rewrite rule BEFORE the catch-all HTML rule
- Order matters: media files are matched first, then other routes go to HTML

### 2. Moved Audio Files to `public/`
```bash
cp test*.wav public/
```

Files now in `public/`:
- `test.wav` (2.5M) - Main test audio
- `test-30s.wav` (2.5M) - 30-second test
- `test-create-45s.wav` (3.8M) - 45-second test

### 3. Created Test Video Files
Generated placeholder video files for mock generation:

```bash
# Lyric video (blue background)
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=5 \
  -f lavfi -i anullsrc=r=44100:cl=stereo \
  -t 5 -pix_fmt yuv420p test-lyric-video.mp4

# Official video (purple background)
ffmpeg -f lavfi -i color=c=purple:s=1280x720:d=5 \
  -f lavfi -i anullsrc=r=44100:cl=stereo \
  -t 5 -pix_fmt yuv420p test-official-video.mp4
```

Files created:
- `test-lyric-video.mp4` (12K) - Blue placeholder
- `test-official-video.mp4` (12K) - Purple placeholder

### 4. Fixed `.vercelignore`
Removed `test*.wav` exclusion so test media files are included in deployment:

```diff
- test*.wav
+ # Note: test*.wav and test*.mp4 files in public/ are intentionally included for demo purposes
```

## How It Works

### File Flow
```
public/test.wav
    ↓ (Vite build copies public/ to dist/)
dist/test.wav
    ↓ (Vercel deployment)
https://your-app.vercel.app/test.wav
    ↓ (Vercel rewrites with Content-Type: audio/wav)
Browser receives actual WAV file
```

### Rewrite Rule Order
```
Request: /test.wav
    ↓
Check: /(.*\.(wav|mp3|mp4|webm|ogg|flac))  ← MATCHES!
    ↓
Serve: /test.wav (actual file)
    ✓ Returns audio/wav with correct headers

Request: /about
    ↓
Check: /(.*\.(wav|mp3|mp4|webm|ogg|flac))  ← No match
    ↓
Check: /(.*)  ← MATCHES!
    ↓
Serve: /index.html (SPA routing)
    ✓ Returns HTML for React Router
```

## Testing

### Local Development
```bash
npm run dev
```

Then in browser console:
```javascript
// Test audio file
fetch('/test.wav')
  .then(r => {
    console.log('Content-Type:', r.headers.get('content-type'));
    console.log('Size:', r.headers.get('content-length'));
    return r.blob();
  })
  .then(blob => console.log('Blob type:', blob.type));
// Expected: audio/wav

// Test video file
fetch('/test-lyric-video.mp4')
  .then(r => console.log('Content-Type:', r.headers.get('content-type')));
// Expected: video/mp4
```

### Build Test
```bash
npm run build
npm run preview
```

Check that files exist in `dist/`:
```bash
ls -lh dist/*.{wav,mp4}
```

### Vercel Deployment
After deploying to Vercel, test the URLs:
```bash
curl -I https://your-app.vercel.app/test.wav
# Should show: Content-Type: audio/wav

curl -I https://your-app.vercel.app/test-lyric-video.mp4
# Should show: Content-Type: video/mp4
```

## Media File Support

### Supported Formats

**Audio:**
- `.wav` - Uncompressed audio (best quality, larger size)
- `.mp3` - Compressed audio (smaller size)
- `.ogg` - Open format
- `.flac` - Lossless compression

**Video:**
- `.mp4` - Most compatible (H.264 + AAC)
- `.webm` - Modern format (VP9/VP8)

### Browser Compatibility

| Format | Chrome | Firefox | Safari | Edge |
|--------|--------|---------|--------|------|
| WAV    | ✅     | ✅      | ✅     | ✅   |
| MP3    | ✅     | ✅      | ✅     | ✅   |
| MP4    | ✅     | ✅      | ✅     | ✅   |
| WebM   | ✅     | ✅      | ⚠️     | ✅   |
| OGG    | ✅     | ✅      | ❌     | ✅   |

### Content-Type Headers

Correct `Content-Type` headers are crucial for browsers to handle media properly:

```
audio/wav       - WAV files
audio/mpeg      - MP3 files
audio/ogg       - OGG files
audio/flac      - FLAC files
video/mp4       - MP4 files
video/webm      - WebM files
```

## Adding New Media Files

### For Development
1. Place files in `public/` directory
2. Reference with leading slash: `/your-file.wav`
3. Files are automatically copied to `dist/` on build

### For Production
1. Ensure file format is supported (see table above)
2. Add to `public/` directory
3. Update `.vercelignore` if needed (don't exclude)
4. Build and deploy:
```bash
npm run build
vercel --prod
```

## Troubleshooting

### Media file returns HTML
**Symptom:** Browser shows HTML content when trying to play audio/video

**Cause:** Rewrite rule sending media requests to index.html

**Fix:** Ensure media file rewrite rule comes BEFORE catch-all rule in `vercel.json`

### 404 on media files
**Symptom:** Media files not found in production

**Causes:**
1. File not in `public/` directory
2. File excluded in `.vercelignore`
3. File not copied to `dist/` during build

**Fix:**
```bash
# Check if file exists in public
ls -lh public/*.{wav,mp4}

# Check .vercelignore
cat .vercelignore

# Rebuild
npm run build

# Check dist
ls -lh dist/*.{wav,mp4}
```

### Wrong Content-Type header
**Symptom:** Browser doesn't recognize file as audio/video

**Cause:** Missing or incorrect Content-Type header

**Fix:** Add/update header in `vercel.json`:
```json
{
  "source": "/(.*\\.your-format)",
  "headers": [
    {
      "key": "Content-Type",
      "value": "audio/your-mime-type"
    }
  ]
}
```

### Large file size issues
**Symptom:** Deployment fails or is very slow

**Cause:** Media files are large

**Solutions:**
1. Use compressed formats (MP3 instead of WAV)
2. Reduce quality/bitrate
3. Use external storage (S3, Cloudinary)
4. Serve from CDN

Example compression:
```bash
# Convert WAV to MP3 (much smaller)
ffmpeg -i test.wav -codec:a libmp3lame -b:a 192k test.mp3

# Reduce video bitrate
ffmpeg -i input.mp4 -b:v 1M -b:a 128k output.mp4
```

## Files Modified
- `vercel.json` - Added media file rewrite rules and headers
- `.vercelignore` - Removed test*.wav exclusion
- `public/` - Added test audio and video files

## Summary
✅ Media files now served with correct Content-Type headers
✅ Audio files properly located in `public/` directory  
✅ Test video files created for mock generation
✅ Vercel configuration excludes catch-all for media formats
✅ `.vercelignore` allows test media files in deployment
