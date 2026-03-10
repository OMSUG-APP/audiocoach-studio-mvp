/** Step-based JSON format for AI-generated patterns */

export interface DrumStepData {
  BD: boolean[]; // 16 steps
  SD: boolean[];
  HC: boolean[];
  OH: boolean[];
  LT: boolean[];
  HT: boolean[];
}

export interface BassStepData {
  note: string;
  active: boolean;
  velocity: number;
  length: number;
}

export interface ChordStepData {
  chord: string[];
  active: boolean;
  velocity: number;
  length: number;
}

export interface BeatPatternResponse {
  drums: DrumStepData;
  description?: string;
}

export interface ChordPatternResponse {
  steps: ChordStepData[];
  description?: string;
}

export interface SynthPatchResponse {
  instrument: 'bass' | 'pad' | 'polysynth';
  params: Record<string, number | string>;
  description?: string;
}
