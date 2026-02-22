export type DrumVoice = 'kick' | 'snare' | 'clap' | 'closedHat' | 'openHat' | 'rim';

export interface VoiceParams {
  frequency?: number;
  decay?: number;
  tone?: number;
  snappy?: number;
  [key: string]: any;
}

export interface TriggerOptions {
  voice: DrumVoice;
  time: number;
  velocity: number;
  params?: VoiceParams;
}
