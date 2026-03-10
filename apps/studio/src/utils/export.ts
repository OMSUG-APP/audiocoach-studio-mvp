import { Project, Pattern, SamplerPad } from '../types';
import { createDrumEngine, createBassEngine, createSynthEngine, noteToFreq } from './audio';
import { createPolySynthEngine } from './polySynth';
import { createDigitaktEngine } from './digitaktEngine';
import { triggerSamplerPad, resolveGain } from './sampler';

export type ExportMode = 'master' | 'drums' | 'bass' | 'synth' | 'polySynth' | 'drum2';

const createImpulseResponse = (ctx: BaseAudioContext, duration: number, decay: number) => {
  const length = ctx.sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const n = i === 0 ? 1 : Math.random() * 2 - 1;
    left[i] = n * Math.pow(1 - i / length, decay);
    right[i] = n * Math.pow(1 - i / length, decay);
  }
  return impulse;
};

// A resolved block: pattern reference + absolute start time in seconds + total step count
interface RenderBlock {
  pattern: Pattern;
  startTime: number;
  totalSteps: number; // how many 16th-note steps this block spans
}

function buildTimeline(project: Project, activePattern: Pattern, stepTime: number): RenderBlock[] {
  const blocks = project.arrangementBlocks;

  if (blocks && blocks.length > 0) {
    return blocks
      .slice()
      .sort((a, b) => a.startBar - b.startBar)
      .map(block => {
        const pattern = project.patterns.find(p => p.id === block.patternId) ?? activePattern;
        return {
          pattern,
          startTime: block.startBar * 16 * stepTime,
          totalSteps: block.lengthBars * 16,
        };
      });
  }

  // No arrangement — loop active pattern 4 times
  return [{ pattern: activePattern, startTime: 0, totalSteps: 16 * 4 }];
}

function totalDuration(timeline: RenderBlock[], stepTime: number, tailLength: number): number {
  if (timeline.length === 0) return tailLength;
  const last = timeline[timeline.length - 1];
  return last.startTime + last.totalSteps * stepTime + tailLength;
}

export const renderToWav = async (
  project: Project,
  activePattern: Pattern,
  mode: ExportMode = 'master',
  samplerBuffers?: (AudioBuffer | null)[],
  samplerPads?: SamplerPad[],
): Promise<Blob> => {
  const bpm = project.bpm || 120;
  const stepTime = 60 / bpm / 4;
  const tailLength = 3.0;
  const sampleRate = 44100;
  const poweredOn = project.poweredOn;

  const timeline = buildTimeline(project, activePattern, stepTime);
  const duration = totalDuration(timeline, stepTime, tailLength);

  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
  const offlineCtx = ctx as unknown as AudioContext; // OfflineAudioContext is API-compatible

  // ── Master bus ────────────────────────────────────────────────────────────
  const masterGain = ctx.createGain();
  masterGain.gain.value = project.mixer?.master?.volume ?? 1.0;
  const compressor = ctx.createDynamicsCompressor();
  const masterComp = project.mixer?.master?.compressor;
  if (masterComp) {
    compressor.threshold.value = masterComp.threshold ?? -12;
    compressor.knee.value      = masterComp.knee      ?? 6;
    compressor.ratio.value     = masterComp.ratio     ?? 4;
    compressor.attack.value    = masterComp.attack    ?? 0.003;
    compressor.release.value   = masterComp.release   ?? 0.25;
  }
  masterGain.connect(compressor);
  compressor.connect(ctx.destination);

  // ── FX buses ──────────────────────────────────────────────────────────────
  const fx       = (project.mixer as any)?.effects || {};
  const fxReverb = fx.reverb || { return: 0.8 };
  const fxDelay  = fx.delay  || { time: 0.3, feedback: 0.3, return: 0.8 };
  const fxDrive  = fx.drive  || { amount: 0, return: 0.8 };

  const driveNode = ctx.createWaveShaper();
  const driveAmount = fxDrive.amount ?? 0;
  if (driveAmount > 0) {
    const curve = new Float32Array(44100);
    const k = driveAmount * 400;
    for (let i = 0; i < 44100; i++) {
      const x = (i * 2) / 44100 - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    driveNode.curve = curve;
  }
  const driveReturn = ctx.createGain(); driveReturn.gain.value = fxDrive.return ?? 0.8;
  driveNode.connect(driveReturn); driveReturn.connect(masterGain);

  const reverbNode = ctx.createConvolver();
  reverbNode.buffer = createImpulseResponse(ctx, 2.0, 2.0);
  const reverbReturn = ctx.createGain(); reverbReturn.gain.value = fxReverb.return ?? 0.8;
  reverbNode.connect(reverbReturn); reverbReturn.connect(masterGain);

  const delayNode = ctx.createDelay(2.0);
  delayNode.delayTime.value = fxDelay.time ?? 0.3;
  const delayFeedback = ctx.createGain(); delayFeedback.gain.value = fxDelay.feedback ?? 0.3;
  delayNode.connect(delayFeedback); delayFeedback.connect(delayNode);
  const delayReturn = ctx.createGain(); delayReturn.gain.value = fxDelay.return ?? 0.8;
  delayNode.connect(delayReturn); delayReturn.connect(masterGain);

  // ── Channel strip factory ─────────────────────────────────────────────────
  type ChannelKey = 'drums' | 'bass' | 'synth' | 'polySynth' | 'drum2' | 'sampler';
  const setupChannel = (key: ChannelKey, stemName: string) => {
    const chMixer = (project.mixer as any)?.[key] || { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } };
    const gain = ctx.createGain();
    gain.gain.value = (mode !== 'master' && mode !== stemName) ? 0 : chMixer.volume ?? 0.8;

    const lowEQ  = ctx.createBiquadFilter(); lowEQ.type  = 'lowshelf';  lowEQ.frequency.value  = 250;  lowEQ.gain.value  = chMixer.eq?.low  ?? 0;
    const midEQ  = ctx.createBiquadFilter(); midEQ.type  = 'peaking';   midEQ.frequency.value  = 1000; midEQ.gain.value  = chMixer.eq?.mid  ?? 0;
    const highEQ = ctx.createBiquadFilter(); highEQ.type = 'highshelf'; highEQ.frequency.value = 4000; highEQ.gain.value = chMixer.eq?.high ?? 0;

    lowEQ.connect(midEQ); midEQ.connect(highEQ); highEQ.connect(gain);
    gain.connect(masterGain);

    const revSend = ctx.createGain(); revSend.gain.value = chMixer.reverb ?? 0;
    gain.connect(revSend); revSend.connect(reverbNode);

    const delSend = ctx.createGain(); delSend.gain.value = chMixer.delay?.mix ?? 0;
    gain.connect(delSend); delSend.connect(delayNode);

    const drvSend = ctx.createGain(); drvSend.gain.value = chMixer.driveSend ?? 0;
    gain.connect(drvSend); drvSend.connect(driveNode);

    return lowEQ; // instruments connect into the first EQ node
  };

  const drumInput      = setupChannel('drums',     'drums');
  const bassInput      = setupChannel('bass',      'bass');
  const synthInput     = setupChannel('synth',     'synth');
  const polySynthInput = setupChannel('polySynth', 'polySynth');
  const drum2Input     = setupChannel('drum2',     'drum2');
  const samplerInput   = setupChannel('sampler',   'sampler');

  // Create engines once (they hold internal voice state)
  const polySynthEngine = createPolySynthEngine(offlineCtx, polySynthInput);
  const drum2Engine     = createDigitaktEngine(offlineCtx, drum2Input);

  // ── Schedule all blocks ───────────────────────────────────────────────────
  for (const block of timeline) {
    const { pattern, startTime, totalSteps } = block;

    for (let pos = 0; pos < totalSteps; pos++) {
      const time      = startTime + pos * stepTime;
      const mainStep  = pos % 16;
      const drum2Step = pos % 32;

      // DRUMS
      if (poweredOn?.drums ?? true) {
        const drumParams = project.drumParams || {};
        const anySolo = Object.values(drumParams).some(dp => dp.solo);
        Object.entries(pattern.drums).forEach(([inst, steps]) => {
          if (!steps[mainStep]?.active) return;
          const p = drumParams[inst] || { tune: 0.5, decay: 0.5, mute: false, solo: false };
          if (p.mute || (anySolo && !p.solo)) return;
          const layerGain = ctx.createGain(); layerGain.connect(drumInput);
          const engine = createDrumEngine(ctx, layerGain, project.drumKit || '808');
          const vel = steps[mainStep].velocity ?? 0.8;
          if (inst === 'BD') engine.playBD(time, vel, p);
          if (inst === 'SD') engine.playSD(time, vel, p);
          if (inst === 'HC') engine.playHC(time, vel, p);
          if (inst === 'OH') engine.playOH(time, vel, p);
          if (inst === 'LT') engine.playLT(time, vel, p);
          if (inst === 'HT') engine.playHT(time, vel, p);
        });
      }

      // BASS
      if (poweredOn?.bass ?? true) {
        const bassStep = pattern.bass[mainStep];
        if (bassStep?.active && bassStep.note) {
          const bp = project.bassParams || { waveform: 'sawtooth', octave: 2, cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 };
          const freq = noteToFreq(bassStep.note, (bp.octave ?? 2) - 2);
          createBassEngine(ctx, bassInput).playNote(time, freq, stepTime * (bassStep.length || 1), bassStep.velocity || 0.8, bp);
        }
      }

      // SYNTH (pad)
      if (poweredOn?.synth ?? true) {
        const synthStep = pattern.synth?.[mainStep];
        if (synthStep?.active && synthStep.note) {
          const sp = project.synthParams || { octave: 4, attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 };
          const freq = noteToFreq(synthStep.note, (sp.octave ?? 4) - 4);
          createSynthEngine(ctx, synthInput).playNote(time, freq, stepTime * (synthStep.length || 4), synthStep.velocity || 0.6, sp);
        }
      }

      // POLY SYNTH
      if (poweredOn?.polySynth ?? true) {
        const polyStep = pattern.polySynth?.[mainStep];
        if (polyStep?.active && polyStep.chord.length > 0) {
          const pp = project.polySynthParams || { oscMix: 0.5, subLevel: 0.2, cutoff: 0.5, resonance: 0.2, envMod: 0.4, attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.4, chorus: 0.3, octave: 4 };
          polySynthEngine.triggerChord(time, polyStep.chord, polyStep.velocity || 0.7, pp);
        }
      }

      // DRUM 2
      if (poweredOn?.drum2 ?? true) {
        const drum2Tracks = pattern.drum2 || [];
        drum2Tracks.forEach((track, trackIndex) => {
          const s = track.steps[drum2Step];
          if (s?.active) drum2Engine.triggerTrack(trackIndex, time, s.velocity || 0.8);
        });
      }

      // SAMPLER
      if ((poweredOn?.sampler ?? true) && samplerBuffers && samplerPads) {
        const samplerSteps = pattern.samplerSteps || [];
        samplerSteps.forEach((padSteps, padId) => {
          if (!padSteps[mainStep]) return;
          const buffer = samplerBuffers[padId];
          if (!buffer) return;
          const pad = samplerPads[padId];
          if (!pad || resolveGain(pad, samplerPads) === 0) return;
          triggerSamplerPad(offlineCtx, buffer, pad, samplerInput, time);
        });
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const renderedBuffer = await ctx.startRendering();
  return audioBufferToWav(renderedBuffer);
};

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  let pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16);
  setUint32(0x61746164); setUint32(length - pos - 4);

  const channels = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

  let offset = 0;
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true); pos += 2;
    }
    offset++;
  }
  return new Blob([out], { type: 'audio/wav' });
}
