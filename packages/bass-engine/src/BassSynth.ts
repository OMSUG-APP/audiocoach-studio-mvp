/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OscillatorType = 'sawtooth' | 'square';

export interface ADSR {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export class BassSynth {
  private ctx: AudioContext;
  private mainOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private filter1: BiquadFilterNode;
  private filter2: BiquadFilterNode;
  private vca: GainNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  
  private currentMidiNote: number | null = null;
  private active: boolean = false;

  // Parameters
  public oscType: OscillatorType = 'sawtooth';
  public subLevel: number = 0.5;
  public cutoff: number = 1000;
  public resonance: number = 1;
  public adsr: ADSR = {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.5,
    release: 0.2
  };
  public lfoRate: number = 5;
  public lfoDepth: number = 500;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Filter chain (24dB/oct = two 12dB/oct in series)
    this.filter1 = this.ctx.createBiquadFilter();
    this.filter1.type = 'lowpass';
    
    this.filter2 = this.ctx.createBiquadFilter();
    this.filter2.type = 'lowpass';

    this.filter1.connect(this.filter2);

    // VCA
    this.vca = this.ctx.createGain();
    this.vca.gain.value = 0;
    this.filter2.connect(this.vca);

    // LFO
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = this.lfoRate;
    
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = this.lfoDepth;
    
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter1.frequency);
    this.lfoGain.connect(this.filter2.frequency);
    
    this.lfo.start();

    // Initialize oscillators (keep them running for monophonic)
    this.initOscillators();
  }

  private initOscillators() {
    const now = this.ctx.currentTime;
    
    if (this.mainOsc) this.mainOsc.stop();
    if (this.subOsc) this.subOsc.stop();

    this.mainOsc = this.ctx.createOscillator();
    this.mainOsc.type = this.oscType;
    
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'square';

    const subGain = this.ctx.createGain();
    subGain.gain.value = this.subLevel;

    this.mainOsc.connect(this.filter1);
    this.subOsc.connect(subGain);
    subGain.connect(this.filter1);

    this.mainOsc.start(now);
    this.subOsc.start(now);
  }

  public connect(destination: AudioNode) {
    this.vca.connect(destination);
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public triggerNote(midiNote: number, time: number, velocity: number, gateSeconds: number, tie: boolean) {
    const freq = this.midiToFreq(midiNote);
    const subFreq = freq / 2;
    const now = this.ctx.currentTime;
    const startTime = Math.max(time, now);
    const stopTime = startTime + gateSeconds;

    if (!this.mainOsc || !this.subOsc || this.mainOsc.type !== this.oscType) {
      this.initOscillators();
    }

    // Update LFO
    this.lfo.frequency.setTargetAtTime(this.lfoRate, startTime, 0.01);
    this.lfoGain.gain.setTargetAtTime(this.lfoDepth, startTime, 0.01);

    // Update Filter
    this.filter1.frequency.setTargetAtTime(this.cutoff, startTime, 0.01);
    this.filter1.Q.setTargetAtTime(this.resonance, startTime, 0.01);
    this.filter2.frequency.setTargetAtTime(this.cutoff, startTime, 0.01);
    this.filter2.Q.setTargetAtTime(this.resonance, startTime, 0.01);

    if (tie && this.active && this.mainOsc && this.subOsc) {
      // Legato / Portamento: Glide frequency
      this.mainOsc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.05);
      this.subOsc.frequency.exponentialRampToValueAtTime(subFreq, startTime + 0.05);
      
      // Do not retrigger envelope, but we need to ensure it stays at sustain level
      // or continues its current path. Usually legato means we just keep the gate open.
      this.vca.gain.cancelScheduledValues(startTime);
      // If we were in release, we might want to jump back to sustain? 
      // But "without retriggering" usually means the envelope state is preserved.
    } else {
      // New note / Retrigger: Jump frequency and trigger envelope
      this.mainOsc!.frequency.setValueAtTime(freq, startTime);
      this.subOsc!.frequency.setValueAtTime(subFreq, startTime);

      // Envelope trigger
      this.vca.gain.cancelScheduledValues(startTime);
      this.vca.gain.setValueAtTime(this.vca.gain.value, startTime);
      this.vca.gain.linearRampToValueAtTime(velocity, startTime + this.adsr.attack);
      this.vca.gain.linearRampToValueAtTime(velocity * this.adsr.sustain, startTime + this.adsr.attack + this.adsr.decay);
    }

    // Schedule release
    this.vca.gain.cancelScheduledValues(stopTime);
    this.vca.gain.setValueAtTime(velocity * this.adsr.sustain, stopTime);
    this.vca.gain.linearRampToValueAtTime(0, stopTime + this.adsr.release);

    this.currentMidiNote = midiNote;
    this.active = true;
  }
}
