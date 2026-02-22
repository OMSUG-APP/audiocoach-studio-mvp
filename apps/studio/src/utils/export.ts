/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../types';
import { createDrumEngine, createBassEngine, noteToFreq } from './audio';

export const renderToWav = async (project: Project) => {
  const sampleRate = 44100;
  const duration = 16 * (60 / project.bpm / 4); // Render one pattern (16 steps)
  const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
  
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = project.mixer.master.volume;

  const drumGain = ctx.createGain();
  drumGain.connect(masterGain);
  drumGain.gain.value = project.mixer.drums.volume;

  const bassGain = ctx.createGain();
  bassGain.connect(masterGain);
  bassGain.gain.value = project.mixer.bass.volume;

  const drumEngine = createDrumEngine(ctx, drumGain);
  const bassEngine = createBassEngine(ctx, bassGain);

  const pattern = project.patterns[0];
  const secondsPerStep = 60 / project.bpm / 4;

  for (let step = 0; step < 16; step++) {
    const time = step * secondsPerStep;
    let adjustedTime = time;
    if (step % 2 === 1) {
      adjustedTime += secondsPerStep * (project.swing / 100);
    }

    Object.entries(pattern.drums).forEach(([inst, steps]) => {
      const s = steps[step];
      if (s.active) {
        if (inst === 'BD') drumEngine.playBD(adjustedTime, s.velocity);
        if (inst === 'SD') drumEngine.playSD(adjustedTime, s.velocity);
        if (inst === 'HC') drumEngine.playHC(adjustedTime, s.velocity);
        if (inst === 'OH') drumEngine.playOH(adjustedTime, s.velocity);
      }
    });

    const bassStep = pattern.bass[step];
    if (bassStep.active) {
      const freq = noteToFreq(bassStep.note);
      bassEngine.playNote(adjustedTime, freq, secondsPerStep * bassStep.length, bassStep.velocity);
    }
  }

  const renderedBuffer = await ctx.startRendering();
  return bufferToWav(renderedBuffer);
};

function bufferToWav(buffer: AudioBuffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true); // write 16-bit sample
      pos += 2;
    }
    offset++; // next source sample
  }

  return new Blob([bufferArr], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}
