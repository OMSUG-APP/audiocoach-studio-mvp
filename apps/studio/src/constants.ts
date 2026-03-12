import { Project, Pattern, PolySynthParams, LeadSynthParams, FMSynthParams, PluckSynthParams, ChordStabParams } from './types';

export const BASS_PRESETS: Record<string, { waveform: 'sawtooth' | 'square'; octave: number; cutoff: number; resonance: number; envMod: number; decay: number }> = {
  '303':   { waveform: 'sawtooth', octave: 2, cutoff: 0.35, resonance: 0.75, envMod: 0.8,  decay: 0.3  },
  'ORGAN': { waveform: 'square',   octave: 3, cutoff: 0.70, resonance: 0.05, envMod: 0.05, decay: 0.7  },
  'WOBBLE':{ waveform: 'sawtooth', octave: 2, cutoff: 0.20, resonance: 0.65, envMod: 0.6,  decay: 0.15 },
  'SUB':   { waveform: 'square',   octave: 1, cutoff: 0.18, resonance: 0.05, envMod: 0.05, decay: 0.9  },
};

export const SYNTH_PRESETS: Record<string, { octave: number; attack: number; release: number; cutoff: number; detune: number }> = {
  'ORGANIC':  { octave: 4, attack: 0.35, release: 0.55, cutoff: 0.55, detune: 0.2  },
  'METAL':    { octave: 4, attack: 0.05, release: 0.25, cutoff: 0.85, detune: 0.75 },
  'HEAVENLY': { octave: 5, attack: 0.65, release: 0.80, cutoff: 0.45, detune: 0.4  },
  'TEXTURED': { octave: 3, attack: 0.25, release: 0.50, cutoff: 0.25, detune: 0.85 },
};

export const LEAD_PRESETS: Record<string, LeadSynthParams> = {
  'BRIGHT': { waveform: 'sawtooth', octave: 4, cutoff: 0.8,  resonance: 0.3,  attack: 0.01, decay: 0.3, portamento: 0.0 },
  'DARK':   { waveform: 'sawtooth', octave: 3, cutoff: 0.2,  resonance: 0.6,  attack: 0.05, decay: 0.5, portamento: 0.1 },
  'ACID':   { waveform: 'square',   octave: 3, cutoff: 0.35, resonance: 0.85, attack: 0.01, decay: 0.2, portamento: 0.2 },
  'SOFT':   { waveform: 'square',   octave: 4, cutoff: 0.5,  resonance: 0.1,  attack: 0.15, decay: 0.6, portamento: 0.0 },
};

export const FM_PRESETS: Record<string, FMSynthParams> = {
  'BELL':  { ratio: 0.5, modIndex: 0.7, attack: 0.01, decay: 0.8, octave: 5, feedback: 0.0 },
  'METAL': { ratio: 0.8, modIndex: 0.9, attack: 0.01, decay: 0.3, octave: 4, feedback: 0.3 },
  'KEYS':  { ratio: 0.3, modIndex: 0.5, attack: 0.02, decay: 0.5, octave: 4, feedback: 0.1 },
  'GLASS': { ratio: 0.6, modIndex: 0.3, attack: 0.05, decay: 0.9, octave: 5, feedback: 0.0 },
};

export const PLUCK_PRESETS: Record<string, PluckSynthParams> = {
  'GUITAR': { damping: 0.7, brightness: 0.8, body: 0.5, octave: 3 },
  'HARP':   { damping: 0.4, brightness: 0.9, body: 0.3, octave: 4 },
  'KOTO':   { damping: 0.6, brightness: 0.7, body: 0.7, octave: 3 },
  'MUTED':  { damping: 0.9, brightness: 0.4, body: 0.4, octave: 3 },
};

export const STAB_PRESETS: Record<string, ChordStabParams> = {
  'HOUSE':  { waveform: 'sawtooth', octave: 4, cutoff: 0.7, attack: 0.01, decay: 0.15, spread: 0.3 },
  'TECHNO': { waveform: 'square',   octave: 3, cutoff: 0.5, attack: 0.01, decay: 0.1,  spread: 0.5 },
  'SOFT':   { waveform: 'sawtooth', octave: 4, cutoff: 0.4, attack: 0.05, decay: 0.3,  spread: 0.2 },
  'HARD':   { waveform: 'square',   octave: 3, cutoff: 0.9, attack: 0.01, decay: 0.08, spread: 0.6 },
};

export const DRUM_KIT_PROFILES = {
  '808': {
    BD: { freqMult: 1.0, decayMult: 1.2 },
    SD: { freqMult: 1.0, decayMult: 1.15 },
    HC: { freqMult: 0.8, decayMult: 1.1 },
    OH: { freqMult: 0.9, decayMult: 1.3 },
    LT: { freqMult: 0.75, decayMult: 1.4 },
    HT: { freqMult: 0.65, decayMult: 1.2 },
  },
  '909': {
    BD: { freqMult: 0.85, decayMult: 0.7 },
    SD: { freqMult: 1.2, decayMult: 0.8 },
    HC: { freqMult: 1.25, decayMult: 0.5 },
    OH: { freqMult: 1.1, decayMult: 0.7 },
    LT: { freqMult: 1.3, decayMult: 0.6 },
    HT: { freqMult: 1.2, decayMult: 0.6 },
  }
} as const;

export const DRUM2_TRACK_NAMES = ['BD2', 'SD2', 'HH2', 'OH2', 'CL', 'RIM', 'CP', 'CB'];

export const INITIAL_POLY_SYNTH_PARAMS: PolySynthParams = {
  oscMix: 0.5, subLevel: 0.2, cutoff: 0.5, resonance: 0.2,
  envMod: 0.4, attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.4,
  chorus: 0.3, octave: 4,
};

export const INITIAL_PATTERN = (id: string, name: string): Pattern => ({
  id,
  name,
  drums: {
    BD: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
    SD: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
    HC: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
    OH: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
    LT: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
    HT: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
  },
  bass: Array.from({ length: 16 }, () => ({ active: false, note: '', velocity: 0.8, length: 1 })),
  synth: Array.from({ length: 16 }, () => ({ active: false, note: '', velocity: 0.6, length: 4 })),
  samplerSteps: Array.from({ length: 16 }, () => Array(16).fill(false)),
  polySynth: Array.from({ length: 32 }, () => ({ active: false, chord: [], velocity: 0.7, length: 4 })),
  lead:  Array.from({ length: 16 }, () => ({ active: false, note: '', velocity: 0.6, length: 4 })),
  fm:    Array.from({ length: 16 }, () => ({ active: false, note: '', velocity: 0.6, length: 4 })),
  pluck: Array.from({ length: 32 }, () => ({ active: false, note: '', velocity: 0.6, length: 4 })),
  stab:  Array.from({ length: 16 }, () => ({ active: false, note: '', velocity: 0.6, length: 4 })),
  drum2: DRUM2_TRACK_NAMES.map(name => ({
    name,
    steps: Array.from({ length: 32 }, () => ({ active: false, velocity: 0.8 })),
  })),
});

export const INITIAL_PROJECT: Project = {
  name: 'Untitled Project',
  bpm: 120,
  swing: 0,
  patterns: [INITIAL_PATTERN('p1', 'Pattern 1')],
  arrangement: [{ id: 'a1', patternId: 'p1', startStep: 0, length: 16 }],
  arrangementBlocks: [{ id: 'ab1', patternId: 'p1', startBar: 0, lengthBars: 4 }],
  instrumentOrder: ['drums', 'drum2', 'sampler', 'bass', 'pad', 'polySynth', 'lead', 'fm', 'pluck', 'stab'],
  drumKit: '808',
  polySynthParams: INITIAL_POLY_SYNTH_PARAMS,
  poweredOn: {
    drums: true, bass: true, synth: true, polySynth: true, drum2: true, sampler: true,
    lead: true, fm: true, pluck: true, stab: true,
  },
  mixer: {
    drums:     { volume: 0.8, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 }, driveSend: 0 },
    bass:      { volume: 0.8, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 }, driveSend: 0 },
    synth:     { volume: 0.7, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 }, driveSend: 0 },
    sampler:   { volume: 0.8, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 } },
    polySynth: { volume: 0.7, eq: { low: 0, mid: 0, high: 0 }, reverb: 0.1, delay: { time: 0.3, feedback: 0.3, mix: 0 }, driveSend: 0 },
    drum2:     { volume: 0.8, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 }, driveSend: 0 },
    lead:      { volume: 0.7, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 }, driveSend: 0 },
    fm:        { volume: 0.7, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 }, driveSend: 0 },
    pluck:     { volume: 0.7, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 }, driveSend: 0 },
    stab:      { volume: 0.7, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 }, driveSend: 0 },
    effects: {
      reverb: { return: 0.8 },
      delay:  { time: 0.3, feedback: 0.3, return: 0.8 },
      drive:  { amount: 0, return: 0.8 },
    },
    master: { volume: 1.0, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 }, compressor: { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 } }
  },
  bassParams: { waveform: 'sawtooth', octave: 2, cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 },
  synthParams: { octave: 4, attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 },
  leadParams:  { waveform: 'sawtooth', octave: 4, cutoff: 0.8,  resonance: 0.3,  attack: 0.01, decay: 0.3, portamento: 0.0 },
  fmParams:    { ratio: 0.5, modIndex: 0.7, attack: 0.01, decay: 0.8, octave: 5, feedback: 0.0 },
  pluckParams: { damping: 0.7, brightness: 0.8, body: 0.5, octave: 3 },
  stabParams:  { waveform: 'sawtooth', octave: 4, cutoff: 0.7, attack: 0.01, decay: 0.15, spread: 0.3 },
};