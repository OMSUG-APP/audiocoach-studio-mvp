/**
 * Synthesises percussive / tonal sounds for a sampler pad using OfflineAudioContext.
 * Sounds are organised by category; generatePadSound picks a random variant within
 * the requested category on each call.
 */

// ─── Public types ──────────────────────────────────────────────────────────────

export type SoundCategory = 'beats' | 'metallic' | 'industrial' | 'synth' | 'percussion' | 'ambient';

export const SOUND_CATEGORIES: { value: SoundCategory; label: string }[] = [
  { value: 'beats',      label: 'Beats'      },
  { value: 'metallic',   label: 'Metallic'   },
  { value: 'industrial', label: 'Industrial' },
  { value: 'synth',      label: 'Synth'      },
  { value: 'percussion', label: 'Percussion' },
  { value: 'ambient',    label: 'Ambient'    },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function makeNoise(ctx: OfflineAudioContext, durationSec: number): AudioBufferSourceNode {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * durationSec));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

// ─── Category generators ───────────────────────────────────────────────────────

type Variant = { label: string; fn: (ctx: OfflineAudioContext, t: number) => void };

// ── Beats ──────────────────────────────────────────────────────────────────────

const BEATS: Variant[] = [
  {
    label: 'Kick',
    fn(ctx, t) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.connect(amp); amp.connect(ctx.destination);
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
      amp.gain.setValueAtTime(1.0, t);
      amp.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.start(t); osc.stop(t + 0.55);
    },
  },
  {
    label: 'Snare',
    fn(ctx, t) {
      const noise = makeNoise(ctx, 0.25);
      const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 600;
      const amp = ctx.createGain();
      noise.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.8, t); amp.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      noise.start(t); noise.stop(t + 0.3);
      const tone = ctx.createOscillator(); tone.type = 'triangle'; tone.frequency.value = 180;
      const tAmp = ctx.createGain();
      tone.connect(tAmp); tAmp.connect(ctx.destination);
      tAmp.gain.setValueAtTime(0.3, t); tAmp.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      tone.start(t); tone.stop(t + 0.15);
    },
  },
  {
    label: 'HiHat',
    fn(ctx, t) {
      const noise = makeNoise(ctx, 0.06);
      const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 8000;
      const amp = ctx.createGain();
      noise.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.5, t); amp.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
      noise.start(t); noise.stop(t + 0.08);
    },
  },
  {
    label: 'OpenHat',
    fn(ctx, t) {
      const noise = makeNoise(ctx, 0.35);
      const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 9000; filt.Q.value = 0.5;
      const amp = ctx.createGain();
      noise.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.5, t); amp.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      noise.start(t); noise.stop(t + 0.4);
    },
  },
  {
    label: 'Clap',
    fn(ctx, t) {
      for (const offset of [0, 0.012, 0.022]) {
        const noise = makeNoise(ctx, 0.08);
        const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1200;
        const amp = ctx.createGain();
        noise.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
        amp.gain.setValueAtTime(0.6, t + offset); amp.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.08);
        noise.start(t + offset); noise.stop(t + offset + 0.1);
      }
    },
  },
  {
    label: 'Rimshot',
    fn(ctx, t) {
      const noise = makeNoise(ctx, 0.04);
      const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2500; filt.Q.value = 2;
      const amp = ctx.createGain();
      noise.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.8, t); amp.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
      noise.start(t); noise.stop(t + 0.06);
    },
  },
];

// ── Metallic ───────────────────────────────────────────────────────────────────

const METALLIC: Variant[] = [
  {
    label: 'Cowbell',
    fn(ctx, t) {
      for (const freq of [562, 845]) {
        const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq;
        const amp = ctx.createGain();
        osc.connect(amp); amp.connect(ctx.destination);
        amp.gain.setValueAtTime(0.3, t); amp.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        osc.start(t); osc.stop(t + 0.65);
      }
    },
  },
  {
    label: 'Clave',
    fn(ctx, t) {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 1200;
      const amp = ctx.createGain();
      osc.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.9, t); amp.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
      osc.start(t); osc.stop(t + 0.06);
    },
  },
  {
    label: 'Bell',
    fn(ctx, t) {
      for (const [freq, gain] of [[880, 0.5], [1760, 0.2], [2640, 0.1]] as [number, number][]) {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const amp = ctx.createGain();
        osc.connect(amp); amp.connect(ctx.destination);
        amp.gain.setValueAtTime(gain, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc.start(t); osc.stop(t + 1.25);
      }
    },
  },
  {
    label: 'MetalHit',
    fn(ctx, t) {
      for (const freq of [400, 413, 600, 631]) {
        const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq;
        const amp = ctx.createGain();
        osc.connect(amp); amp.connect(ctx.destination);
        amp.gain.setValueAtTime(0.15, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.35);
      }
    },
  },
  {
    label: 'Triangle',
    fn(ctx, t) {
      // High triangle + noise tail
      const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 3500;
      const amp = ctx.createGain();
      osc.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.7, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.start(t); osc.stop(t + 0.85);
      const noise = makeNoise(ctx, 0.05);
      const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 6000;
      const nAmp = ctx.createGain();
      noise.connect(filt); filt.connect(nAmp); nAmp.connect(ctx.destination);
      nAmp.gain.setValueAtTime(0.3, t); nAmp.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      noise.start(t); noise.stop(t + 0.06);
    },
  },
];

// ── Industrial ─────────────────────────────────────────────────────────────────

const INDUSTRIAL: Variant[] = [
  {
    label: 'NoiseBlast',
    fn(ctx, t) {
      const noise = makeNoise(ctx, 0.3);
      const amp = ctx.createGain();
      noise.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.9, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      noise.start(t); noise.stop(t + 0.35);
    },
  },
  {
    label: 'Grind',
    fn(ctx, t) {
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 80;
      const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 800; filt.Q.value = 3;
      const amp = ctx.createGain();
      osc.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.8, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      // Pitch stutter
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.setValueAtTime(160, t + 0.05);
      osc.frequency.setValueAtTime(80, t + 0.1);
      osc.start(t); osc.stop(t + 0.3);
    },
  },
  {
    label: 'Clank',
    fn(ctx, t) {
      const noise = makeNoise(ctx, 0.08);
      const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 4000; filt.Q.value = 5;
      const amp = ctx.createGain();
      noise.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(1.0, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      noise.start(t); noise.stop(t + 0.1);
      // Low thud underneath
      const osc = ctx.createOscillator(); osc.frequency.value = 60;
      const oAmp = ctx.createGain();
      osc.connect(oAmp); oAmp.connect(ctx.destination);
      oAmp.gain.setValueAtTime(0.6, t); oAmp.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.start(t); osc.stop(t + 0.08);
    },
  },
  {
    label: 'Thud',
    fn(ctx, t) {
      // Very low sine drop + heavy noise
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.connect(amp); amp.connect(ctx.destination);
      osc.frequency.setValueAtTime(60, t); osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.4);
      amp.gain.setValueAtTime(1.0, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t); osc.stop(t + 0.45);
      const noise = makeNoise(ctx, 0.1);
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300;
      const nAmp = ctx.createGain();
      noise.connect(filt); filt.connect(nAmp); nAmp.connect(ctx.destination);
      nAmp.gain.setValueAtTime(0.5, t); nAmp.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      noise.start(t); noise.stop(t + 0.12);
    },
  },
  {
    label: 'StampPress',
    fn(ctx, t) {
      // Descending square burst + noise
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator(); osc.type = 'square';
        osc.frequency.value = 200 - i * 40;
        const amp = ctx.createGain();
        osc.connect(amp); amp.connect(ctx.destination);
        amp.gain.setValueAtTime(0.2, t + i * 0.015); amp.gain.exponentialRampToValueAtTime(0.001, t + i * 0.015 + 0.04);
        osc.start(t + i * 0.015); osc.stop(t + i * 0.015 + 0.05);
      }
      const noise = makeNoise(ctx, 0.15);
      const nAmp = ctx.createGain();
      noise.connect(nAmp); nAmp.connect(ctx.destination);
      nAmp.gain.setValueAtTime(0.4, t); nAmp.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      noise.start(t); noise.stop(t + 0.18);
    },
  },
];

// ── Synth ──────────────────────────────────────────────────────────────────────

const SYNTH: Variant[] = [
  {
    label: 'BassNote',
    fn(ctx, t) {
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 55;
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
      const amp = ctx.createGain();
      osc.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.8, t + 0.01);
      amp.gain.setValueAtTime(0.8, t + 0.3); amp.gain.linearRampToValueAtTime(0, t + 0.85);
      osc.start(t); osc.stop(t + 0.9);
    },
  },
  {
    label: 'ChordStab',
    fn(ctx, t) {
      // Root (220 Hz) + fifth (330 Hz) + octave (440 Hz)
      for (const freq of [220, 330, 440, 550]) {
        const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq;
        const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 2000;
        const amp = ctx.createGain();
        osc.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
        amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.18, t + 0.005);
        amp.gain.setValueAtTime(0.18, t + 0.15); amp.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.start(t); osc.stop(t + 0.45);
      }
    },
  },
  {
    label: 'LeadBlip',
    fn(ctx, t) {
      const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 440;
      const amp = ctx.createGain();
      osc.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.7, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t); osc.stop(t + 0.18);
    },
  },
  {
    label: 'PadSwell',
    fn(ctx, t) {
      for (const freq of [110, 165, 220]) {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const amp = ctx.createGain();
        osc.connect(amp); amp.connect(ctx.destination);
        amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.25, t + 0.3);
        amp.gain.setValueAtTime(0.25, t + 0.8); amp.gain.linearRampToValueAtTime(0, t + 1.4);
        osc.start(t); osc.stop(t + 1.45);
      }
    },
  },
  {
    label: 'Arp',
    fn(ctx, t) {
      const notes = [261, 329, 392, 523];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq;
        const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 1200;
        const amp = ctx.createGain();
        osc.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
        const s = t + i * 0.1;
        amp.gain.setValueAtTime(0.3, s); amp.gain.exponentialRampToValueAtTime(0.001, s + 0.09);
        osc.start(s); osc.stop(s + 0.1);
      });
    },
  },
];

// ── Percussion ─────────────────────────────────────────────────────────────────

const PERCUSSION: Variant[] = [
  {
    label: 'TomLo',
    fn(ctx, t) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.connect(amp); amp.connect(ctx.destination);
      osc.frequency.setValueAtTime(80, t); osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
      amp.gain.setValueAtTime(0.9, t); amp.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t); osc.stop(t + 0.45);
    },
  },
  {
    label: 'TomHi',
    fn(ctx, t) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.connect(amp); amp.connect(ctx.destination);
      osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(120, t + 0.2);
      amp.gain.setValueAtTime(0.8, t); amp.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.start(t); osc.stop(t + 0.3);
    },
  },
  {
    label: 'WoodBlock',
    fn(ctx, t) {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 800;
      const noise = makeNoise(ctx, 0.03);
      const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1500; filt.Q.value = 3;
      const amp = ctx.createGain(); const nAmp = ctx.createGain();
      osc.connect(amp); amp.connect(ctx.destination);
      noise.connect(filt); filt.connect(nAmp); nAmp.connect(ctx.destination);
      amp.gain.setValueAtTime(0.6, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      nAmp.gain.setValueAtTime(0.4, t); nAmp.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      osc.start(t); osc.stop(t + 0.06);
      noise.start(t); noise.stop(t + 0.04);
    },
  },
  {
    label: 'Bongo',
    fn(ctx, t) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.connect(amp); amp.connect(ctx.destination);
      osc.frequency.setValueAtTime(320, t); osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
      amp.gain.setValueAtTime(0.7, t); amp.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.2);
    },
  },
  {
    label: 'Shaker',
    fn(ctx, t) {
      for (let i = 0; i < 3; i++) {
        const noise = makeNoise(ctx, 0.04);
        const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 6000; filt.Q.value = 1;
        const amp = ctx.createGain();
        noise.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
        const s = t + i * 0.06;
        amp.gain.setValueAtTime(0.4, s); amp.gain.exponentialRampToValueAtTime(0.001, s + 0.04);
        noise.start(s); noise.stop(s + 0.05);
      }
    },
  },
];

// ── Ambient ────────────────────────────────────────────────────────────────────

const AMBIENT: Variant[] = [
  {
    label: 'Shimmer',
    fn(ctx, t) {
      for (const freq of [880, 1320, 1760, 2200, 2640]) {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const amp = ctx.createGain();
        osc.connect(amp); amp.connect(ctx.destination);
        const delay = Math.random() * 0.1;
        amp.gain.setValueAtTime(0, t + delay);
        amp.gain.linearRampToValueAtTime(0.06, t + delay + 0.2);
        amp.gain.linearRampToValueAtTime(0, t + delay + 1.3);
        osc.start(t + delay); osc.stop(t + delay + 1.4);
      }
    },
  },
  {
    label: 'Texture',
    fn(ctx, t) {
      const noise = makeNoise(ctx, 1.4);
      const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 600; filt.Q.value = 0.5;
      const amp = ctx.createGain();
      noise.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(0.3, t + 0.4);
      amp.gain.linearRampToValueAtTime(0, t + 1.4);
      noise.start(t); noise.stop(t + 1.45);
    },
  },
  {
    label: 'Drone',
    fn(ctx, t) {
      for (const [freq, detune] of [[110, 0], [110, 5], [220, 2]] as [number, number][]) {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq; osc.detune.value = detune;
        const amp = ctx.createGain();
        osc.connect(amp); amp.connect(ctx.destination);
        amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.2, t + 0.5);
        amp.gain.setValueAtTime(0.2, t + 1.0); amp.gain.linearRampToValueAtTime(0, t + 1.4);
        osc.start(t); osc.stop(t + 1.45);
      }
    },
  },
  {
    label: 'Swell',
    fn(ctx, t) {
      const noise = makeNoise(ctx, 1.4);
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
      const amp = ctx.createGain();
      noise.connect(filt); filt.connect(amp); amp.connect(ctx.destination);
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.4, t + 0.8);
      amp.gain.linearRampToValueAtTime(0, t + 1.4);
      noise.start(t); noise.stop(t + 1.45);
      // Overtone melody
      const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 330;
      const oAmp = ctx.createGain();
      osc.connect(oAmp); oAmp.connect(ctx.destination);
      oAmp.gain.setValueAtTime(0, t + 0.4); oAmp.gain.linearRampToValueAtTime(0.15, t + 0.9);
      oAmp.gain.linearRampToValueAtTime(0, t + 1.4);
      osc.start(t + 0.4); osc.stop(t + 1.45);
    },
  },
];

// ─── Category map ──────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<SoundCategory, Variant[]> = {
  beats:      BEATS,
  metallic:   METALLIC,
  industrial: INDUSTRIAL,
  synth:      SYNTH,
  percussion: PERCUSSION,
  ambient:    AMBIENT,
};

// ─── Public entry point ────────────────────────────────────────────────────────

export async function generatePadSound(
  _padIndex: number,
  category: SoundCategory = 'beats',
): Promise<{ buffer: AudioBuffer; label: string }> {
  const sampleRate = 44100;
  const duration   = 1.5;
  const ctx        = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);
  const t          = 0.001;

  const variant = pick(CATEGORY_MAP[category]);
  variant.fn(ctx, t);

  const buffer = await ctx.startRendering();
  return { buffer, label: variant.label };
}
