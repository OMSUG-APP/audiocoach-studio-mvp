/**
 * Qwen AI client — returns mock data for MVP.
 * Replace mock implementations with real API calls when ready.
 */
import { BeatPatternResponse, ChordPatternResponse, SynthPatchResponse } from './schemas';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function randomBool(probability = 0.25): boolean {
  return Math.random() < probability;
}

export async function fetchBeat(params: {
  style?: string;
  density?: 'low' | 'mid' | 'high';
}): Promise<BeatPatternResponse> {
  await delay(400);
  const d = params.density === 'high' ? 0.4 : params.density === 'low' ? 0.15 : 0.25;
  return {
    drums: {
      BD: Array.from({ length: 16 }, (_, i) => i === 0 || i === 8 || randomBool(d)),
      SD: Array.from({ length: 16 }, (_, i) => i === 4 || i === 12 || randomBool(d * 0.5)),
      HC: Array.from({ length: 16 }, (_, i) => i % 2 === 0 || randomBool(d)),
      OH: Array.from({ length: 16 }, (_, i) => i % 4 === 2 || randomBool(d * 0.3)),
      LT: Array.from({ length: 16 }, () => randomBool(d * 0.3)),
      HT: Array.from({ length: 16 }, () => randomBool(d * 0.2)),
    },
    description: `AI-generated ${params.style || 'house'} beat (mock)`,
  };
}

const CHORD_PROGRESSIONS: string[][][] = [
  [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']],
  [['Am3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4']],
  [['Dm3', 'F3', 'A3'], ['Am3', 'C4', 'E4'], ['Bb3', 'D4', 'F4'], ['C4', 'E4', 'G4']],
];

export async function fetchChords(params: {
  key?: string;
  scale?: string;
  bars?: number;
}): Promise<ChordPatternResponse> {
  await delay(400);
  const prog = CHORD_PROGRESSIONS[Math.floor(Math.random() * CHORD_PROGRESSIONS.length)];
  const steps = Array.from({ length: 16 }, (_, i) => {
    const chordIdx = Math.floor(i / 4) % prog.length;
    const isDownbeat = i % 4 === 0;
    return {
      chord: isDownbeat ? prog[chordIdx] : [],
      active: isDownbeat,
      velocity: 0.7 + Math.random() * 0.2,
      length: 4,
    };
  });
  return {
    steps,
    description: `AI chord progression in ${params.key || 'C'} ${params.scale || 'major'} (mock)`,
  };
}

export async function fetchPatch(instrument: 'bass' | 'pad' | 'polysynth'): Promise<SynthPatchResponse> {
  await delay(300);
  const patches: Record<string, Record<string, number | string>> = {
    bass: { waveform: 'sawtooth', cutoff: 0.3 + Math.random() * 0.4, resonance: 0.4 + Math.random() * 0.4, envMod: 0.5 + Math.random() * 0.4, decay: 0.2 + Math.random() * 0.5, octave: 2 },
    pad: { attack: 0.3 + Math.random() * 0.5, release: 0.4 + Math.random() * 0.5, cutoff: 0.3 + Math.random() * 0.4, detune: 0.2 + Math.random() * 0.6, octave: 4 },
    polysynth: { oscMix: Math.random(), subLevel: Math.random() * 0.4, cutoff: 0.3 + Math.random() * 0.5, resonance: 0.1 + Math.random() * 0.4, envMod: 0.3 + Math.random() * 0.5, attack: Math.random() * 0.3, decay: 0.2 + Math.random() * 0.4, sustain: 0.4 + Math.random() * 0.4, release: 0.2 + Math.random() * 0.8, chorus: Math.random() * 0.5, octave: 4 },
  };
  return {
    instrument,
    params: patches[instrument],
    description: `AI-generated ${instrument} patch (mock)`,
  };
}

export async function suggestSampleCategory(context: { instrument?: string; style?: string }): Promise<string> {
  await delay(200);
  const map: Record<string, string> = {
    drums: 'percussion', bass: 'melodic', pad: 'melodic', foley: 'foley', noise: 'noise',
  };
  return map[context.instrument || ''] || 'percussion';
}
