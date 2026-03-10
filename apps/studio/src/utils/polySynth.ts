import { PolySynthParams } from '../types';

const NOTE_FREQS: Record<string, number> = {
  'C': 261.63, 'C#': 277.18, 'Db': 277.18,
  'D': 293.66, 'D#': 311.13, 'Eb': 311.13,
  'E': 329.63, 'F': 349.23, 'F#': 369.99, 'Gb': 369.99,
  'G': 392.00, 'G#': 415.30, 'Ab': 415.30,
  'A': 440.00, 'A#': 466.16, 'Bb': 466.16,
  'B': 493.88,
};

function noteToFreq(note: string): number {
  // Parse e.g. "C4", "F#3", "Bb5"
  const match = note.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) return 440;
  const [, name, octStr] = match;
  const base = NOTE_FREQS[name] || 440;
  const oct = parseInt(octStr, 10);
  return base * Math.pow(2, oct - 4);
}

interface Voice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  sub: OscillatorNode;
  subGain: GainNode;
  filter: BiquadFilterNode;
  amp: GainNode;
  startedAt: number;
  noteFreq: number;
}

export function createPolySynthEngine(ctx: AudioContext, dest: AudioNode) {
  const NUM_VOICES = 6;
  const voices: (Voice | null)[] = Array(NUM_VOICES).fill(null);
  let voiceIndex = 0;

  function allocateVoice(): number {
    // Round-robin allocation
    const idx = voiceIndex % NUM_VOICES;
    voiceIndex++;
    return idx;
  }

  function stopVoice(v: Voice | null, time: number) {
    if (!v) return;
    try {
      v.amp.gain.setTargetAtTime(0, time, 0.02);
      v.osc1.stop(time + 0.1);
      v.osc2.stop(time + 0.1);
      v.sub.stop(time + 0.1);
    } catch (_) { /* already stopped */ }
  }

  function triggerChord(time: number, chordNotes: string[], velocity: number, params: PolySynthParams) {
    const {
      oscMix = 0.5, subLevel = 0.2, cutoff = 0.5, resonance = 0.2,
      envMod = 0.4, attack = 0.01, decay = 0.3, sustain = 0.5, release = 0.4,
      octave = 4,
    } = params;

    // Max cutoff 12000 Hz, min 80 Hz
    const filterFreq = 80 + cutoff * cutoff * 11920;
    const filterQ = 0.5 + resonance * 20;
    const envModFreq = filterFreq + envMod * 6000;

    chordNotes.forEach((note) => {
      const idx = allocateVoice();
      stopVoice(voices[idx], time);

      const freq = noteToFreq(note) * Math.pow(2, octave - 4);

      // Oscillators
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.value = freq;
      osc2.detune.value = 7; // slight detune for width

      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = freq / 2;

      // Gains
      const osc1Gain = ctx.createGain();
      osc1Gain.gain.value = 1 - oscMix;
      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = oscMix;
      const subGain = ctx.createGain();
      subGain.gain.value = subLevel;

      // Filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(envModFreq, time);
      filter.frequency.exponentialRampToValueAtTime(Math.max(filterFreq, 20), time + decay);
      filter.Q.value = filterQ;

      // Amp envelope
      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0, time);
      amp.gain.linearRampToValueAtTime(velocity * 0.4, time + Math.max(attack, 0.001));
      amp.gain.setTargetAtTime(velocity * 0.4 * sustain, time + attack, decay * 0.3);

      // Wire
      osc1.connect(osc1Gain);
      osc2.connect(osc2Gain);
      sub.connect(subGain);
      osc1Gain.connect(filter);
      osc2Gain.connect(filter);
      subGain.connect(filter);
      filter.connect(amp);
      amp.connect(dest);

      osc1.start(time);
      osc2.start(time);
      sub.start(time);

      const stopTime = time + attack + decay + release + 0.1;
      amp.gain.setTargetAtTime(0, time + attack + decay, Math.max(release, 0.01));
      osc1.stop(stopTime);
      osc2.stop(stopTime);
      sub.stop(stopTime);

      voices[idx] = { osc1, osc2, sub, subGain, filter, amp, startedAt: time, noteFreq: freq };
    });
  }

  return { triggerChord };
}
