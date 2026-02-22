/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class ChannelStrip {
  public input: GainNode;
  public output: GainNode;
  public lowShelf: BiquadFilterNode;
  public peaking: BiquadFilterNode;
  public highShelf: BiquadFilterNode;
  public compressor: DynamicsCompressorNode;

  constructor(context: BaseAudioContext) {
    this.input = context.createGain();
    this.output = context.createGain();

    this.lowShelf = context.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 80;

    this.peaking = context.createBiquadFilter();
    this.peaking.type = 'peaking';
    this.peaking.frequency.value = 1000;

    this.highShelf = context.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 8000;

    this.compressor = context.createDynamicsCompressor();

    // Signal chain: Input -> LowShelf -> Peaking -> HighShelf -> Compressor -> Output
    this.input.connect(this.lowShelf);
    this.lowShelf.connect(this.peaking);
    this.peaking.connect(this.highShelf);
    this.highShelf.connect(this.compressor);
    this.compressor.connect(this.output);
  }

  public setGain(value: number) {
    this.output.gain.setTargetAtTime(value, this.output.context.currentTime, 0.01);
  }

  public setInputGain(value: number) {
    this.input.gain.setTargetAtTime(value, this.input.context.currentTime, 0.01);
  }

  public connect(destination: AudioNode | AudioParam) {
    if (destination instanceof AudioNode) {
      this.output.connect(destination);
    } else {
      this.output.connect(destination);
    }
  }

  public disconnect() {
    this.output.disconnect();
  }
}
