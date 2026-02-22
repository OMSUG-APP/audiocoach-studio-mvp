export const createDrumEngine = (ctx: BaseAudioContext, dest: AudioNode) => {
  const playBD = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(dest);

    const baseFreq = 50 + (p.tune * 200); 
    const decayTime = 0.1 + (p.decay * 0.8); 

    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + decayTime);

    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);

    osc.start(time);
    osc.stop(time + decayTime);
  };

  const playSD = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const noise = ctx.createBufferSource();
    const noiseDecay = 0.1 + (p.decay * 0.3);
    const bufferSize = ctx.sampleRate * noiseDecay;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(500 + (p.tune * 1000), time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + noiseDecay);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100 + (p.tune * 150), time);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(velocity * 0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);

    osc.connect(oscGain);
    oscGain.connect(dest);

    noise.start(time);
    osc.start(time);
    osc.stop(time + Math.max(noiseDecay, 0.1));
  };

  const playHC = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const noise = ctx.createBufferSource();
    const decayTime = 0.02 + (p.decay * 0.1);
    const bufferSize = ctx.sampleRate * decayTime;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000 + (p.tune * 4000), time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(time);
  };

  const playOH = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const noise = ctx.createBufferSource();
    const decayTime = 0.1 + (p.decay * 0.4);
    const bufferSize = ctx.sampleRate * decayTime;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000 + (p.tune * 4000), time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(time);
  };

  return { playBD, playSD, playHC, playOH };
};

export const createBassEngine = (ctx: BaseAudioContext, dest: AudioNode) => {
  const playNote = (time: number, freq: number, duration: number, velocity: number, p = { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // 1. Waveform
    osc.type = p.waveform as OscillatorType;
    osc.frequency.setValueAtTime(freq, time);

    // 2. Filter Setup
    filter.type = 'lowpass';
    
    // Map cutoff (0-1) to 50Hz - 5000Hz
    const baseCutoff = 50 + (p.cutoff * 4950);
    
    // Map resonance (0-1) to Q value (0 - 25 for that acid squelch)
    filter.Q.setValueAtTime(p.resonance * 25, time);

    // 3. Envelope Modulation (How high the filter sweeps up before decaying)
    const peakCutoff = Math.min(baseCutoff + (p.envMod * 8000), 20000);
    
    // 4. Decay Time (0.1s to 1.5s)
    const decayTime = 0.1 + (p.decay * 1.4);

    // Apply Filter Envelope
    filter.frequency.setValueAtTime(peakCutoff, time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(baseCutoff, 50), time + decayTime);

    // Apply Volume Envelope
    gain.gain.setValueAtTime(velocity * 0.4, time);
    gain.gain.setTargetAtTime(0, time, decayTime / 3); // Smooth fade out

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + decayTime + 0.1); // Give it a tiny tail to finish decaying
  };

  return { playNote };
};

export const noteToFreq = (note: string) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = note.slice(0, -1);
  const octave = parseInt(note.slice(-1));
  const semitones = notes.indexOf(name) + (octave + 1) * 12;
  return 440 * Math.pow(2, (semitones - 69) / 12);
};