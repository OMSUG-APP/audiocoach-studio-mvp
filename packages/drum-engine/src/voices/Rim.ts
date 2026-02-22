import { VoiceParams } from '../types';

export function triggerRim(
  context: AudioContext,
  destination: AudioNode,
  time: number,
  velocity: number,
  params: VoiceParams = {}
) {
  const { frequency = 1200, decay = 0.02 } = params;

  const osc = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, time);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(frequency, time);
  filter.Q.setValueAtTime(10, time);

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(velocity, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(time);
  osc.stop(time + decay + 0.1);
}
