import { SamplerPad, SamplerEnvelope, SamplerFilter } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_ENVELOPE: SamplerEnvelope = {
  start: 0,      // play from the very beginning
  end: 1,        // play to the very end
  length: 1.0,   // full amplitude
  envelope: 0.1, // short 100 ms fade-out
};

export const DEFAULT_FILTER: SamplerFilter = {
  cutoff: 18000,
  resonance: 0.5,
};

/** 16 distinct accent colors, one per pad slot. */
export const PAD_COLORS: readonly string[] = [
  '#FF5F00', '#E05500', '#FF8C42', '#FFB347',
  '#10b981', '#059669', '#34d399', '#6ee7b7',
  '#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd',
  '#3b82f6', '#2563eb', '#60a5fa', '#93c5fd',
];

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createDefaultPad(id: number): SamplerPad {
  return {
    id,
    label: `PAD ${String(id + 1).padStart(2, '0')}`,
    fileName: null,
    volume: 1.0,
    pitch: 0,
    envelope: { ...DEFAULT_ENVELOPE },
    filter: { ...DEFAULT_FILTER },
    mute: false,
    solo: false,
    color: PAD_COLORS[id % PAD_COLORS.length],
  };
}

// ─── Audio file loading ───────────────────────────────────────────────────────

/**
 * Decodes a File into an AudioBuffer. Returns null on failure so the caller
 * can surface a user-facing error without throwing.
 */
export async function loadAudioFile(
  ctx: AudioContext,
  file: File,
): Promise<AudioBuffer | null> {
  try {
    const raw = await file.arrayBuffer();
    return await ctx.decodeAudioData(raw);
  } catch (err) {
    console.error(`[sampler] Failed to decode "${file.name}":`, err);
    return null;
  }
}

// ─── Mute / solo resolution ───────────────────────────────────────────────────

/**
 * Returns the effective gain (0 or 1) for a pad given the global mute/solo state.
 * Mirrors the drum mute/solo logic in useAudioEngine.ts.
 */
export function resolveGain(pad: SamplerPad, allPads: SamplerPad[]): number {
  const anySoloed = allPads.some(p => p.solo);
  if (pad.mute) return 0;
  if (anySoloed && !pad.solo) return 0;
  return 1;
}

// ─── Playback ─────────────────────────────────────────────────────────────────

/**
 * Triggers one-shot playback of a pad sample with start/end trim points.
 *
 * Signal chain:
 *   BufferSourceNode (pitch via detune, offset + duration from start/end)
 *   → BiquadFilterNode (lowpass)
 *   → GainNode (amplitude + fade-out)
 *   → destination
 *
 * Envelope strategy:
 *   - 5 ms linear fade-in to prevent clicks regardless of start point.
 *   - Holds at `length * volume` for the body of the sample.
 *   - Fades out over `envelope` seconds, timed to finish at the end of the
 *     trimmed region so the tail decays cleanly.
 *
 * Returns the source node so the caller can stop it early (retrigger).
 */
export function triggerSamplerPad(
  ctx: AudioContext,
  buffer: AudioBuffer,
  pad: SamplerPad,
  destination: AudioNode,
  triggerTime: number = ctx.currentTime,
): AudioBufferSourceNode {
  const { envelope: env, filter: flt, volume, pitch } = pad;

  // Normalised start/end → seconds
  const startOffset  = Math.max(0, env.start) * buffer.duration;
  const endOffset    = Math.min(1, Math.max(env.start + 0.001, env.end)) * buffer.duration;
  const playDuration = Math.max(0.01, endOffset - startOffset);

  // Source
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.detune.value = pitch * 100; // semitones → cents

  // Low-pass filter
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = Math.max(20, Math.min(20000, flt.cutoff));
  lpf.Q.value = Math.max(0.0001, flt.resonance);

  // Amplitude envelope
  const vca = ctx.createGain();
  const t0 = triggerTime;
  const level = env.length * volume;
  const fadeInEnd = t0 + 0.005;                             // 5 ms click-prevention
  const fadeOutDur = Math.max(0.005, env.envelope);
  const fadeOutStart = t0 + Math.max(0, playDuration - fadeOutDur);
  const fadeOutEnd   = fadeOutStart + fadeOutDur;

  vca.gain.setValueAtTime(0, t0);
  vca.gain.linearRampToValueAtTime(level, fadeInEnd);
  vca.gain.setValueAtTime(level, fadeOutStart);
  vca.gain.linearRampToValueAtTime(0.0001, fadeOutEnd);

  // Connect
  src.connect(lpf);
  lpf.connect(vca);
  vca.connect(destination);

  src.start(t0, startOffset, playDuration);
  src.stop(fadeOutEnd + 0.02);

  // Auto-disconnect after playback to avoid node leaks
  src.onended = () => {
    src.disconnect();
    lpf.disconnect();
    vca.disconnect();
  };

  return src;
}
