/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DrumInstrument, Pattern, Project } from './types';

export const DRUM_INSTRUMENTS: DrumInstrument[] = ['BD', 'SD', 'HC', 'OH', 'LT', 'HT'];

export const INITIAL_PATTERN = (id: string, name: string): Pattern => ({
  id,
  name,
  drums: {
    BD: Array(16).fill(null).map(() => ({ active: false, velocity: 0.8 })),
    SD: Array(16).fill(null).map(() => ({ active: false, velocity: 0.8 })),
    HC: Array(16).fill(null).map(() => ({ active: false, velocity: 0.8 })),
    OH: Array(16).fill(null).map(() => ({ active: false, velocity: 0.8 })),
    LT: Array(16).fill(null).map(() => ({ active: false, velocity: 0.8 })),
    HT: Array(16).fill(null).map(() => ({ active: false, velocity: 0.8 })),
  },
  bass: Array(16).fill(null).map(() => ({ active: false, note: 'C2', velocity: 0.8, length: 1 })),
});

export const INITIAL_PROJECT: Project = {
  name: 'New Project',
  bpm: 120,
  swing: 0,
  patterns: [INITIAL_PATTERN('p1', 'Pattern 1')],
  arrangement: [],
  mixer: {
    drums: { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } },
    bass: { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } },
    master: { volume: 0.8, drive: 0 },
  },
};

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const OCTAVES = [1, 2, 3];
