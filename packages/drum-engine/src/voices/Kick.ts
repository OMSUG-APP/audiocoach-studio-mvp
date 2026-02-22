import { VoiceParams } from '../types';

export function triggerKick(
  context: AudioContext,
  destination: AudioNode,
  time: number,
  velocity: number,
  params: VoiceParams = {}
) {
  const { frequency = 50, decay = 0.5, tone = 0.1 } = params;

  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = 'sine';
  
  // Pitch envelope
  osc.frequency.setValueAtTime(frequency * 3, time);
  osc.frequency.exponentialRampToValueAtTime(frequency, time + 0.05);

  // Amplitude envelope
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(velocity, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(time);
  osc.stop(time + decay + 0.1);
}
