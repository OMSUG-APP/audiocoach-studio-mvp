/**
 * Digitakt-style Drum2 engine.
 * Falls back to synthesised percussion when no sample is loaded.
 */
export function createDigitaktEngine(ctx: AudioContext, dest: AudioNode) {
  const buffers: (AudioBuffer | null)[] = Array(8).fill(null);

  function loadSample(trackIndex: number, buffer: AudioBuffer) {
    buffers[trackIndex] = buffer;
  }

  function triggerTrack(trackIndex: number, time: number, velocity: number) {
    const buffer = buffers[trackIndex];

    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const amp = ctx.createGain();
      amp.gain.value = velocity;
      src.connect(amp);
      amp.connect(dest);
      src.start(time);
    } else {
      // Synthesised fallback per track index
      syntheticFallback(trackIndex, time, velocity);
    }
  }

  function syntheticFallback(trackIndex: number, time: number, velocity: number) {
    const freqs  = [60, 200, 8000, 6000, 1000, 300, 1200, 800];
    const decays = [0.6, 0.15, 0.04, 0.12, 0.08, 0.05, 0.12, 0.08];

    if (trackIndex === 0) {
      // Kick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(dest);
      osc.frequency.setValueAtTime(70, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time); osc.stop(time + 0.5);
    } else if (trackIndex === 1) {
      // Snare (noise + tone)
      const bufSize = Math.max(1, Math.floor(ctx.sampleRate * 0.2));
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'highpass'; filt.frequency.value = 500;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(velocity * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      noise.connect(filt); filt.connect(gain); gain.connect(dest);
      noise.start(time);
    } else {
      // Generic noise hit
      const decay = decays[trackIndex] || 0.1;
      const bufSize = Math.max(1, Math.floor(ctx.sampleRate * decay));
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'highpass';
      filt.frequency.value = freqs[trackIndex] || 1000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(velocity * 0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + decay);
      noise.connect(filt); filt.connect(gain); gain.connect(dest);
      noise.start(time);
    }
  }

  return { loadSample, triggerTrack };
}
