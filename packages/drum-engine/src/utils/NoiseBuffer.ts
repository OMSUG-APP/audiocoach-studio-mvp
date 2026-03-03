export class NoiseBuffer {
  private static cache = new WeakMap<AudioContext, AudioBuffer>();

  static get(context: AudioContext): AudioBuffer {
    if (!this.cache.has(context)) {
      const bufferSize = 2 * context.sampleRate;
      const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.cache.set(context, buffer);
    }
    return this.cache.get(context)!;
  }
}
