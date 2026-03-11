import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  SamplerPad, SamplerEnvelope, SamplerFilter, PadLoadStatus, ChannelMixer,
} from '../types';
import {
  createDefaultPad, loadAudioFile, triggerSamplerPad, resolveGain,
} from '../utils/sampler';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseSamplerReturn {
  // State
  pads: SamplerPad[];
  padLoadStatus: PadLoadStatus[];
  samplerBuffers: (AudioBuffer | null)[];
  activePadId: number;
  masterVolume: number;

  // File management
  loadPadFile: (padId: number, file: File) => Promise<void>;
  loadPadBuffer: (padId: number, buffer: AudioBuffer, label: string) => void;
  clearPad: (padId: number) => void;

  // Playback
  triggerPad: (padId: number) => void;
  // Called by the sequencer scheduler — seqTime is the target time in the
  // sequencer's AudioContext; seqNow is that context's currentTime right now.
  schedulePadAtTime: (padId: number, seqTime: number, seqNow: number) => void;

  // Selection
  setActivePad: (padId: number) => void;

  // Per-pad param updates
  updatePadLabel: (padId: number, label: string) => void;
  updatePadVolume: (padId: number, volume: number) => void;
  updatePadPitch: (padId: number, pitch: number) => void;
  updatePadPan: (padId: number, pan: number) => void;
  updatePadLoop: (padId: number, loop: boolean) => void;
  updatePadAttack: (padId: number, attack: number) => void;
  updatePadEnvelope: (padId: number, env: Partial<SamplerEnvelope>) => void;
  updatePadFilter: (padId: number, filter: Partial<SamplerFilter>) => void;
  updatePadMute: (padId: number, mute: boolean) => void;
  updatePadSolo: (padId: number, solo: boolean) => void;

  // Master
  updateMasterVolume: (volume: number) => void;

  // Analyser (for VU metering in mixer)
  analyser: React.MutableRefObject<AnalyserNode | null>;
  stereoAnalyserLeft:  React.MutableRefObject<AnalyserNode | null>;
  stereoAnalyserRight: React.MutableRefObject<AnalyserNode | null>;
  spectrumAnalyser:    React.MutableRefObject<AnalyserNode | null>;

  // Waveform peaks for display (256 values, 0-1 range; null if pad not loaded)
  padWaveforms: (number[] | null)[];
}

// ─── Reverb IR ────────────────────────────────────────────────────────────────

function createReverbIR(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const left  = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const env = Math.pow(1 - i / length, decay);
    left[i]  = (Math.random() * 2 - 1) * env;
    right[i] = (Math.random() * 2 - 1) * env;
  }
  return impulse;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSampler(mixerChannel?: ChannelMixer): UseSamplerReturn {
  // ── Serialisable state ──────────────────────────────────────────────────
  const [pads, setPads] = useState<SamplerPad[]>(
    () => Array.from({ length: 16 }, (_, i) => createDefaultPad(i)),
  );
  const [padLoadStatus, setPadLoadStatus] = useState<PadLoadStatus[]>(
    () => Array(16).fill('idle'),
  );
  const [activePadId, setActivePadId] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [padWaveforms, setPadWaveforms] = useState<(number[] | null)[]>(
    () => Array(16).fill(null),
  );

  // ── Non-serialisable refs ───────────────────────────────────────────────
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const masterGainRef    = useRef<GainNode | null>(null);

  // EQ nodes (shared channel strip after master gain)
  const eqLowRef   = useRef<BiquadFilterNode | null>(null);
  const eqMidRef   = useRef<BiquadFilterNode | null>(null);
  const eqHighRef  = useRef<BiquadFilterNode | null>(null);
  const analyserRef            = useRef<AnalyserNode | null>(null);
  const stereoAnalyserLeftRef  = useRef<AnalyserNode | null>(null);
  const stereoAnalyserRightRef = useRef<AnalyserNode | null>(null);
  const spectrumAnalyserRef    = useRef<AnalyserNode | null>(null);

  // FX buses
  const reverbRef      = useRef<ConvolverNode | null>(null);
  const reverbSendRef  = useRef<GainNode | null>(null);
  const delayRef       = useRef<DelayNode | null>(null);
  const delayFbRef     = useRef<GainNode | null>(null);
  const delaySendRef   = useRef<GainNode | null>(null);

  const buffersRef       = useRef<(AudioBuffer | null)[]>(Array(16).fill(null));
  const activeSourcesRef = useRef<Map<number, AudioBufferSourceNode>>(new Map());

  // Keep a ref to pads so triggerPad never reads stale closure state
  const padsRef = useRef<SamplerPad[]>(pads);
  useEffect(() => { padsRef.current = pads; }, [pads]);

  // Keep a ref to the latest mixerChannel for use inside ensureCtx
  const mixerChannelRef = useRef(mixerChannel);
  useEffect(() => { mixerChannelRef.current = mixerChannel; }, [mixerChannel]);

  // ── Apply mixer values to live audio nodes ──────────────────────────────
  const applyMixerChannel = useCallback((ch: ChannelMixer) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (masterGainRef.current) masterGainRef.current.gain.value = ch.volume ?? 0.8;
    if (eqLowRef.current)  eqLowRef.current.gain.value  = ch.eq?.low  ?? 0;
    if (eqMidRef.current)  eqMidRef.current.gain.value  = ch.eq?.mid  ?? 0;
    if (eqHighRef.current) eqHighRef.current.gain.value = ch.eq?.high ?? 0;
    if (reverbSendRef.current) reverbSendRef.current.gain.value = ch.reverb ?? 0;
    if (delaySendRef.current)  delaySendRef.current.gain.value  = ch.delay?.mix ?? 0;
    if (delayRef.current)
      delayRef.current.delayTime.setTargetAtTime(ch.delay?.time ?? 0.3, ctx.currentTime, 0.01);
    if (delayFbRef.current) delayFbRef.current.gain.value = ch.delay?.feedback ?? 0.3;
  }, []);

  // ── AudioContext + full FX chain — lazy init on first user gesture ──────
  const ensureCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();

      // ── Master gain (controlled by SamplerView slider & mixer fader) ──
      const master = ctx.createGain();
      master.gain.value = mixerChannelRef.current?.volume ?? 1.0;

      // ── 3-band EQ ──────────────────────────────────────────────────────
      const eqLow  = ctx.createBiquadFilter();
      eqLow.type  = 'lowshelf';  eqLow.frequency.value  = 250;
      const eqMid  = ctx.createBiquadFilter();
      eqMid.type  = 'peaking';   eqMid.frequency.value  = 1000;
      const eqHigh = ctx.createBiquadFilter();
      eqHigh.type = 'highshelf'; eqHigh.frequency.value = 4000;

      master.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      eqHigh.connect(analyser);
      analyserRef.current = analyser;
      eqHigh.connect(ctx.destination); // dry path

      // Stereo VU analysers (L/R via ChannelSplitter)
      const splitter = ctx.createChannelSplitter(2);
      eqHigh.connect(splitter);
      const leftAn = ctx.createAnalyser(); leftAn.fftSize = 256; splitter.connect(leftAn, 0);
      const rightAn = ctx.createAnalyser(); rightAn.fftSize = 256; splitter.connect(rightAn, 1);
      stereoAnalyserLeftRef.current  = leftAn;
      stereoAnalyserRightRef.current = rightAn;

      // Spectrum analyser
      const spectrum = ctx.createAnalyser(); spectrum.fftSize = 2048;
      eqHigh.connect(spectrum);
      spectrumAnalyserRef.current = spectrum;

      // ── Reverb send ─────────────────────────────────────────────────────
      const reverbSend   = ctx.createGain(); reverbSend.gain.value = 0;
      const reverb       = ctx.createConvolver();
      reverb.buffer      = createReverbIR(ctx, 2.5, 2.0);
      const reverbReturn = ctx.createGain(); reverbReturn.gain.value = 0.8;
      eqHigh.connect(reverbSend);
      reverbSend.connect(reverb);
      reverb.connect(reverbReturn);
      reverbReturn.connect(ctx.destination);

      // ── Delay send ──────────────────────────────────────────────────────
      const delaySend   = ctx.createGain(); delaySend.gain.value = 0;
      const delay       = ctx.createDelay(2.0);
      const delayFb     = ctx.createGain(); delayFb.gain.value = 0.3;
      const delayReturn = ctx.createGain(); delayReturn.gain.value = 0.8;
      eqHigh.connect(delaySend);
      delaySend.connect(delay);
      delay.connect(delayFb);
      delayFb.connect(delay); // feedback loop
      delay.connect(delayReturn);
      delayReturn.connect(ctx.destination);

      // ── Store refs ──────────────────────────────────────────────────────
      audioCtxRef.current     = ctx;
      masterGainRef.current   = master;
      eqLowRef.current        = eqLow;
      eqMidRef.current        = eqMid;
      eqHighRef.current       = eqHigh;
      reverbRef.current       = reverb;
      reverbSendRef.current   = reverbSend;
      delayRef.current        = delay;
      delayFbRef.current      = delayFb;
      delaySendRef.current    = delaySend;

      // Apply initial mixer values if already available
      if (mixerChannelRef.current) applyMixerChannel(mixerChannelRef.current);
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, [applyMixerChannel]);

  // Apply mixer changes whenever the prop updates
  useEffect(() => {
    if (mixerChannel && audioCtxRef.current) applyMixerChannel(mixerChannel);
  }, [mixerChannel, applyMixerChannel]);

  // ── Generic pad state updater ───────────────────────────────────────────
  const updatePad = useCallback((padId: number, changes: Partial<SamplerPad>) => {
    setPads(prev => prev.map(p => p.id === padId ? { ...p, ...changes } : p));
  }, []);

  // ── File loading ────────────────────────────────────────────────────────
  const loadPadFile = useCallback(async (padId: number, file: File) => {
    const ctx = ensureCtx();

    setPadLoadStatus(prev => {
      const next = [...prev]; next[padId] = 'loading'; return next;
    });

    const buffer = await loadAudioFile(ctx, file);

    if (!buffer) {
      setPadLoadStatus(prev => {
        const next = [...prev]; next[padId] = 'error'; return next;
      });
      return;
    }

    buffersRef.current[padId] = buffer;

    // Compute downsampled peak data for the waveform display (256 bins, 0-1)
    const channelData = buffer.getChannelData(0);
    const bins = 256;
    const blockSize = Math.max(1, Math.floor(channelData.length / bins));
    const peaks: number[] = [];
    for (let i = 0; i < bins; i++) {
      let max = 0;
      const offset = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        const abs = Math.abs(channelData[offset + j] ?? 0);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }
    setPadWaveforms(prev => {
      const next = [...prev]; next[padId] = peaks; return next;
    });

    // Trim extension and uppercase for label (max 14 chars)
    const name = file.name.replace(/\.[^/.]+$/, '').slice(0, 14).toUpperCase();
    updatePad(padId, { fileName: file.name, label: name });

    setPadLoadStatus(prev => {
      const next = [...prev]; next[padId] = 'loaded'; return next;
    });
  }, [ensureCtx, updatePad]);

  const loadPadBuffer = useCallback((padId: number, buffer: AudioBuffer, label: string) => {
    buffersRef.current[padId] = buffer;
    const channelData = buffer.getChannelData(0);
    const bins = 256;
    const blockSize = Math.max(1, Math.floor(channelData.length / bins));
    const peaks: number[] = [];
    for (let i = 0; i < bins; i++) {
      let max = 0;
      const offset = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        const abs = Math.abs(channelData[offset + j] ?? 0);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }
    setPadWaveforms(prev => { const next = [...prev]; next[padId] = peaks; return next; });
    updatePad(padId, { fileName: label, label: label.slice(0, 14).toUpperCase() });
    setPadLoadStatus(prev => { const next = [...prev]; next[padId] = 'loaded'; return next; });
  }, [updatePad]);

  const clearPad = useCallback((padId: number) => {
    const existing = activeSourcesRef.current.get(padId);
    if (existing) { try { existing.stop(); } catch { /* already ended */ } }

    buffersRef.current[padId] = null;
    setPads(prev => prev.map(p => p.id === padId ? createDefaultPad(padId) : p));
    setPadLoadStatus(prev => {
      const next = [...prev]; next[padId] = 'idle'; return next;
    });
    setPadWaveforms(prev => {
      const next = [...prev]; next[padId] = null; return next;
    });
  }, []);

  // ── Playback ────────────────────────────────────────────────────────────
  const triggerPad = useCallback((padId: number) => {
    const buffer = buffersRef.current[padId];
    if (!buffer) return;

    const ctx = ensureCtx();
    const pad = padsRef.current[padId];
    if (resolveGain(pad, padsRef.current) === 0) return;

    const prev = activeSourcesRef.current.get(padId);
    if (prev) { try { prev.stop(); } catch { /* already ended */ } }

    const src = triggerSamplerPad(ctx, buffer, pad, masterGainRef.current ?? ctx.destination);
    activeSourcesRef.current.set(padId, src);
    src.addEventListener('ended', () => { activeSourcesRef.current.delete(padId); });
  }, [ensureCtx]);

  // ── Sequencer-driven scheduling ─────────────────────────────────────────
  const schedulePadAtTime = useCallback((padId: number, seqTime: number, seqNow: number) => {
    const buffer = buffersRef.current[padId];
    if (!buffer) return;

    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') return;

    const pad = padsRef.current[padId];
    if (resolveGain(pad, padsRef.current) === 0) return;

    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const offsetSeconds = Math.max(0, seqTime - seqNow);
    triggerSamplerPad(ctx, buffer, pad, masterGainRef.current ?? ctx.destination, ctx.currentTime + offsetSeconds);
  }, []);

  // ── Master volume (SamplerView slider) ──────────────────────────────────
  const updateMasterVolume = useCallback((volume: number) => {
    setMasterVolume(volume);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.01);
    }
  }, []);

  // ── Per-pad param updates ───────────────────────────────────────────────
  const updatePadLabel    = useCallback((id: number, label: string) => updatePad(id, { label }), [updatePad]);
  const updatePadVolume   = useCallback((id: number, volume: number) => updatePad(id, { volume }), [updatePad]);
  const updatePadPitch    = useCallback((id: number, pitch: number) => updatePad(id, { pitch }), [updatePad]);
  const updatePadPan      = useCallback((id: number, pan: number) => updatePad(id, { pan }), [updatePad]);
  const updatePadLoop     = useCallback((id: number, loop: boolean) => updatePad(id, { loop }), [updatePad]);
  const updatePadAttack   = useCallback((id: number, attack: number) => updatePad(id, { attack }), [updatePad]);
  const updatePadMute     = useCallback((id: number, mute: boolean) => updatePad(id, { mute }), [updatePad]);
  const updatePadSolo     = useCallback((id: number, solo: boolean) => updatePad(id, { solo }), [updatePad]);

  const updatePadEnvelope = useCallback((id: number, env: Partial<SamplerEnvelope>) =>
    setPads(prev => prev.map(p =>
      p.id === id ? { ...p, envelope: { ...p.envelope, ...env } } : p,
    )), []);

  const updatePadFilter = useCallback((id: number, filter: Partial<SamplerFilter>) =>
    setPads(prev => prev.map(p =>
      p.id === id ? { ...p, filter: { ...p.filter, ...filter } } : p,
    )), []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => { audioCtxRef.current?.close(); };
  }, []);

  return {
    pads, padLoadStatus, activePadId, masterVolume, padWaveforms,
    samplerBuffers: buffersRef.current,
    analyser: analyserRef,
    stereoAnalyserLeft:  stereoAnalyserLeftRef,
    stereoAnalyserRight: stereoAnalyserRightRef,
    spectrumAnalyser:    spectrumAnalyserRef,
    loadPadFile, loadPadBuffer, clearPad, triggerPad, schedulePadAtTime,
    setActivePad: setActivePadId,
    updatePadLabel, updatePadVolume, updatePadPitch,
    updatePadPan, updatePadLoop, updatePadAttack,
    updatePadEnvelope, updatePadFilter, updatePadMute, updatePadSolo,
    updateMasterVolume,
  };
}
