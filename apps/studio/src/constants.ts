import { Project, Pattern } from './types';

export const INITIAL_PATTERN = (id: string, name: string): Pattern => ({
  id,
  name,
  drums: {
    BD: Array(16).fill({ active: false, velocity: 0.8 }),
    SD: Array(16).fill({ active: false, velocity: 0.8 }),
    HC: Array(16).fill({ active: false, velocity: 0.8 }),
    OH: Array(16).fill({ active: false, velocity: 0.8 }),
    LT: Array(16).fill({ active: false, velocity: 0.8 }),
    HT: Array(16).fill({ active: false, velocity: 0.8 }),
  },
  bass: Array(16).fill({ active: false, note: '', velocity: 0.8, length: 1 }),
  synth: Array(16).fill({ active: false, note: '', velocity: 0.6, length: 4 }), // Default to longer notes
});

export const INITIAL_PROJECT: Project = {
  name: 'Untitled Project',
  bpm: 120,
  swing: 0,
  patterns: [INITIAL_PATTERN('p1', 'Pattern 1')],
  arrangement: [{ id: 'a1', patternId: 'p1', startStep: 0, length: 16 }],
  mixer: {
    drums: { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } },
    bass: { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } },
    synth: { volume: 0.7, eq: { low: 0, mid: 0, high: 0 } },
    master: { volume: 1.0, drive: 0, reverb: 0.2, delay: { time: 0.3, feedback: 0.3, mix: 0 } }
  }
};