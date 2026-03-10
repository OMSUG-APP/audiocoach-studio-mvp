export interface SampleMeta {
  fileName: string;
  url: string;
  category: string;
  label: string;
}

export interface SampleLibrary {
  getRandomSample(category: string): Promise<SampleMeta>;
}

// Static manifest of bundled/CDN samples (placeholder URLs for MVP)
const SAMPLE_MANIFEST: Record<string, SampleMeta[]> = {
  percussion: [
    { fileName: 'kick_808.wav',    url: '/samples/kick_808.wav',    category: 'percussion', label: 'Kick 808' },
    { fileName: 'snare_cr78.wav',  url: '/samples/snare_cr78.wav',  category: 'percussion', label: 'Snare CR78' },
    { fileName: 'hihat_open.wav',  url: '/samples/hihat_open.wav',  category: 'percussion', label: 'Hi-Hat Open' },
    { fileName: 'clap_707.wav',    url: '/samples/clap_707.wav',    category: 'percussion', label: 'Clap 707' },
  ],
  melodic: [
    { fileName: 'piano_c4.wav',    url: '/samples/piano_c4.wav',    category: 'melodic',    label: 'Piano C4' },
    { fileName: 'pad_warm.wav',    url: '/samples/pad_warm.wav',    category: 'melodic',    label: 'Warm Pad' },
    { fileName: 'bass_sub.wav',    url: '/samples/bass_sub.wav',    category: 'melodic',    label: 'Sub Bass' },
  ],
  foley: [
    { fileName: 'vinyl_crackle.wav', url: '/samples/vinyl_crackle.wav', category: 'foley', label: 'Vinyl Crackle' },
    { fileName: 'room_tone.wav',     url: '/samples/room_tone.wav',     category: 'foley', label: 'Room Tone' },
  ],
  noise: [
    { fileName: 'white_noise.wav', url: '/samples/white_noise.wav', category: 'noise', label: 'White Noise' },
    { fileName: 'pink_noise.wav',  url: '/samples/pink_noise.wav',  category: 'noise', label: 'Pink Noise' },
  ],
};

class LocalMockLibrary implements SampleLibrary {
  async getRandomSample(category: string): Promise<SampleMeta> {
    // Simulate async fetch
    await new Promise(r => setTimeout(r, 200));

    const pool = SAMPLE_MANIFEST[category] || SAMPLE_MANIFEST['percussion'];
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }
}

export const sampleLibrary: SampleLibrary = new LocalMockLibrary();
