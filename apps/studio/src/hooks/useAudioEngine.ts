import { useCallback, useEffect, useRef, useState } from 'react';
import { Project, ChannelMixer } from '../types';
import { createDrumEngine, createBassEngine, createSynthEngine, createLeadSynthEngine, createFMSynthEngine, createPluckEngine, createChordStabEngine, noteToFreq } from '../utils/audio';
import { createPolySynthEngine } from '../utils/polySynth';
import { createDigitaktEngine } from '../utils/digitaktEngine';

function makeDistortionCurve(amount: number) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100; const curve = new Float32Array(n_samples); const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) { const x = (i * 2) / n_samples - 1; curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x)); }
  return curve;
}

function createReverbIR(ctx: AudioContext, duration: number, decay: number) {
  const length = ctx.sampleRate * duration; const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const left = impulse.getChannelData(0); const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return impulse;
}

export const useAudioEngine = (
  project: Project,
  activePatternId: string,
  onScheduleSamplerPad?: (padId: number, seqTime: number, seqNow: number) => void,
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentDrum2Step, setCurrentDrum2Step] = useState(0);
  const [currentPluckStep, setCurrentPluckStep] = useState(0);
  const [currentPolySynthStep, setCurrentPolySynthStep] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const drum2StepRef = useRef(0);
  const pluckStepRef = useRef(0);
  const polySynthStepRef = useRef(0);
  const barRef = useRef(0); // tracks current bar for arrangement playback
  
  const projectRef = useRef(project);
  useEffect(() => { projectRef.current = project; }, [project]);

  const activePatternIdRef = useRef(activePatternId);
  useEffect(() => { activePatternIdRef.current = activePatternId; }, [activePatternId]);

  const samplerCallbackRef = useRef(onScheduleSamplerPad);
  useEffect(() => { samplerCallbackRef.current = onScheduleSamplerPad; }, [onScheduleSamplerPad]);
  
  const drumGainRef = useRef<GainNode | null>(null);
  const bassGainRef = useRef<GainNode | null>(null);
  const synthGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const drumLowRef = useRef<BiquadFilterNode | null>(null); const drumMidRef = useRef<BiquadFilterNode | null>(null); const drumHighRef = useRef<BiquadFilterNode | null>(null);
  const bassLowRef = useRef<BiquadFilterNode | null>(null); const bassMidRef = useRef<BiquadFilterNode | null>(null); const bassHighRef = useRef<BiquadFilterNode | null>(null);
  const synthLowRef = useRef<BiquadFilterNode | null>(null); const synthMidRef = useRef<BiquadFilterNode | null>(null); const synthHighRef = useRef<BiquadFilterNode | null>(null);

  // Per-channel FX sends
  const drumReverbSendRef = useRef<GainNode | null>(null);
  const bassReverbSendRef = useRef<GainNode | null>(null);
  const synthReverbSendRef = useRef<GainNode | null>(null);

  const drumDelaySendRef = useRef<GainNode | null>(null);
  const bassDelaySendRef = useRef<GainNode | null>(null);
  const synthDelaySendRef = useRef<GainNode | null>(null);

  // Shared FX buses
  const sharedReverbRef = useRef<ConvolverNode | null>(null);
  const sharedReverbReturnRef = useRef<GainNode | null>(null);
  const sharedDelayRef = useRef<DelayNode | null>(null);
  const sharedDelayFeedbackRef = useRef<GainNode | null>(null);
  const sharedDelayReturnRef = useRef<GainNode | null>(null);

  const masterCompressorRef = useRef<DynamicsCompressorNode | null>(null);

  // Shared drive bus (send effect — replaces master insert)
  const drumDriveSendRef  = useRef<GainNode | null>(null);
  const bassDriveSendRef  = useRef<GainNode | null>(null);
  const synthDriveSendRef = useRef<GainNode | null>(null);
  const sharedDriveRef       = useRef<WaveShaperNode | null>(null);
  const sharedDriveReturnRef = useRef<GainNode | null>(null);

  // PolySynth channel
  const polySynthGainRef = useRef<GainNode | null>(null);
  const polySynthLowRef  = useRef<BiquadFilterNode | null>(null);
  const polySynthMidRef  = useRef<BiquadFilterNode | null>(null);
  const polySynthHighRef = useRef<BiquadFilterNode | null>(null);
  const polySynthReverbSendRef = useRef<GainNode | null>(null);
  const polySynthDelaySendRef  = useRef<GainNode | null>(null);
  const polySynthEngineRef = useRef<ReturnType<typeof createPolySynthEngine> | null>(null);

  // Drum2 channel
  const drum2GainRef = useRef<GainNode | null>(null);
  const drum2LowRef  = useRef<BiquadFilterNode | null>(null);
  const drum2MidRef  = useRef<BiquadFilterNode | null>(null);
  const drum2HighRef = useRef<BiquadFilterNode | null>(null);
  const drum2ReverbSendRef = useRef<GainNode | null>(null);
  const drum2DelaySendRef  = useRef<GainNode | null>(null);
  const drum2EngineRef = useRef<ReturnType<typeof createDigitaktEngine> | null>(null);

  // Lead Synth channel
  const leadGainRef = useRef<GainNode | null>(null);
  const leadLowRef  = useRef<BiquadFilterNode | null>(null);
  const leadMidRef  = useRef<BiquadFilterNode | null>(null);
  const leadHighRef = useRef<BiquadFilterNode | null>(null);
  const leadReverbSendRef = useRef<GainNode | null>(null);
  const leadDelaySendRef  = useRef<GainNode | null>(null);
  const leadDriveSendRef  = useRef<GainNode | null>(null);

  // FM Synth channel
  const fmGainRef = useRef<GainNode | null>(null);
  const fmLowRef  = useRef<BiquadFilterNode | null>(null);
  const fmMidRef  = useRef<BiquadFilterNode | null>(null);
  const fmHighRef = useRef<BiquadFilterNode | null>(null);
  const fmReverbSendRef = useRef<GainNode | null>(null);
  const fmDelaySendRef  = useRef<GainNode | null>(null);
  const fmDriveSendRef  = useRef<GainNode | null>(null);

  // Pluck Synth channel
  const pluckGainRef = useRef<GainNode | null>(null);
  const pluckLowRef  = useRef<BiquadFilterNode | null>(null);
  const pluckMidRef  = useRef<BiquadFilterNode | null>(null);
  const pluckHighRef = useRef<BiquadFilterNode | null>(null);
  const pluckReverbSendRef = useRef<GainNode | null>(null);
  const pluckDelaySendRef  = useRef<GainNode | null>(null);
  const pluckDriveSendRef  = useRef<GainNode | null>(null);

  // Chord Stab channel
  const stabGainRef = useRef<GainNode | null>(null);
  const stabLowRef  = useRef<BiquadFilterNode | null>(null);
  const stabMidRef  = useRef<BiquadFilterNode | null>(null);
  const stabHighRef = useRef<BiquadFilterNode | null>(null);
  const stabReverbSendRef = useRef<GainNode | null>(null);
  const stabDelaySendRef  = useRef<GainNode | null>(null);
  const stabDriveSendRef  = useRef<GainNode | null>(null);

  // Per-drum-layer gains for mute/solo
  const drumLayerGainsRef = useRef<Record<string, GainNode>>({});

  // AnalyserNodes — one per channel for VU metering
  const analysersRef = useRef<Record<string, AnalyserNode | null>>({
    drums: null, drum2: null, bass: null, synth: null,
    polySynth: null, lead: null, fm: null, pluck: null, stab: null, master: null,
  });

  const scheduleNote = useCallback((step: number, time: number) => {
    if (
      !audioCtxRef.current ||
      !drumGainRef.current || !bassGainRef.current || !synthGainRef.current ||
      !polySynthGainRef.current || !drum2GainRef.current ||
      !leadGainRef.current || !fmGainRef.current || !pluckGainRef.current || !stabGainRef.current
    ) return;

    const currentProject = projectRef.current;
    const pattern = currentProject?.patterns?.find(p => p.id === activePatternIdRef.current) ?? currentProject?.patterns?.[0];
    if (!pattern) return;

    const bpm = currentProject?.bpm || 120;
    const swing = currentProject?.swing || 0;
    const secondsPerStep = 60 / bpm / 4;
    
    let adjustedTime = time;
    if (step % 2 === 1) adjustedTime += secondsPerStep * (swing / 100) * 0.33;

    const bassEngine = createBassEngine(audioCtxRef.current, bassGainRef.current);
    const synthEngine = createSynthEngine(audioCtxRef.current, synthGainRef.current);

    const poweredOn = currentProject.poweredOn;

    // DRUMS SCHEDULING (with Mute/Solo logic)
    if (poweredOn?.drums ?? true) {
    const drumsPattern = pattern.drums || {};
    const drumParams = currentProject.drumParams || {};
    const drumInstruments = Object.keys(drumsPattern);
    const anySoloed = drumInstruments.some(inst => drumParams[inst]?.solo);

    Object.entries(drumsPattern).forEach(([inst, steps]) => {
      const s = steps[step];
      if (!s?.active) return;

      // Ensure per-layer gain node exists
      if (!drumLayerGainsRef.current[inst]) {
        const layerGain = audioCtxRef.current!.createGain();
        layerGain.connect(drumGainRef.current!);
        drumLayerGainsRef.current[inst] = layerGain;
      }
      
      const layerGain = drumLayerGainsRef.current[inst];
      const p = drumParams[inst] || { tune: 0.5, decay: 0.5 };
      
      // Apply mute/solo logic
      const isMuted = p.mute;
      const isSoloed = p.solo;
      const effectiveMuted = isMuted || (anySoloed && !isSoloed);
      
      // Set gain to 0 if muted, 1 if playing
      layerGain.gain.setValueAtTime(effectiveMuted ? 0 : 1, adjustedTime);

      const layerEngine = createDrumEngine(audioCtxRef.current!, layerGain, currentProject.drumKit || '808');
      
      if (inst === 'BD') layerEngine.playBD(adjustedTime, s.velocity, p);
      if (inst === 'SD') layerEngine.playSD(adjustedTime, s.velocity, p);
      if (inst === 'HC') layerEngine.playHC(adjustedTime, s.velocity, p);
      if (inst === 'OH') layerEngine.playOH(adjustedTime, s.velocity, p);
      if (inst === 'LT') layerEngine.playLT(adjustedTime, s.velocity, p);
      if (inst === 'HT') layerEngine.playHT(adjustedTime, s.velocity, p);
    });
    } // end drums poweredOn

    // BASS SCHEDULING
    if (poweredOn?.bass ?? true) {
    const bassStep = pattern.bass?.[step];
    if (bassStep?.active && bassStep?.note) {
      const bp = currentProject.bassParams || { waveform: 'sawtooth', octave: 2, cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 };
      const bassOctaveShift = (bp.octave ?? 2) - 2;
      const freq = noteToFreq(bassStep.note, bassOctaveShift);
      bassEngine.playNote(adjustedTime, freq, secondsPerStep * (bassStep.length || 1), bassStep.velocity || 0.8, bp);
    }
    } // end bass poweredOn

    // SYNTH SCHEDULING
    if (poweredOn?.synth ?? true) {
    const synthStep = pattern.synth?.[step];
    if (synthStep?.active && synthStep?.note) {
      const sp = currentProject.synthParams || { octave: 4, attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 };
      const synthOctaveShift = (sp.octave ?? 4) - 4;
      const freq = noteToFreq(synthStep.note, synthOctaveShift);
      synthEngine.playNote(adjustedTime, freq, secondsPerStep * (synthStep.length || 4), synthStep.velocity || 0.6, sp);
    }
    } // end synth poweredOn

    // POLY SYNTH SCHEDULING (independent 32-step counter)
    const polySynthStep = pattern.polySynth?.[polySynthStepRef.current];
    if (polySynthStep?.active && polySynthStep.chord.length > 0 && polySynthEngineRef.current) {
      const poweredOn = currentProject.poweredOn?.polySynth ?? true;
      if (poweredOn) {
        const pp = currentProject.polySynthParams || {
          oscMix: 0.5, subLevel: 0.2, cutoff: 0.5, resonance: 0.2,
          envMod: 0.4, attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.4,
          chorus: 0.3, octave: 4,
        };
        polySynthEngineRef.current.triggerChord(adjustedTime, polySynthStep.chord, polySynthStep.velocity || 0.7, pp);
      }
    }

    // DRUM2 SCHEDULING (independent 32-step counter)
    const drum2Tracks = pattern.drum2 || [];
    if (drum2EngineRef.current) {
      const poweredOn = currentProject.poweredOn?.drum2 ?? true;
      if (poweredOn) {
        const anySoloed = drum2Tracks.some(t => t.solo);
        drum2Tracks.forEach((track, trackIndex) => {
          const s = track.steps[drum2StepRef.current];
          if (!s?.active) return;
          if (track.mute) return;
          if (anySoloed && !track.solo) return;
          drum2EngineRef.current!.triggerTrack(trackIndex, adjustedTime, s.velocity || 0.8);
        });
      }
    }

    // SAMPLER SCHEDULING
    if (poweredOn?.sampler ?? true) {
    const callback = samplerCallbackRef.current;
    if (callback) {
      const samplerSteps = pattern.samplerSteps || [];
      const seqNow = audioCtxRef.current.currentTime;
      samplerSteps.forEach((padSteps, padId) => {
        if (padSteps[step]) callback(padId, adjustedTime, seqNow);
      });
    }
    } // end sampler poweredOn

    // LEAD SYNTH SCHEDULING
    if (poweredOn?.lead ?? true) {
      const leadStep = pattern.lead?.[step];
      if (leadStep?.active && leadStep?.note) {
        const lp = currentProject.leadParams || { waveform: 'sawtooth', octave: 4, cutoff: 0.8, resonance: 0.3, attack: 0.01, decay: 0.3, portamento: 0.0 };
        const leadOctaveShift = (lp.octave ?? 4) - 4;
        const freq = noteToFreq(leadStep.note, leadOctaveShift);
        const leadEngine = createLeadSynthEngine(audioCtxRef.current, leadGainRef.current);
        leadEngine.playNote(adjustedTime, freq, secondsPerStep * (leadStep.length || 4), leadStep.velocity || 0.6, lp);
      }
    } // end lead poweredOn

    // FM SYNTH SCHEDULING
    if (poweredOn?.fm ?? true) {
      const fmStep = pattern.fm?.[step];
      if (fmStep?.active && fmStep?.note) {
        const fp = currentProject.fmParams || { ratio: 0.5, modIndex: 0.7, attack: 0.01, decay: 0.8, octave: 5, feedback: 0.0 };
        const fmOctaveShift = (fp.octave ?? 5) - 4;
        const freq = noteToFreq(fmStep.note, fmOctaveShift);
        const fmEngine = createFMSynthEngine(audioCtxRef.current, fmGainRef.current);
        fmEngine.playNote(adjustedTime, freq, secondsPerStep * (fmStep.length || 4), fmStep.velocity || 0.6, fp);
      }
    } // end fm poweredOn

    // PLUCK SYNTH SCHEDULING (independent 32-step counter)
    if (poweredOn?.pluck ?? true) {
      const pluckStep = pattern.pluck?.[pluckStepRef.current];
      if (pluckStep?.active && pluckStep?.note) {
        const pp = currentProject.pluckParams || { damping: 0.7, brightness: 0.8, body: 0.5, octave: 3 };
        const pluckOctaveShift = (pp.octave ?? 3) - 3;
        const freq = noteToFreq(pluckStep.note, pluckOctaveShift);
        const pluckEngine = createPluckEngine(audioCtxRef.current, pluckGainRef.current);
        pluckEngine.playNote(adjustedTime, freq, secondsPerStep * (pluckStep.length || 4), pluckStep.velocity || 0.6, pp);
      }
    } // end pluck poweredOn

    // CHORD STAB SCHEDULING
    if (poweredOn?.stab ?? true) {
      const stabStep = pattern.stab?.[step];
      if (stabStep?.active && stabStep?.note) {
        const sp = currentProject.stabParams || { waveform: 'sawtooth', octave: 4, cutoff: 0.7, attack: 0.01, decay: 0.15, spread: 0.3 };
        const stabOctaveShift = (sp.octave ?? 4) - 4;
        const freq = noteToFreq(stabStep.note, stabOctaveShift);
        const stabEngine = createChordStabEngine(audioCtxRef.current, stabGainRef.current);
        stabEngine.playNote(adjustedTime, freq, secondsPerStep * (stabStep.length || 4), stabStep.velocity || 0.6, sp);
      }
    } // end stab poweredOn
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      console.warn('[scheduler] stopped — audioCtx is null');
      return;
    }

    // Auto-resume if the browser suspended the context (e.g. tab focus loss)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(e => console.warn('[scheduler] resume failed:', e));
    }

    if (ctx.state === 'closed') {
      console.warn('[scheduler] stopped — audioCtx is closed');
      return;
    }

    try {
      while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
        setCurrentStep(stepRef.current);
        setCurrentDrum2Step(drum2StepRef.current);
        setCurrentPluckStep(pluckStepRef.current);
        setCurrentPolySynthStep(polySynthStepRef.current);
        scheduleNote(stepRef.current, nextNoteTimeRef.current);
        const bpm = projectRef.current?.bpm || 120;
        const secondsPerStep = 60 / bpm / 4;
        nextNoteTimeRef.current += secondsPerStep;
        stepRef.current = (stepRef.current + 1) % 16;
        drum2StepRef.current = (drum2StepRef.current + 1) % 32;
        pluckStepRef.current = (pluckStepRef.current + 1) % 32;
        polySynthStepRef.current = (polySynthStepRef.current + 1) % 32;

        // At each bar boundary, advance arrangement if blocks exist
        if (stepRef.current === 0) {
          const blocks = projectRef.current?.arrangementBlocks;
          if (blocks && blocks.length > 0) {
            barRef.current += 1;
            const maxBar = Math.max(...blocks.map(b => b.startBar + b.lengthBars));
            if (barRef.current >= maxBar) barRef.current = 0;
            const active = blocks
              .slice()
              .sort((a, b) => a.startBar - b.startBar)
              .find(b => b.startBar <= barRef.current && barRef.current < b.startBar + b.lengthBars);
            if (active) activePatternIdRef.current = active.patternId;
          }
        }
      }
    } catch (e) {
      console.error('[scheduler] error at step', stepRef.current, e);
    }

    timerIDRef.current = window.setTimeout(scheduler, 25);
  }, [scheduleNote]);

  const applyMixerToAudio = useCallback(() => {
    const m = projectRef.current?.mixer || {};
    const drums = m.drums || {}; const bass = m.bass || {}; const synth = m.synth || {};
    const polySynth = (m as any).polySynth || {}; const drum2Ch = (m as any).drum2 || {};
    const leadCh = (m as any).lead || {}; const fmCh = (m as any).fm || {};
    const pluckCh = (m as any).pluck || {}; const stabCh = (m as any).stab || {};
    const master = m.master || {};

    if (drumGainRef.current)     drumGainRef.current.gain.value     = drums.volume    ?? 0.8;
    if (bassGainRef.current)     bassGainRef.current.gain.value     = bass.volume     ?? 0.8;
    if (synthGainRef.current)    synthGainRef.current.gain.value    = synth.volume    ?? 0.7;
    if (polySynthGainRef.current) polySynthGainRef.current.gain.value = polySynth.volume ?? 0.7;
    if (drum2GainRef.current)    drum2GainRef.current.gain.value    = drum2Ch.volume  ?? 0.8;
    if (leadGainRef.current)     leadGainRef.current.gain.value     = leadCh.volume   ?? 0.7;
    if (fmGainRef.current)       fmGainRef.current.gain.value       = fmCh.volume     ?? 0.7;
    if (pluckGainRef.current)    pluckGainRef.current.gain.value    = pluckCh.volume  ?? 0.7;
    if (stabGainRef.current)     stabGainRef.current.gain.value     = stabCh.volume   ?? 0.7;
    if (masterGainRef.current)   masterGainRef.current.gain.value   = master.volume   ?? 1.0;

    if (drumLowRef.current)  drumLowRef.current.gain.value  = drums.eq?.low  ?? 0;
    if (drumMidRef.current)  drumMidRef.current.gain.value  = drums.eq?.mid  ?? 0;
    if (drumHighRef.current) drumHighRef.current.gain.value = drums.eq?.high ?? 0;

    if (bassLowRef.current)  bassLowRef.current.gain.value  = bass.eq?.low  ?? 0;
    if (bassMidRef.current)  bassMidRef.current.gain.value  = bass.eq?.mid  ?? 0;
    if (bassHighRef.current) bassHighRef.current.gain.value = bass.eq?.high ?? 0;

    if (synthLowRef.current)  synthLowRef.current.gain.value  = synth.eq?.low  ?? 0;
    if (synthMidRef.current)  synthMidRef.current.gain.value  = synth.eq?.mid  ?? 0;
    if (synthHighRef.current) synthHighRef.current.gain.value = synth.eq?.high ?? 0;

    if (polySynthLowRef.current)  polySynthLowRef.current.gain.value  = polySynth.eq?.low  ?? 0;
    if (polySynthMidRef.current)  polySynthMidRef.current.gain.value  = polySynth.eq?.mid  ?? 0;
    if (polySynthHighRef.current) polySynthHighRef.current.gain.value = polySynth.eq?.high ?? 0;

    if (drum2LowRef.current)  drum2LowRef.current.gain.value  = drum2Ch.eq?.low  ?? 0;
    if (drum2MidRef.current)  drum2MidRef.current.gain.value  = drum2Ch.eq?.mid  ?? 0;
    if (drum2HighRef.current) drum2HighRef.current.gain.value = drum2Ch.eq?.high ?? 0;

    if (leadLowRef.current)  leadLowRef.current.gain.value  = leadCh.eq?.low  ?? 0;
    if (leadMidRef.current)  leadMidRef.current.gain.value  = leadCh.eq?.mid  ?? 0;
    if (leadHighRef.current) leadHighRef.current.gain.value = leadCh.eq?.high ?? 0;

    if (fmLowRef.current)  fmLowRef.current.gain.value  = fmCh.eq?.low  ?? 0;
    if (fmMidRef.current)  fmMidRef.current.gain.value  = fmCh.eq?.mid  ?? 0;
    if (fmHighRef.current) fmHighRef.current.gain.value = fmCh.eq?.high ?? 0;

    if (pluckLowRef.current)  pluckLowRef.current.gain.value  = pluckCh.eq?.low  ?? 0;
    if (pluckMidRef.current)  pluckMidRef.current.gain.value  = pluckCh.eq?.mid  ?? 0;
    if (pluckHighRef.current) pluckHighRef.current.gain.value = pluckCh.eq?.high ?? 0;

    if (stabLowRef.current)  stabLowRef.current.gain.value  = stabCh.eq?.low  ?? 0;
    if (stabMidRef.current)  stabMidRef.current.gain.value  = stabCh.eq?.mid  ?? 0;
    if (stabHighRef.current) stabHighRef.current.gain.value = stabCh.eq?.high ?? 0;

    // Per-channel reverb sends
    if (drumReverbSendRef.current)     drumReverbSendRef.current.gain.value     = drums.reverb     ?? 0;
    if (bassReverbSendRef.current)     bassReverbSendRef.current.gain.value     = bass.reverb      ?? 0;
    if (synthReverbSendRef.current)    synthReverbSendRef.current.gain.value    = synth.reverb     ?? 0;
    if (polySynthReverbSendRef.current) polySynthReverbSendRef.current.gain.value = polySynth.reverb ?? 0.1;
    if (drum2ReverbSendRef.current)    drum2ReverbSendRef.current.gain.value    = drum2Ch.reverb   ?? 0;
    if (leadReverbSendRef.current)     leadReverbSendRef.current.gain.value     = leadCh.reverb    ?? 0;
    if (fmReverbSendRef.current)       fmReverbSendRef.current.gain.value       = fmCh.reverb      ?? 0;
    if (pluckReverbSendRef.current)    pluckReverbSendRef.current.gain.value    = pluckCh.reverb   ?? 0;
    if (stabReverbSendRef.current)     stabReverbSendRef.current.gain.value     = stabCh.reverb    ?? 0;

    // Per-channel delay sends
    if (drumDelaySendRef.current)      drumDelaySendRef.current.gain.value      = drums.delay?.mix     ?? 0;
    if (bassDelaySendRef.current)      bassDelaySendRef.current.gain.value      = bass.delay?.mix      ?? 0;
    if (synthDelaySendRef.current)     synthDelaySendRef.current.gain.value     = synth.delay?.mix     ?? 0;
    if (polySynthDelaySendRef.current)  polySynthDelaySendRef.current.gain.value  = polySynth.delay?.mix ?? 0;
    if (drum2DelaySendRef.current)     drum2DelaySendRef.current.gain.value     = drum2Ch.delay?.mix   ?? 0;
    if (leadDelaySendRef.current)      leadDelaySendRef.current.gain.value      = leadCh.delay?.mix    ?? 0;
    if (fmDelaySendRef.current)        fmDelaySendRef.current.gain.value        = fmCh.delay?.mix      ?? 0;
    if (pluckDelaySendRef.current)     pluckDelaySendRef.current.gain.value     = pluckCh.delay?.mix   ?? 0;
    if (stabDelaySendRef.current)      stabDelaySendRef.current.gain.value      = stabCh.delay?.mix    ?? 0;

    // Per-channel drive sends
    if (drumDriveSendRef.current)  drumDriveSendRef.current.gain.value  = drums.driveSend  ?? 0;
    if (bassDriveSendRef.current)  bassDriveSendRef.current.gain.value  = bass.driveSend   ?? 0;
    if (synthDriveSendRef.current) synthDriveSendRef.current.gain.value = synth.driveSend  ?? 0;
    if (leadDriveSendRef.current)  leadDriveSendRef.current.gain.value  = leadCh.driveSend ?? 0;
    if (fmDriveSendRef.current)    fmDriveSendRef.current.gain.value    = fmCh.driveSend   ?? 0;
    if (pluckDriveSendRef.current) pluckDriveSendRef.current.gain.value = pluckCh.driveSend ?? 0;
    if (stabDriveSendRef.current)  stabDriveSendRef.current.gain.value  = stabCh.driveSend ?? 0;

    // Shared effects parameters
    const fx = (m as any).effects || {};
    const fxDelay  = fx.delay  || { time: 0.3, feedback: 0.3, return: 0.8 };
    const fxReverb = fx.reverb || { return: 0.8 };
    const fxDrive  = fx.drive  || { amount: 0, return: 0.8 };

    if (sharedDelayRef.current) {
      sharedDelayRef.current.delayTime.setTargetAtTime(
        fxDelay.time ?? 0.3, audioCtxRef.current?.currentTime || 0, 0.05,
      );
    }
    if (sharedDelayFeedbackRef.current) sharedDelayFeedbackRef.current.gain.value = fxDelay.feedback ?? 0.3;
    if (sharedDelayReturnRef.current)   sharedDelayReturnRef.current.gain.value   = fxDelay.return   ?? 0.8;
    if (sharedReverbReturnRef.current)  sharedReverbReturnRef.current.gain.value  = fxReverb.return  ?? 0.8;
    if (sharedDriveRef.current)         sharedDriveRef.current.curve = makeDistortionCurve((fxDrive.amount ?? 0) * 400);
    if (sharedDriveReturnRef.current)   sharedDriveReturnRef.current.gain.value   = fxDrive.return   ?? 0.8;

    // Master compressor
    if (masterCompressorRef.current) {
      const comp = (master as any).compressor;
      if (comp) {
        masterCompressorRef.current.threshold.value = comp.threshold ?? -12;
        masterCompressorRef.current.knee.value      = comp.knee      ?? 6;
        masterCompressorRef.current.ratio.value     = comp.ratio     ?? 4;
        masterCompressorRef.current.attack.value    = comp.attack    ?? 0.003;
        masterCompressorRef.current.release.value   = comp.release   ?? 0.25;
      }
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // ── Master bus ───────────────────────────────────────────
      masterGainRef.current = ctx.createGain();
      masterCompressorRef.current = ctx.createDynamicsCompressor();

      masterGainRef.current.connect(masterCompressorRef.current);
      masterCompressorRef.current.connect(ctx.destination);
      analysersRef.current.master = ctx.createAnalyser(); analysersRef.current.master.fftSize = 256;
      masterCompressorRef.current.connect(analysersRef.current.master);

      // ── Shared Drive bus (send effect) ───────────────────────
      sharedDriveRef.current = ctx.createWaveShaper();
      sharedDriveRef.current.oversample = '4x';
      sharedDriveReturnRef.current = ctx.createGain();
      sharedDriveReturnRef.current.gain.value = 0.8;
      sharedDriveRef.current.connect(sharedDriveReturnRef.current);
      sharedDriveReturnRef.current.connect(masterGainRef.current);

      // ── Shared Reverb bus ───────────────────────────────────
      sharedReverbRef.current = ctx.createConvolver();
      sharedReverbRef.current.buffer = createReverbIR(ctx, 2.5, 2.0);
      sharedReverbReturnRef.current = ctx.createGain();
      sharedReverbReturnRef.current.gain.value = 0.8;
      sharedReverbRef.current.connect(sharedReverbReturnRef.current);
      sharedReverbReturnRef.current.connect(masterGainRef.current);

      // ── Shared Delay bus ────────────────────────────────────
      sharedDelayRef.current = ctx.createDelay(2.0);
      sharedDelayFeedbackRef.current = ctx.createGain();
      sharedDelayFeedbackRef.current.gain.value = 0.3;
      sharedDelayReturnRef.current = ctx.createGain();
      sharedDelayReturnRef.current.gain.value = 0.8;

      sharedDelayRef.current.connect(sharedDelayFeedbackRef.current);
      sharedDelayFeedbackRef.current.connect(sharedDelayRef.current); // feedback loop
      sharedDelayRef.current.connect(sharedDelayReturnRef.current);
      sharedDelayReturnRef.current.connect(masterGainRef.current);

      // ── DRUMS channel ───────────────────────────────────────
      drumGainRef.current = ctx.createGain();
      drumLowRef.current = ctx.createBiquadFilter(); drumLowRef.current.type = 'lowshelf'; drumLowRef.current.frequency.value = 250;
      drumMidRef.current = ctx.createBiquadFilter(); drumMidRef.current.type = 'peaking'; drumMidRef.current.frequency.value = 1000;
      drumHighRef.current = ctx.createBiquadFilter(); drumHighRef.current.type = 'highshelf'; drumHighRef.current.frequency.value = 4000;
      drumGainRef.current.connect(drumLowRef.current);
      drumLowRef.current.connect(drumMidRef.current);
      drumMidRef.current.connect(drumHighRef.current);
      drumHighRef.current.connect(masterGainRef.current); // dry

      analysersRef.current.drums = ctx.createAnalyser(); analysersRef.current.drums.fftSize = 256;
      drumHighRef.current.connect(analysersRef.current.drums);
      drumReverbSendRef.current = ctx.createGain(); drumReverbSendRef.current.gain.value = 0;
      drumDelaySendRef.current = ctx.createGain(); drumDelaySendRef.current.gain.value = 0;
      drumDriveSendRef.current = ctx.createGain(); drumDriveSendRef.current.gain.value = 0;
      drumHighRef.current.connect(drumReverbSendRef.current);
      drumHighRef.current.connect(drumDelaySendRef.current);
      drumHighRef.current.connect(drumDriveSendRef.current);
      drumReverbSendRef.current.connect(sharedReverbRef.current);
      drumDelaySendRef.current.connect(sharedDelayRef.current);
      drumDriveSendRef.current.connect(sharedDriveRef.current!);

      // ── BASS channel ────────────────────────────────────────
      bassGainRef.current = ctx.createGain();
      bassLowRef.current = ctx.createBiquadFilter(); bassLowRef.current.type = 'lowshelf'; bassLowRef.current.frequency.value = 250;
      bassMidRef.current = ctx.createBiquadFilter(); bassMidRef.current.type = 'peaking'; bassMidRef.current.frequency.value = 1000;
      bassHighRef.current = ctx.createBiquadFilter(); bassHighRef.current.type = 'highshelf'; bassHighRef.current.frequency.value = 4000;
      bassGainRef.current.connect(bassLowRef.current);
      bassLowRef.current.connect(bassMidRef.current);
      bassMidRef.current.connect(bassHighRef.current);
      bassHighRef.current.connect(masterGainRef.current);

      analysersRef.current.bass = ctx.createAnalyser(); analysersRef.current.bass.fftSize = 256;
      bassHighRef.current.connect(analysersRef.current.bass);
      bassReverbSendRef.current = ctx.createGain(); bassReverbSendRef.current.gain.value = 0;
      bassDelaySendRef.current = ctx.createGain(); bassDelaySendRef.current.gain.value = 0;
      bassDriveSendRef.current = ctx.createGain(); bassDriveSendRef.current.gain.value = 0;
      bassHighRef.current.connect(bassReverbSendRef.current);
      bassHighRef.current.connect(bassDelaySendRef.current);
      bassHighRef.current.connect(bassDriveSendRef.current);
      bassReverbSendRef.current.connect(sharedReverbRef.current);
      bassDelaySendRef.current.connect(sharedDelayRef.current);
      bassDriveSendRef.current.connect(sharedDriveRef.current!);

      // ── SYNTH channel ───────────────────────────────────────
      synthGainRef.current = ctx.createGain();
      synthLowRef.current = ctx.createBiquadFilter(); synthLowRef.current.type = 'lowshelf'; synthLowRef.current.frequency.value = 250;
      synthMidRef.current = ctx.createBiquadFilter(); synthMidRef.current.type = 'peaking'; synthMidRef.current.frequency.value = 1000;
      synthHighRef.current = ctx.createBiquadFilter(); synthHighRef.current.type = 'highshelf'; synthHighRef.current.frequency.value = 4000;
      synthGainRef.current.connect(synthLowRef.current);
      synthLowRef.current.connect(synthMidRef.current);
      synthMidRef.current.connect(synthHighRef.current);
      synthHighRef.current.connect(masterGainRef.current);

      analysersRef.current.synth = ctx.createAnalyser(); analysersRef.current.synth.fftSize = 256;
      synthHighRef.current.connect(analysersRef.current.synth);
      synthReverbSendRef.current = ctx.createGain(); synthReverbSendRef.current.gain.value = 0;
      synthDelaySendRef.current = ctx.createGain(); synthDelaySendRef.current.gain.value = 0;
      synthDriveSendRef.current = ctx.createGain(); synthDriveSendRef.current.gain.value = 0;
      synthHighRef.current.connect(synthReverbSendRef.current);
      synthHighRef.current.connect(synthDelaySendRef.current);
      synthHighRef.current.connect(synthDriveSendRef.current);
      synthReverbSendRef.current.connect(sharedReverbRef.current);
      synthDelaySendRef.current.connect(sharedDelayRef.current);
      synthDriveSendRef.current.connect(sharedDriveRef.current!);

      // ── POLY SYNTH channel ──────────────────────────────────
      polySynthGainRef.current = ctx.createGain();
      polySynthLowRef.current = ctx.createBiquadFilter(); polySynthLowRef.current.type = 'lowshelf'; polySynthLowRef.current.frequency.value = 250;
      polySynthMidRef.current = ctx.createBiquadFilter(); polySynthMidRef.current.type = 'peaking'; polySynthMidRef.current.frequency.value = 1000;
      polySynthHighRef.current = ctx.createBiquadFilter(); polySynthHighRef.current.type = 'highshelf'; polySynthHighRef.current.frequency.value = 4000;
      polySynthGainRef.current.connect(polySynthLowRef.current);
      polySynthLowRef.current.connect(polySynthMidRef.current);
      polySynthMidRef.current.connect(polySynthHighRef.current);
      polySynthHighRef.current.connect(masterGainRef.current);
      analysersRef.current.polySynth = ctx.createAnalyser(); analysersRef.current.polySynth.fftSize = 256;
      polySynthHighRef.current.connect(analysersRef.current.polySynth);
      polySynthReverbSendRef.current = ctx.createGain(); polySynthReverbSendRef.current.gain.value = 0.1;
      polySynthDelaySendRef.current = ctx.createGain(); polySynthDelaySendRef.current.gain.value = 0;
      polySynthHighRef.current.connect(polySynthReverbSendRef.current);
      polySynthHighRef.current.connect(polySynthDelaySendRef.current);
      polySynthReverbSendRef.current.connect(sharedReverbRef.current);
      polySynthDelaySendRef.current.connect(sharedDelayRef.current);
      polySynthEngineRef.current = createPolySynthEngine(ctx, polySynthGainRef.current);

      // ── DRUM2 channel ───────────────────────────────────────
      drum2GainRef.current = ctx.createGain();
      drum2LowRef.current = ctx.createBiquadFilter(); drum2LowRef.current.type = 'lowshelf'; drum2LowRef.current.frequency.value = 250;
      drum2MidRef.current = ctx.createBiquadFilter(); drum2MidRef.current.type = 'peaking'; drum2MidRef.current.frequency.value = 1000;
      drum2HighRef.current = ctx.createBiquadFilter(); drum2HighRef.current.type = 'highshelf'; drum2HighRef.current.frequency.value = 4000;
      drum2GainRef.current.connect(drum2LowRef.current);
      drum2LowRef.current.connect(drum2MidRef.current);
      drum2MidRef.current.connect(drum2HighRef.current);
      drum2HighRef.current.connect(masterGainRef.current);
      analysersRef.current.drum2 = ctx.createAnalyser(); analysersRef.current.drum2.fftSize = 256;
      drum2HighRef.current.connect(analysersRef.current.drum2);
      drum2ReverbSendRef.current = ctx.createGain(); drum2ReverbSendRef.current.gain.value = 0;
      drum2DelaySendRef.current = ctx.createGain(); drum2DelaySendRef.current.gain.value = 0;
      drum2HighRef.current.connect(drum2ReverbSendRef.current);
      drum2HighRef.current.connect(drum2DelaySendRef.current);
      drum2ReverbSendRef.current.connect(sharedReverbRef.current);
      drum2DelaySendRef.current.connect(sharedDelayRef.current);
      drum2EngineRef.current = createDigitaktEngine(ctx, drum2GainRef.current);

      // ── LEAD SYNTH channel ──────────────────────────────────
      leadGainRef.current = ctx.createGain();
      leadLowRef.current = ctx.createBiquadFilter(); leadLowRef.current.type = 'lowshelf'; leadLowRef.current.frequency.value = 250;
      leadMidRef.current = ctx.createBiquadFilter(); leadMidRef.current.type = 'peaking'; leadMidRef.current.frequency.value = 1000;
      leadHighRef.current = ctx.createBiquadFilter(); leadHighRef.current.type = 'highshelf'; leadHighRef.current.frequency.value = 4000;
      leadGainRef.current.connect(leadLowRef.current);
      leadLowRef.current.connect(leadMidRef.current);
      leadMidRef.current.connect(leadHighRef.current);
      leadHighRef.current.connect(masterGainRef.current);
      analysersRef.current.lead = ctx.createAnalyser(); analysersRef.current.lead.fftSize = 256;
      leadHighRef.current.connect(analysersRef.current.lead);
      leadReverbSendRef.current = ctx.createGain(); leadReverbSendRef.current.gain.value = 0;
      leadDelaySendRef.current = ctx.createGain(); leadDelaySendRef.current.gain.value = 0;
      leadDriveSendRef.current = ctx.createGain(); leadDriveSendRef.current.gain.value = 0;
      leadHighRef.current.connect(leadReverbSendRef.current);
      leadHighRef.current.connect(leadDelaySendRef.current);
      leadHighRef.current.connect(leadDriveSendRef.current);
      leadReverbSendRef.current.connect(sharedReverbRef.current);
      leadDelaySendRef.current.connect(sharedDelayRef.current);
      leadDriveSendRef.current.connect(sharedDriveRef.current!);

      // ── FM SYNTH channel ────────────────────────────────────
      fmGainRef.current = ctx.createGain();
      fmLowRef.current = ctx.createBiquadFilter(); fmLowRef.current.type = 'lowshelf'; fmLowRef.current.frequency.value = 250;
      fmMidRef.current = ctx.createBiquadFilter(); fmMidRef.current.type = 'peaking'; fmMidRef.current.frequency.value = 1000;
      fmHighRef.current = ctx.createBiquadFilter(); fmHighRef.current.type = 'highshelf'; fmHighRef.current.frequency.value = 4000;
      fmGainRef.current.connect(fmLowRef.current);
      fmLowRef.current.connect(fmMidRef.current);
      fmMidRef.current.connect(fmHighRef.current);
      fmHighRef.current.connect(masterGainRef.current);
      analysersRef.current.fm = ctx.createAnalyser(); analysersRef.current.fm.fftSize = 256;
      fmHighRef.current.connect(analysersRef.current.fm);
      fmReverbSendRef.current = ctx.createGain(); fmReverbSendRef.current.gain.value = 0;
      fmDelaySendRef.current = ctx.createGain(); fmDelaySendRef.current.gain.value = 0;
      fmDriveSendRef.current = ctx.createGain(); fmDriveSendRef.current.gain.value = 0;
      fmHighRef.current.connect(fmReverbSendRef.current);
      fmHighRef.current.connect(fmDelaySendRef.current);
      fmHighRef.current.connect(fmDriveSendRef.current);
      fmReverbSendRef.current.connect(sharedReverbRef.current);
      fmDelaySendRef.current.connect(sharedDelayRef.current);
      fmDriveSendRef.current.connect(sharedDriveRef.current!);

      // ── PLUCK SYNTH channel ─────────────────────────────────
      pluckGainRef.current = ctx.createGain();
      pluckLowRef.current = ctx.createBiquadFilter(); pluckLowRef.current.type = 'lowshelf'; pluckLowRef.current.frequency.value = 250;
      pluckMidRef.current = ctx.createBiquadFilter(); pluckMidRef.current.type = 'peaking'; pluckMidRef.current.frequency.value = 1000;
      pluckHighRef.current = ctx.createBiquadFilter(); pluckHighRef.current.type = 'highshelf'; pluckHighRef.current.frequency.value = 4000;
      pluckGainRef.current.connect(pluckLowRef.current);
      pluckLowRef.current.connect(pluckMidRef.current);
      pluckMidRef.current.connect(pluckHighRef.current);
      pluckHighRef.current.connect(masterGainRef.current);
      analysersRef.current.pluck = ctx.createAnalyser(); analysersRef.current.pluck.fftSize = 256;
      pluckHighRef.current.connect(analysersRef.current.pluck);
      pluckReverbSendRef.current = ctx.createGain(); pluckReverbSendRef.current.gain.value = 0;
      pluckDelaySendRef.current = ctx.createGain(); pluckDelaySendRef.current.gain.value = 0;
      pluckDriveSendRef.current = ctx.createGain(); pluckDriveSendRef.current.gain.value = 0;
      pluckHighRef.current.connect(pluckReverbSendRef.current);
      pluckHighRef.current.connect(pluckDelaySendRef.current);
      pluckHighRef.current.connect(pluckDriveSendRef.current);
      pluckReverbSendRef.current.connect(sharedReverbRef.current);
      pluckDelaySendRef.current.connect(sharedDelayRef.current);
      pluckDriveSendRef.current.connect(sharedDriveRef.current!);

      // ── CHORD STAB channel ──────────────────────────────────
      stabGainRef.current = ctx.createGain();
      stabLowRef.current = ctx.createBiquadFilter(); stabLowRef.current.type = 'lowshelf'; stabLowRef.current.frequency.value = 250;
      stabMidRef.current = ctx.createBiquadFilter(); stabMidRef.current.type = 'peaking'; stabMidRef.current.frequency.value = 1000;
      stabHighRef.current = ctx.createBiquadFilter(); stabHighRef.current.type = 'highshelf'; stabHighRef.current.frequency.value = 4000;
      stabGainRef.current.connect(stabLowRef.current);
      stabLowRef.current.connect(stabMidRef.current);
      stabMidRef.current.connect(stabHighRef.current);
      stabHighRef.current.connect(masterGainRef.current);
      analysersRef.current.stab = ctx.createAnalyser(); analysersRef.current.stab.fftSize = 256;
      stabHighRef.current.connect(analysersRef.current.stab);
      stabReverbSendRef.current = ctx.createGain(); stabReverbSendRef.current.gain.value = 0;
      stabDelaySendRef.current = ctx.createGain(); stabDelaySendRef.current.gain.value = 0;
      stabDriveSendRef.current = ctx.createGain(); stabDriveSendRef.current.gain.value = 0;
      stabHighRef.current.connect(stabReverbSendRef.current);
      stabHighRef.current.connect(stabDelaySendRef.current);
      stabHighRef.current.connect(stabDriveSendRef.current);
      stabReverbSendRef.current.connect(sharedReverbRef.current);
      stabDelaySendRef.current.connect(sharedDelayRef.current);
      stabDriveSendRef.current.connect(sharedDriveRef.current!);

      // Apply initial mixer values to the newly created audio nodes
      applyMixerToAudio();
    }

    if (isPlaying) {
      setIsPlaying(false);
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
    } else {
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      setIsPlaying(true);
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;
      stepRef.current = 0;
      drum2StepRef.current = 0;
      pluckStepRef.current = 0;
      polySynthStepRef.current = 0;
      barRef.current = 0;
      // If arrangement exists, start from the first block's pattern
      const blocks = projectRef.current?.arrangementBlocks;
      if (blocks && blocks.length > 0) {
        const first = blocks.slice().sort((a, b) => a.startBar - b.startBar)[0];
        if (first) activePatternIdRef.current = first.patternId;
      }
      scheduler();
    }
  }, [isPlaying, scheduler, applyMixerToAudio]);

  useEffect(() => {
    const m = project?.mixer;
    const emptyChannel: ChannelMixer = { volume: 0, eq: { low: 0, mid: 0, high: 0 } };
    const drums     = m?.drums     || emptyChannel;
    const bass      = m?.bass      || emptyChannel;
    const synth     = m?.synth     || emptyChannel;
    const polySynth = (m as any)?.polySynth || emptyChannel;
    const drum2Ch   = (m as any)?.drum2     || emptyChannel;
    const leadCh    = (m as any)?.lead      || emptyChannel;
    const fmCh      = (m as any)?.fm        || emptyChannel;
    const pluckCh   = (m as any)?.pluck     || emptyChannel;
    const stabCh    = (m as any)?.stab      || emptyChannel;
    const master    = m?.master || { volume: 1.0, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 } };

    if (drumGainRef.current)      drumGainRef.current.gain.value      = drums.volume     ?? 0.8;
    if (bassGainRef.current)      bassGainRef.current.gain.value      = bass.volume      ?? 0.8;
    if (synthGainRef.current)     synthGainRef.current.gain.value     = synth.volume     ?? 0.7;
    if (polySynthGainRef.current)  polySynthGainRef.current.gain.value  = polySynth.volume ?? 0.7;
    if (drum2GainRef.current)     drum2GainRef.current.gain.value     = drum2Ch.volume   ?? 0.8;
    if (leadGainRef.current)      leadGainRef.current.gain.value      = leadCh.volume    ?? 0.7;
    if (fmGainRef.current)        fmGainRef.current.gain.value        = fmCh.volume      ?? 0.7;
    if (pluckGainRef.current)     pluckGainRef.current.gain.value     = pluckCh.volume   ?? 0.7;
    if (stabGainRef.current)      stabGainRef.current.gain.value      = stabCh.volume    ?? 0.7;
    if (masterGainRef.current)    masterGainRef.current.gain.value    = master.volume    ?? 1.0;

    if (drumLowRef.current)  drumLowRef.current.gain.value  = drums.eq?.low  ?? 0;
    if (drumMidRef.current)  drumMidRef.current.gain.value  = drums.eq?.mid  ?? 0;
    if (drumHighRef.current) drumHighRef.current.gain.value = drums.eq?.high ?? 0;

    if (bassLowRef.current)  bassLowRef.current.gain.value  = bass.eq?.low  ?? 0;
    if (bassMidRef.current)  bassMidRef.current.gain.value  = bass.eq?.mid  ?? 0;
    if (bassHighRef.current) bassHighRef.current.gain.value = bass.eq?.high ?? 0;

    if (synthLowRef.current)  synthLowRef.current.gain.value  = synth.eq?.low  ?? 0;
    if (synthMidRef.current)  synthMidRef.current.gain.value  = synth.eq?.mid  ?? 0;
    if (synthHighRef.current) synthHighRef.current.gain.value = synth.eq?.high ?? 0;

    if (polySynthLowRef.current)  polySynthLowRef.current.gain.value  = polySynth.eq?.low  ?? 0;
    if (polySynthMidRef.current)  polySynthMidRef.current.gain.value  = polySynth.eq?.mid  ?? 0;
    if (polySynthHighRef.current) polySynthHighRef.current.gain.value = polySynth.eq?.high ?? 0;

    if (drum2LowRef.current)  drum2LowRef.current.gain.value  = drum2Ch.eq?.low  ?? 0;
    if (drum2MidRef.current)  drum2MidRef.current.gain.value  = drum2Ch.eq?.mid  ?? 0;
    if (drum2HighRef.current) drum2HighRef.current.gain.value = drum2Ch.eq?.high ?? 0;

    if (leadLowRef.current)  leadLowRef.current.gain.value  = leadCh.eq?.low  ?? 0;
    if (leadMidRef.current)  leadMidRef.current.gain.value  = leadCh.eq?.mid  ?? 0;
    if (leadHighRef.current) leadHighRef.current.gain.value = leadCh.eq?.high ?? 0;

    if (fmLowRef.current)  fmLowRef.current.gain.value  = fmCh.eq?.low  ?? 0;
    if (fmMidRef.current)  fmMidRef.current.gain.value  = fmCh.eq?.mid  ?? 0;
    if (fmHighRef.current) fmHighRef.current.gain.value = fmCh.eq?.high ?? 0;

    if (pluckLowRef.current)  pluckLowRef.current.gain.value  = pluckCh.eq?.low  ?? 0;
    if (pluckMidRef.current)  pluckMidRef.current.gain.value  = pluckCh.eq?.mid  ?? 0;
    if (pluckHighRef.current) pluckHighRef.current.gain.value = pluckCh.eq?.high ?? 0;

    if (stabLowRef.current)  stabLowRef.current.gain.value  = stabCh.eq?.low  ?? 0;
    if (stabMidRef.current)  stabMidRef.current.gain.value  = stabCh.eq?.mid  ?? 0;
    if (stabHighRef.current) stabHighRef.current.gain.value = stabCh.eq?.high ?? 0;

    // Per-channel sends
    if (drumReverbSendRef.current)      drumReverbSendRef.current.gain.value      = drums.reverb         ?? 0;
    if (bassReverbSendRef.current)      bassReverbSendRef.current.gain.value      = bass.reverb          ?? 0;
    if (synthReverbSendRef.current)     synthReverbSendRef.current.gain.value     = synth.reverb         ?? 0;
    if (polySynthReverbSendRef.current)  polySynthReverbSendRef.current.gain.value  = polySynth.reverb    ?? 0.1;
    if (drum2ReverbSendRef.current)     drum2ReverbSendRef.current.gain.value     = drum2Ch.reverb       ?? 0;
    if (leadReverbSendRef.current)      leadReverbSendRef.current.gain.value      = leadCh.reverb        ?? 0;
    if (fmReverbSendRef.current)        fmReverbSendRef.current.gain.value        = fmCh.reverb          ?? 0;
    if (pluckReverbSendRef.current)     pluckReverbSendRef.current.gain.value     = pluckCh.reverb       ?? 0;
    if (stabReverbSendRef.current)      stabReverbSendRef.current.gain.value      = stabCh.reverb        ?? 0;
    if (drumDelaySendRef.current)       drumDelaySendRef.current.gain.value       = drums.delay?.mix     ?? 0;
    if (bassDelaySendRef.current)       bassDelaySendRef.current.gain.value       = bass.delay?.mix      ?? 0;
    if (synthDelaySendRef.current)      synthDelaySendRef.current.gain.value      = synth.delay?.mix     ?? 0;
    if (polySynthDelaySendRef.current)   polySynthDelaySendRef.current.gain.value   = polySynth.delay?.mix ?? 0;
    if (drum2DelaySendRef.current)      drum2DelaySendRef.current.gain.value      = drum2Ch.delay?.mix   ?? 0;
    if (leadDelaySendRef.current)       leadDelaySendRef.current.gain.value       = leadCh.delay?.mix    ?? 0;
    if (fmDelaySendRef.current)         fmDelaySendRef.current.gain.value         = fmCh.delay?.mix      ?? 0;
    if (pluckDelaySendRef.current)      pluckDelaySendRef.current.gain.value      = pluckCh.delay?.mix   ?? 0;
    if (stabDelaySendRef.current)       stabDelaySendRef.current.gain.value       = stabCh.delay?.mix    ?? 0;
    if (drumDriveSendRef.current)       drumDriveSendRef.current.gain.value       = drums.driveSend      ?? 0;
    if (bassDriveSendRef.current)       bassDriveSendRef.current.gain.value       = bass.driveSend       ?? 0;
    if (synthDriveSendRef.current)      synthDriveSendRef.current.gain.value      = synth.driveSend      ?? 0;
    if (leadDriveSendRef.current)       leadDriveSendRef.current.gain.value       = leadCh.driveSend     ?? 0;
    if (fmDriveSendRef.current)         fmDriveSendRef.current.gain.value         = fmCh.driveSend       ?? 0;
    if (pluckDriveSendRef.current)      pluckDriveSendRef.current.gain.value      = pluckCh.driveSend    ?? 0;
    if (stabDriveSendRef.current)       stabDriveSendRef.current.gain.value       = stabCh.driveSend     ?? 0;

    // Shared effects parameters
    const fx       = (m as any)?.effects || {};
    const fxDelay  = fx.delay  || { time: 0.3, feedback: 0.3, return: 0.8 };
    const fxReverb = fx.reverb || { return: 0.8 };
    const fxDrive  = fx.drive  || { amount: 0, return: 0.8 };

    if (sharedDelayRef.current) {
      sharedDelayRef.current.delayTime.setTargetAtTime(
        fxDelay.time ?? 0.3, audioCtxRef.current?.currentTime || 0, 0.05,
      );
    }
    if (sharedDelayFeedbackRef.current) sharedDelayFeedbackRef.current.gain.value = fxDelay.feedback ?? 0.3;
    if (sharedDelayReturnRef.current)   sharedDelayReturnRef.current.gain.value   = fxDelay.return   ?? 0.8;
    if (sharedReverbReturnRef.current)  sharedReverbReturnRef.current.gain.value  = fxReverb.return  ?? 0.8;
    if (sharedDriveRef.current)         sharedDriveRef.current.curve = makeDistortionCurve((fxDrive.amount ?? 0) * 400);
    if (sharedDriveReturnRef.current)   sharedDriveReturnRef.current.gain.value   = fxDrive.return   ?? 0.8;

    // Master compressor
    if (masterCompressorRef.current) {
      const comp = (master as any).compressor;
      if (comp) {
        masterCompressorRef.current.threshold.value = comp.threshold ?? -12;
        masterCompressorRef.current.knee.value      = comp.knee      ?? 6;
        masterCompressorRef.current.ratio.value     = comp.ratio     ?? 4;
        masterCompressorRef.current.attack.value    = comp.attack    ?? 0.003;
        masterCompressorRef.current.release.value   = comp.release   ?? 0.25;
      }
    }
  }, [project?.mixer]);

  // Reset drum2 counter on pattern switch to prevent desync
  useEffect(() => { drum2StepRef.current = 0; }, [activePatternId]);
  useEffect(() => { pluckStepRef.current = 0; }, [activePatternId]);
  useEffect(() => { polySynthStepRef.current = 0; }, [activePatternId]);

  return { isPlaying, currentStep, currentDrum2Step, currentPluckStep, currentPolySynthStep, togglePlay, analysers: analysersRef };
};