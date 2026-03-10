export type DrumInstrument = 'BD' | 'SD' | 'HC' | 'OH' | 'LT' | 'HT';

export interface Step { active: boolean; velocity: number; }
export interface NoteStep { active: boolean; note: string; velocity: number; length: number; }

export interface Pattern {
  id: string;
  name: string;
  drums: Record<DrumInstrument, Step[]>;
  bass: NoteStep[];
  synth: NoteStep[];
  samplerSteps?: boolean[][]; // [padId 0-15][step 0-15]
  polySynth?: ChordStep[];    // 16 chord steps
  drum2?: Drum2Track[];       // 8 tracks × 16 steps
  lead?: NoteStep[];
  fm?: NoteStep[];
  pluck?: NoteStep[];
  stab?: NoteStep[];
}

export interface ArrangementRegion { id: string; patternId: string; startStep: number; length: number; }

export interface DrumVoiceParams {
  tune: number;
  decay: number;
  mute?: boolean;
  solo?: boolean;
}

export interface ChannelMixer {
  volume: number;
  eq: { low: number; mid: number; high: number };
  reverb?: number;                                    // send amount 0-1
  delay?: { time: number; feedback: number; mix: number }; // mix = send amount
  driveSend?: number;                                 // drive send amount 0-1
}

export interface MasterDelay {
  time: number;
  feedback: number;
  mix: number;
}

// ─── Sampler ────────────────────────────────────────────────────────────────

export interface SamplerEnvelope {
  start: number;    // 0.0 – 1.0  normalised start offset in the buffer
  end: number;      // 0.0 – 1.0  normalised end offset in the buffer (> start)
  length: number;   // 0.0 – 1.0  amplitude level during playback
  envelope: number; // 0.001 – 4.0 s  fade-out / release time at the end
}

export interface SamplerFilter {
  cutoff: number;    // 20 – 20000 Hz
  resonance: number; // 0.0 – 20.0 (Q)
}

/** Serialisable per-pad state. AudioBuffer is held separately in a ref. */
export interface SamplerPad {
  id: number;
  label: string;
  fileName: string | null;
  volume: number;       // 0.0 – 1.5
  pitch: number;        // semitones -24 – +24
  envelope: SamplerEnvelope;
  filter: SamplerFilter;
  mute: boolean;
  solo: boolean;
  color: string;
}

export type PadLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

// ─── Lead Synth ──────────────────────────────────────────────────────────────

export interface LeadSynthParams {
  waveform: 'sawtooth' | 'square';
  octave: number;
  cutoff: number;
  resonance: number;
  attack: number;
  decay: number;
  portamento: number;
}

// ─── FM Synthesizer ───────────────────────────────────────────────────────────

export interface FMSynthParams {
  ratio: number;
  modIndex: number;
  attack: number;
  decay: number;
  octave: number;
  feedback: number;
}

// ─── Pluck Synth ──────────────────────────────────────────────────────────────

export interface PluckSynthParams {
  damping: number;
  brightness: number;
  body: number;
  octave: number;
}

// ─── Chord Stab ───────────────────────────────────────────────────────────────

export interface ChordStabParams {
  waveform: 'sawtooth' | 'square';
  octave: number;
  cutoff: number;
  attack: number;
  decay: number;
  spread: number;
}

// ─── Poly Synth ──────────────────────────────────────────────────────────────

export interface ChordStep { active: boolean; chord: string[]; velocity: number; length: number; }

export interface PolySynthParams {
  oscMix: number;
  subLevel: number;
  cutoff: number;
  resonance: number;
  envMod: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  chorus: number;
  octave: number;
}

// ─── Drum2 (Digitakt-style) ───────────────────────────────────────────────────

export interface Drum2Track { name: string; steps: Step[]; mute?: boolean; solo?: boolean; tune?: number; decay?: number; }

// ─── Arrangement ─────────────────────────────────────────────────────────────

export interface ArrangementBlock {
  id: string;
  patternId: string;
  startBar: number;
  lengthBars: number;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  name: string;
  bpm: number;
  swing: number;
  patterns: Pattern[];
  arrangement: ArrangementRegion[];
  arrangementBlocks?: ArrangementBlock[];

  drumKit?: '808' | '909';
  bassPreset?: string;
  synthPreset?: string;
  drumParams?: Record<string, DrumVoiceParams>;
  bassParams?: { waveform: 'sawtooth' | 'square'; octave: number; cutoff: number; resonance: number; envMod: number; decay: number; };
  synthParams?: { octave: number; attack: number; release: number; cutoff: number; detune: number; };
  polySynthParams?: PolySynthParams;
  leadParams?: LeadSynthParams;
  leadPreset?: string;
  fmParams?: FMSynthParams;
  fmPreset?: string;
  pluckParams?: PluckSynthParams;
  pluckPreset?: string;
  stabParams?: ChordStabParams;
  stabPreset?: string;

  poweredOn?: {
    drums: boolean;
    bass: boolean;
    synth: boolean;
    polySynth: boolean;
    drum2: boolean;
    sampler: boolean;
    lead: boolean;
    fm: boolean;
    pluck: boolean;
    stab: boolean;
  };

  mixer: {
    drums: ChannelMixer;
    bass: ChannelMixer;
    synth: ChannelMixer;
    sampler: ChannelMixer;
    polySynth?: ChannelMixer;
    drum2?: ChannelMixer;
    lead?: ChannelMixer;
    fm?: ChannelMixer;
    pluck?: ChannelMixer;
    stab?: ChannelMixer;
    effects: {
      reverb: { return: number };
      delay:  { time: number; feedback: number; return: number };
      drive:  { amount: number; return: number };
    };
    master: {
      volume: number;
      reverb: number;
      delay: MasterDelay;
      compressor?: {
        threshold: number;
        knee: number;
        ratio: number;
        attack: number;
        release: number;
      };
    };
  };
}