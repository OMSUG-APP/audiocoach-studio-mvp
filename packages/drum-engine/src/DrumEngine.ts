import { DrumVoice, VoiceParams } from './types';
import { triggerKick } from './voices/Kick';
import { triggerSnare } from './voices/Snare';
import { triggerClap } from './voices/Clap';
import { triggerHiHat } from './voices/HiHat';
import { triggerRim } from './voices/Rim';

export class DrumEngine {
  private context: AudioContext;
  private destination: AudioNode | null = null;
  private openHatGainParam: AudioParam | null = null;

  constructor(context: AudioContext) {
    this.context = context;
  }

  connect(destination: AudioNode) {
    this.destination = destination;
  }

  trigger(voice: DrumVoice, time: number, velocity: number, params: VoiceParams = {}) {
    if (!this.destination) {
      console.warn('DrumEngine not connected to a destination');
      return;
    }

    const t = time || this.context.currentTime;

    switch (voice) {
      case 'kick':
        triggerKick(this.context, this.destination, t, velocity, params);
        break;
      case 'snare':
        triggerSnare(this.context, this.destination, t, velocity, params);
        break;
      case 'clap':
        triggerClap(this.context, this.destination, t, velocity, params);
        break;
      case 'closedHat':
        // Choke group A: Closed Hat silences Open Hat
        if (this.openHatGainParam) {
          this.openHatGainParam.cancelScheduledValues(t);
          this.openHatGainParam.setValueAtTime(this.openHatGainParam.value, t);
          this.openHatGainParam.exponentialRampToValueAtTime(0.0001, t + 0.01);
        }
        triggerHiHat(this.context, this.destination, t, velocity, params, false);
        break;
      case 'openHat':
        this.openHatGainParam = triggerHiHat(this.context, this.destination, t, velocity, params, true);
        break;
      case 'rim':
        triggerRim(this.context, this.destination, t, velocity, params);
        break;
    }
  }
}
