/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DrumInstrument = 'BD' | 'SD' | 'HC' | 'OH' | 'LT' | 'HT';

export interface Step {
  active: boolean;
  velocity: number; // 0 to 1
}

export interface BassStep {
  active: boolean;
  note: string; // e.g., 'C2'
  velocity: number;
  length: number; // in steps
}

export interface Pattern {
  id: string;
  name: string;
  drums: Record<DrumInstrument, Step[]>;
  bass: BassStep[];
}

export interface ArrangementRegion {
  id: string;
  patternId: string;
  startStep: number;
  length: number;
}

export interface Project {
  name: string;
  bpm: number;
  swing: number;
  patterns: Pattern[];
  arrangement: ArrangementRegion[];
  mixer: {
    drums: { volume: number; eq: { low: number; mid: number; high: number } };
    bass: { volume: number; eq: { low: number; mid: number; high: number } };
    master: { volume: number; drive: number };
  };
}
