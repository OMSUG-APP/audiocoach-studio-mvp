import { VoiceParams } from '../types';
import { NoiseBuffer } from '../utils/NoiseBuffer';

export function triggerSnare(
  context: AudioContext,
  destination: AudioNode,
  time: number,
  velocity: number,
  params: VoiceParams = {}
) {
  const { frequency = 150, decay = 0.2, snappy = 0.5 } = params;

  // Tone part (Triangle)
  const osc = context.createOscillator();
  const oscGain = context.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, time);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, time + 0.1);
  
  oscGain.gain.setValueAtTime(velocity * (1 - snappy), time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

  // Noise part (Snappy)
  const noise = context.createBufferSource();
  noise.buffer = NoiseBuffer.get(context);
  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(1000, time);
  
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(velocity * snappy, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + decay);

  osc.connect(oscGain);
  oscGain.connect(destination);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(destination);

  osc.start(time);
  osc.stop(time + 0.2);
  noise.start(time);
  noise.stop(time + decay + 0.1);
}
