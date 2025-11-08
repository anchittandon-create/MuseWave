/**
 * DSP-based fallback audio generation when AI models are unavailable
 * Uses additive synthesis and formant-based vocal simulation
 */

const SAMPLE_RATE = 44100;

/**
 * Generate instrumental audio using additive synthesis
 */
export function generateDSPInstrumental(
  durationSec: number,
  bpm: number,
  key: string
): Buffer {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const audioData = new Float32Array(numSamples * 2); // Stereo

  // Parse key to get base frequency
  const baseFreq = getFrequencyFromKey(key);

  // Chord progression: I-V-vi-IV
  const chordSemitones = [0, 7, 9, 5]; // Relative to root
  const beatsPerSec = bpm / 60;
  const samplesPerBeat = SAMPLE_RATE / beatsPerSec;
  const samplesPerChord = samplesPerBeat * 4; // 4 beats per chord

  for (let i = 0; i < numSamples; i++) {
    const time = i / SAMPLE_RATE;

    // Determine current chord
    const chordIndex = Math.floor(i / samplesPerChord) % chordSemitones.length;
    const chordFreq = baseFreq * Math.pow(2, chordSemitones[chordIndex] / 12);

    // Generate harmonics (additive synthesis)
    let sample = 0;

    // Fundamental
    sample += 0.4 * Math.sin(2 * Math.PI * chordFreq * time);

    // Octave
    sample += 0.2 * Math.sin(2 * Math.PI * chordFreq * 2 * time);

    // Fifth
    sample += 0.1 * Math.sin(2 * Math.PI * chordFreq * 1.5 * time);

    // Fourth harmonic
    sample += 0.05 * Math.sin(2 * Math.PI * chordFreq * 4 * time);

    // Bass layer (sub-octave)
    const bassFreq = chordFreq / 2;
    sample += 0.3 * Math.sin(2 * Math.PI * bassFreq * time);

    // ADSR envelope
    const envelope = calculateADSR(time, durationSec);
    sample *= envelope;

    // Stereo
    audioData[i * 2] = sample * 0.5; // Left
    audioData[i * 2 + 1] = sample * 0.5; // Right
  }

  return float32ToWav(audioData, SAMPLE_RATE);
}

/**
 * Generate vocals using formant synthesis
 */
export function generateDSPVocals(
  lyrics: string,
  durationSec: number
): { audioBuffer: Buffer; timestamps: Array<{ time: number; word: string }> } {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const audioData = new Float32Array(numSamples * 2); // Stereo

  const words = lyrics.split(/\s+/).filter((w) => w.length > 0);
  const timePerWord = durationSec / words.length;

  // Vowel formant frequencies (simplified)
  const formants: Record<string, number[]> = {
    a: [730, 1090, 2440], // "ah"
    e: [530, 1840, 2480], // "eh"
    i: [270, 2290, 3010], // "ee"
    o: [570, 840, 2410], // "oh"
    u: [440, 1020, 2240], // "oo"
  };

  const timestamps: Array<{ time: number; word: string }> = [];

  for (let i = 0; i < numSamples; i++) {
    const time = i / SAMPLE_RATE;
    const wordIndex = Math.floor(time / timePerWord);

    if (wordIndex >= words.length) break;

    if (i % Math.floor(timePerWord * SAMPLE_RATE) === 0) {
      timestamps.push({ time, word: words[wordIndex] });
    }

    // Simple character-based formant selection
    const char = words[wordIndex].charAt(0).toLowerCase();
    const vowel = ['a', 'e', 'i', 'o', 'u'].includes(char) ? char : 'a';
    const freqs = formants[vowel];

    // Generate formant synthesis
    let sample = 0;
    for (const freq of freqs) {
      sample += Math.sin(2 * Math.PI * freq * time) / freqs.length;
    }

    // Add vibrato (5 Hz, ±5%)
    const vibrato = 1 + 0.05 * Math.sin(2 * Math.PI * 5 * time);
    sample *= vibrato;

    // Envelope
    const wordTime = (time % timePerWord) / timePerWord;
    const envelope = calculateSimpleEnvelope(wordTime);
    sample *= envelope;

    audioData[i * 2] = sample * 0.3; // Left
    audioData[i * 2 + 1] = sample * 0.3; // Right
  }

  return {
    audioBuffer: float32ToWav(audioData, SAMPLE_RATE),
    timestamps,
  };
}

/**
 * Calculate ADSR envelope
 */
function calculateADSR(time: number, duration: number): number {
  const attackTime = duration * 0.1;
  const releaseTime = duration * 0.2;

  if (time < attackTime) {
    // Attack
    return time / attackTime;
  } else if (time > duration - releaseTime) {
    // Release
    return (duration - time) / releaseTime;
  } else {
    // Sustain
    return 1.0;
  }
}

/**
 * Calculate simple envelope for word articulation
 */
function calculateSimpleEnvelope(normalizedTime: number): number {
  if (normalizedTime < 0.1) {
    return normalizedTime / 0.1;
  } else if (normalizedTime > 0.9) {
    return (1 - normalizedTime) / 0.1;
  } else {
    return 1.0;
  }
}

/**
 * Convert Float32Array to WAV buffer
 */
export function float32ToWav(audioData: Float32Array, sampleRate: number): Buffer {
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * bytesPerSample;
  const headerSize = 44;
  const fileSize = headerSize + dataSize - 8;

  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Convert float32 to int16
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i])); // Clamp
    const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    buffer.writeInt16LE(int16Sample, headerSize + i * 2);
  }

  return buffer;
}

/**
 * Get frequency from musical key
 */
function getFrequencyFromKey(key: string): number {
  // A4 = 440 Hz reference
  const notes: Record<string, number> = {
    'C': -9, 'C#': -8, 'Db': -8,
    'D': -7, 'D#': -6, 'Eb': -6,
    'E': -5,
    'F': -4, 'F#': -3, 'Gb': -3,
    'G': -2, 'G#': -1, 'Ab': -1,
    'A': 0, 'A#': 1, 'Bb': 1,
    'B': 2,
  };

  // Parse key (e.g., "A minor" -> "A")
  const noteName = key.split(' ')[0];
  const semitones = notes[noteName] || 0;

  // Calculate frequency (A4 = 440 Hz)
  return 440 * Math.pow(2, semitones / 12);
}
