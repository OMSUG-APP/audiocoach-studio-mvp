export type DrumInstrument = 'BD' | 'SD' | 'HC' | 'OH' | 'LT' | 'HT';

export interface Step {
  active: boolean;
  velocity: number;
}

export interface BassStep {
  active: boolean;
  note: string;
  velocity: number;
  length: number;
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
  mixer: any; 
  drumParams?: Record<string, { tune: number; decay: number }>;
  // NEW: The Acid Package
  bassParams?: {
    waveform: 'sawtooth' | 'square';
    cutoff: number;
    resonance: number;
    envMod: number;
    decay: number;
  };
}