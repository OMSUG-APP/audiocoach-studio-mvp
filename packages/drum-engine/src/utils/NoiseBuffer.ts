export class NoiseBuffer {
  private static buffer: AudioBuffer | null = null;

  static get(context: AudioContext): AudioBuffer {
    if (!this.buffer) {
      const bufferSize = 2 * context.sampleRate;
      this.buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const output = this.buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    return this.buffer;
  }
}
