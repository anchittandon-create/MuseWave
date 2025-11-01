export type GridEvent = { tSec: number; type: 'kick'|'snare'|'hat'|'bass'|'lead'; pitch?: number };

export function buildEvents(bpm: number, durationSec: number): GridEvent[] {
  const events: GridEvent[] = [];
  const beatDur = 60 / bpm;
  const eighth = beatDur / 2;
  const beats = Math.floor(durationSec / beatDur);

  for (let b = 0; b < beats; b++) {
    const t = b * beatDur;
    // kick every beat
    events.push({ tSec: t, type: 'kick' });
    // snare on 2 and 4 (within each 4-beat bar)
    if ((b % 4) === 1 || (b % 4) === 3) events.push({ tSec: t, type: 'snare' });
    // hats every 1/8 beat
    for (let i = 0; i < 2; i++) events.push({ tSec: t + i * eighth, type: 'hat' });
    // bass on 1 & 3 (half-beat each)
    if ((b % 4) === 0 || (b % 4) === 2) events.push({ tSec: t, type: 'bass' });
    // lead arpeggio each 1/8
    for (let i = 0; i < 2; i++) events.push({ tSec: t + i * eighth, type: 'lead' });
  }
  return events.sort((a, b) => a.tSec - b.tSec);
}