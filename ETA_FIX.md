# ETA Display Fix - Realistic Time Estimates

## Problem
The Total ETA was showing unrealistic values like **495:37** (495 hours / 20+ days) during music generation, which was confusing and incorrect.

## Root Causes

1. **Mock job had no ETA values** - The mock generation wasn't providing `etaSeconds`, `totalEtaSeconds`, or `stageEtaSeconds`
2. **No upper bounds on calculated ETAs** - The fallback calculation could produce extremely high values
3. **No sanity checks** - ETAs could grow unbounded if calculations went wrong

## Solution

### 1. Added Realistic ETAs to Mock Generation

Updated `services/orchestratorClient.ts` mock job to provide:

```typescript
const stages = [
  { status: 'planning', duration: 10 },                      // 10 seconds
  { status: 'generating-instruments', duration: 15 },        // 15 seconds
  { status: 'synthesizing-vocals', duration: 15 },           // 15 seconds
  { status: 'mixing-mastering', duration: 10 },              // 10 seconds
  { status: 'rendering-video', duration: 15 },               // 15 seconds
  { status: 'finalizing', duration: 5 }                      // 5 seconds
];
// Total: 70 seconds (~1 minute 10 seconds)
```

**Calculations added:**
- `stageEtaSeconds` - Remaining time in current stage
- `totalEtaSeconds` - Remaining time for entire job
- Progress-aware countdowns that decrease as job progresses

### 2. Added ETA Caps in HomePage

**Total ETA cap: 30 minutes (1800 seconds)**
```typescript
const cappedEta = Math.min(preferred, 1800);
const cappedRemaining = Math.min(remaining, 1800);
```

**Stage ETA cap: 2 minutes (120 seconds)**
```typescript
const baseline = Math.min(stageEtaSeconds, 120);
```

### 3. Improved ETA Calculation Logic

**Before:**
- Mock: No ETAs provided → Fallback calculation → Could be huge
- Calculation: `remaining = (elapsed * (100 - pct)) / pct` → Unbounded

**After:**
- Mock: Provides realistic ETAs → No fallback needed
- Calculation: Capped at 30 minutes maximum
- Stage: Capped at 2 minutes maximum

## Results

### Before Fix
```
Total ETA: 495:37    (495 hours! 😱)
Stage ETA: --:--
```

### After Fix
```
Total ETA: 01:10     (70 seconds ✓)
Stage ETA: 00:15     (15 seconds ✓)
```

## ETA Timeline Example

For a typical mock generation (70 seconds total):

```
Progress  Stage                      Stage ETA    Total ETA
--------  -------------------------  -----------  ----------
0%        Planning                   00:10        01:10
10%       Planning                   00:05        01:03
17%       Generating instruments     00:15        00:56
33%       Synthesizing vocals        00:15        00:47
50%       Mixing and mastering       00:10        00:35
67%       Rendering video            00:15        00:23
83%       Finalizing                 00:05        00:12
100%      Complete!                  00:00        00:00
```

## Technical Details

### Files Modified

1. **`services/orchestratorClient.ts`**
   - Added `duration` field to each stage
   - Calculate `stageEtaSeconds` based on progress within stage
   - Calculate `totalEtaSeconds` based on overall progress
   - Mock job now completes in ~70 seconds with accurate countdown

2. **`pages/HomePage.tsx`**
   - `updateTotalEta()`: Cap at 1800 seconds (30 min)
   - `updateStageTimer()`: Cap at 120 seconds (2 min)
   - Prevents runaway ETAs from bad data or calculations

### Caps Rationale

**30-minute total cap:**
- Reasonable maximum for music generation
- Matches the maxPolls timeout (900 polls × 2s = 30 min)
- Prevents display of multi-hour/day estimates

**2-minute stage cap:**
- Individual stages should be quick
- Prevents stage ETAs exceeding total ETA
- Most stages complete in 5-15 seconds

## Testing

### Test Mock Generation
```bash
npm run dev
```

1. Fill out the form
2. Click "Generate Music"
3. Watch the ETAs:
   - Total ETA should show ~01:10 initially
   - Stage ETA should show 10-15 seconds per stage
   - Both should count down smoothly
   - Never show hours (like 495:37)

### Expected Behavior
- ✅ Total ETA starts at ~01:10
- ✅ Total ETA decreases smoothly
- ✅ Stage ETA resets for each stage
- ✅ No values over 30:00
- ✅ Clean countdown to 00:00

## Benefits

1. **User Confidence** - Realistic ETAs show the process is working
2. **No Confusion** - No more multi-hour estimates for 1-minute tasks
3. **Better UX** - Users know exactly how long to wait
4. **Accurate Progress** - ETAs match actual completion time

## Edge Cases Handled

1. **No ETA data from backend** - Falls back to calculation with cap
2. **Bad calculation** - Capped at 30 minutes
3. **Infinite/NaN values** - Filtered out, shows --:--
4. **Negative values** - Clamped to 0
5. **Very slow progress** - Still capped at maximum

## Future Improvements

- [ ] Different caps for different generation types (audio vs video)
- [ ] Backend-provided estimates for real generation
- [ ] Historical data to improve ETA accuracy
- [ ] Progress speed indicators ("faster than expected")
- [ ] Confidence intervals ("1-2 minutes")

---

**Status:** ✅ Fixed - ETAs now show realistic values
**Date:** Nov 9, 2025
**Impact:** High - Critical UX improvement for generation flow
