import { VoiceParams } from '../types';
import { NoiseBuffer } from '../utils/NoiseBuffer';

export function triggerHiHat(
  context: AudioContext,
  destination: AudioNode,
  time: number,
  velocity: number,
  params: VoiceParams = {},
  isOpen: boolean
): AudioParam {
  const { decay = isOpen ? 0.4 : 0.05, tone = 8000 } = params;

  const noise = context.createBufferSource();
  noise.buffer = NoiseBuffer.get(context);
  
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(tone, time);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(velocity, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  noise.start(time);
  noise.stop(time + decay + 0.1);

  return gain.gain;
}
