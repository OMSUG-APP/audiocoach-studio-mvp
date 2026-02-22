export type DrumLane = 'kick' | 'snare' | 'clap' | 'hat' | 'openhat' | 'rim';

export interface DrumStep {
  active: boolean;
  velocity: number; // 0-127
}

export interface BassStep {
  active: boolean;
  velocity: number; // 0-127
  note: number; // MIDI 0-127
  tie: boolean;
}

export interface DrumTrackData {
  type: 'drum';
  lanes: Record<DrumLane, DrumStep[]>; // 16 steps per lane
}

export interface BassTrackData {
  type: 'bass';
  steps: BassStep[]; // 16 steps
}

export type TrackData = DrumTrackData | BassTrackData;

export interface Pattern {
  id: string;
  tracks: TrackData[];
  swing: number; // 0-1
  chainNext: string | null; // patternId or null
}

export interface Region {
  id: string;
  patternId: string;
  startBar: number;
  lengthBars: number;
  muted: boolean;
}

export interface Project {
  id: string;
  name: string;
  version: number;
  bpm: number; // 60-200
  key: string;
  patterns: (Pattern | null)[]; // 32 slots
  arrangement: Region[];
}
