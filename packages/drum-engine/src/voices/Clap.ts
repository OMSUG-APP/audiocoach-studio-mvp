import { VoiceParams } from '../types';
import { NoiseBuffer } from '../utils/NoiseBuffer';

export function triggerClap(
  context: AudioContext,
  destination: AudioNode,
  time: number,
  velocity: number,
  params: VoiceParams = {}
) {
  const { decay = 0.3, tone = 1000 } = params;

  const noise = context.createBufferSource();
  noise.buffer = NoiseBuffer.get(context);
  
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(tone, time);
  filter.Q.setValueAtTime(1, time);

  const gain = context.createGain();
  
  // Three rapid bursts
  const burstDuration = 0.01;
  const burstGap = 0.01;
  
  gain.gain.setValueAtTime(0, time);
  
  // Burst 1
  gain.gain.linearRampToValueAtTime(velocity, time + 0.002);
  gain.gain.linearRampToValueAtTime(0.1, time + burstDuration);
  
  // Burst 2
  const t2 = time + burstDuration + burstGap;
  gain.gain.linearRampToValueAtTime(velocity * 0.8, t2 + 0.002);
  gain.gain.linearRampToValueAtTime(0.1, t2 + burstDuration);
  
  // Burst 3 (Main tail)
  const t3 = t2 + burstDuration + burstGap;
  gain.gain.linearRampToValueAtTime(velocity * 0.6, t3 + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, t3 + decay);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  noise.start(time);
  noise.stop(time + decay + 0.1);
}
