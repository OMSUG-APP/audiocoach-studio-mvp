/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class MasterBus {
  public input: GainNode;
  public output: GainNode;
  public waveShaper: WaveShaperNode;

  constructor(context: BaseAudioContext) {
    this.input = context.createGain();
    this.output = context.createGain();

    this.waveShaper = context.createWaveShaper();
    this.waveShaper.curve = this.makeSoftClipCurve(44100);
    this.waveShaper.oversample = '4x';

    // Signal chain: Input -> WaveShaper -> Output
    this.input.connect(this.waveShaper);
    this.waveShaper.connect(this.output);
  }

  private makeSoftClipCurve(nSamples: number): Float32Array {
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      // Soft clipping algorithm
      curve[i] = ((3 + 20) * x * 20 * deg) / (Math.PI + 20 * Math.abs(x));
    }
    // Normalize curve
    const max = Math.max(...Array.from(curve).map(Math.abs));
    if (max > 0) {
      for (let i = 0; i < nSamples; i++) curve[i] /= max;
    }
    return curve;
  }

  public setInputGain(value: number) {
    this.input.gain.setTargetAtTime(value, this.input.context.currentTime, 0.01);
  }

  public setOutputGain(value: number) {
    this.output.gain.setTargetAtTime(value, this.output.context.currentTime, 0.01);
  }

  public connect(destination: AudioNode) {
    this.output.connect(destination);
  }

  public disconnect() {
    this.output.disconnect();
  }
}
