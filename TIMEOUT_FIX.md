# Generation Timeout Fix

## Problem
Music/video generation was taking more than 20 minutes with no output because:
1. **Polling timeout was too short**: `maxPolls = 60` × 2s intervals = only 2 minutes
2. **No logging**: Hard to debug where the process was stuck
3. **Poor error messages**: Timeout errors weren't informative

## Solution Applied

### 1. Increased Polling Timeout (30 minutes)
```typescript
// Changed from:
const maxPolls = 60; // 2 minutes

// To:
const maxPolls = 900; // 30 minutes (900 * 2s = 1800s)
```

### 2. Added Comprehensive Logging
- **Job subscription start**: Logs job ID and whether it's a mock job
- **Progress tracking**: Logs every 30 polls (1 minute) with poll count
- **Backend URL check**: Warns if `BACKEND_NEO_URL` environment variable is not set
- **Mock job completion**: Logs when mock jobs complete
- **Error context**: Provides detailed error messages with time information

### 3. Improved Error Handling
- **Timeout detection**: Checks if `pollCount > maxPolls` and provides clear error
- **Retry logic**: Retries up to 5 times on network errors before failing
- **Time-based error messages**: Shows timeout in minutes for better UX

### 4. Fixed TypeScript Error
Fixed compile error in `normalizeVideoMap` by adding proper type casting:
```typescript
const url = coerceUrl(typeof value === 'string' ? value : (value as any)?.url);
```

## Testing the Fix

### For Mock Mode (Development)
1. Run `npm run dev`
2. Fill out the form and click "Generate Music"
3. Watch the console for progress logs
4. Generation should complete within the mock timeframe

### For Real Backend
1. Ensure `BACKEND_NEO_URL` is set in `.env`:
   ```bash
   BACKEND_NEO_URL=http://localhost:4000  # or your backend URL
   ```
2. Make sure your backend server is running
3. Generate music and monitor console logs
4. Backend should have up to 30 minutes to complete

## Console Output to Expect

```
[OrchestratorClient] Starting subscription for job mock-1234567890-abc (mock: true)
[OrchestratorClient] Poll #30/900 for job mock-1234567890-abc
[OrchestratorClient] Poll #60/900 for job mock-1234567890-abc
...
[OrchestratorClient] Mock job completing
```

## Environment Configuration

Make sure your `.env` file has:
```bash
# Backend URL (optional - will use mock if not set)
BACKEND_NEO_URL=http://localhost:4000
```

If `BACKEND_NEO_URL` is not set, you'll see:
```
[OrchestratorClient] BACKEND_NEO_URL not configured, using default: http://localhost:3002
```

## What Changed in `services/orchestratorClient.ts`

1. **Line 80**: Increased `maxPolls` from 60 to 900
2. **Line 83**: Added job subscription start logging
3. **Line 138-141**: Added progress tracking logs every 30 polls
4. **Line 145**: Added mock job completion log
5. **Line 177-179**: Added backend URL configuration warning
6. **Line 286-294**: Enhanced error handling with timeout detection
7. **Line 375**: Fixed TypeScript compile error

## Next Steps

1. **Test in development**: Run `npm run dev` and try generating music
2. **Check console**: Open DevTools and monitor the console output
3. **Verify completion**: Ensure mock jobs complete successfully
4. **Test with backend**: If you have a backend, test with real generation
5. **Monitor timing**: Watch the poll count logs to see how long it takes

## Troubleshooting

### Still timing out after 30 minutes?
- Check if your backend is running and accessible
- Verify the `BACKEND_NEO_URL` in `.env` is correct
- Look for network errors in the console
- Consider increasing `maxPolls` even further if needed

### Generation completes but no audio/video?
- Check the `fetchJobResult` function returns valid URLs
- Verify mock files exist: `/test.wav`, `/test-lyric-video.mp4`
- Check browser console for 404 errors on audio/video URLs

### Backend not responding?
- Ensure backend server is running on the configured port
- Check backend logs for errors
- Verify firewall/network settings allow connections
- Test backend health endpoint: `curl http://localhost:4000/api/health`

## Files Modified
- `services/orchestratorClient.ts` - Main timeout and logging fixes
