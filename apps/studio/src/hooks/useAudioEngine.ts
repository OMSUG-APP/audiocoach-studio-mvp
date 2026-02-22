import { useCallback, useEffect, useRef, useState } from 'react';
import { Project } from '../types';
import { createDrumEngine, createBassEngine, noteToFreq } from '../utils/audio';

function makeDistortionCurve(amount: number) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export const useAudioEngine = (project: Project) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  
  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);
  
  const drumGainRef = useRef<GainNode | null>(null);
  const bassGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const drumLowRef = useRef<BiquadFilterNode | null>(null);
  const drumMidRef = useRef<BiquadFilterNode | null>(null);
  const drumHighRef = useRef<BiquadFilterNode | null>(null);
  
  const bassLowRef = useRef<BiquadFilterNode | null>(null);
  const bassMidRef = useRef<BiquadFilterNode | null>(null);
  const bassHighRef = useRef<BiquadFilterNode | null>(null);

  const masterDriveRef = useRef<WaveShaperNode | null>(null);

  const scheduleNote = useCallback((step: number, time: number) => {
    if (!audioCtxRef.current || !drumGainRef.current || !bassGainRef.current) return;

    const currentProject = projectRef.current;
    const pattern = currentProject?.patterns?.[0]; 
    if (!pattern) return; // Safe fallback

    const bpm = currentProject?.bpm || 120;
    const swing = currentProject?.swing || 0;
    const secondsPerStep = 60 / bpm / 4;
    
    let adjustedTime = time;
    if (step % 2 === 1) {
      adjustedTime += secondsPerStep * (swing / 100);
    }

    const drumEngine = createDrumEngine(audioCtxRef.current, drumGainRef.current);
    const bassEngine = createBassEngine(audioCtxRef.current, bassGainRef.current);

    // Drums (Safe fallback for missing drums object)
    Object.entries(pattern.drums || {}).forEach(([inst, steps]) => {
      const s = steps[step];
      if (s?.active) {
        const p = currentProject.drumParams?.[inst] || { tune: 0.5, decay: 0.5 };
        
        if (inst === 'BD') drumEngine.playBD(adjustedTime, s.velocity, p);
        if (inst === 'SD') drumEngine.playSD(adjustedTime, s.velocity, p);
        if (inst === 'HC') drumEngine.playHC(adjustedTime, s.velocity, p);
        if (inst === 'OH') drumEngine.playOH(adjustedTime, s.velocity, p);
      }
    });

    // Bass (Safe fallback for missing bass array/step)
    const bassStep = pattern.bass?.[step];
    if (bassStep?.active && bassStep?.note) {
      const freq = noteToFreq(bassStep.note);
      // Grab live bass params, or use defaults
      const bp = currentProject.bassParams || { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 };
      bassEngine.playNote(adjustedTime, freq, secondsPerStep * (bassStep.length || 1), bassStep.velocity || 0.8, bp);
    }
  }, []);

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      scheduleNote(stepRef.current, nextNoteTimeRef.current);
      
      const bpm = projectRef.current?.bpm || 120;
      const secondsPerStep = 60 / bpm / 4;
      nextNoteTimeRef.current += secondsPerStep;
      
      stepRef.current = (stepRef.current + 1) % 16;
      setCurrentStep(stepRef.current);
    }
    timerIDRef.current = window.setTimeout(scheduler, 25);
  }, [scheduleNote]);

  const togglePlay = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      
      masterGainRef.current = ctx.createGain();
      masterDriveRef.current = ctx.createWaveShaper();
      masterDriveRef.current.oversample = '4x';
      
      masterGainRef.current.connect(masterDriveRef.current);
      masterDriveRef.current.connect(ctx.destination);
      
      drumGainRef.current = ctx.createGain();
      drumLowRef.current = ctx.createBiquadFilter(); drumLowRef.current.type = 'lowshelf'; drumLowRef.current.frequency.value = 250;
      drumMidRef.current = ctx.createBiquadFilter(); drumMidRef.current.type = 'peaking'; drumMidRef.current.frequency.value = 1000;
      drumHighRef.current = ctx.createBiquadFilter(); drumHighRef.current.type = 'highshelf'; drumHighRef.current.frequency.value = 4000;
      
      drumGainRef.current.connect(drumLowRef.current);
      drumLowRef.current.connect(drumMidRef.current);
      drumMidRef.current.connect(drumHighRef.current);
      drumHighRef.current.connect(masterGainRef.current);
      
      bassGainRef.current = ctx.createGain();
      bassLowRef.current = ctx.createBiquadFilter(); bassLowRef.current.type = 'lowshelf'; bassLowRef.current.frequency.value = 250;
      bassMidRef.current = ctx.createBiquadFilter(); bassMidRef.current.type = 'peaking'; bassMidRef.current.frequency.value = 1000;
      bassHighRef.current = ctx.createBiquadFilter(); bassHighRef.current.type = 'highshelf'; bassHighRef.current.frequency.value = 4000;
      
      bassGainRef.current.connect(bassLowRef.current);
      bassLowRef.current.connect(bassMidRef.current);
      bassMidRef.current.connect(bassHighRef.current);
      bassHighRef.current.connect(masterGainRef.current);
    }

    if (isPlaying) {
      setIsPlaying(false);
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
    } else {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setIsPlaying(true);
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;
      stepRef.current = 0;
      scheduler();
    }
  }, [isPlaying, scheduler]);

  useEffect(() => {
    // Safe fallbacks for the mixer object
    const m = project?.mixer || {};
    const drums = m.drums || {};
    const bass = m.bass || {};
    const master = m.master || {};
    
    if (drumGainRef.current) drumGainRef.current.gain.value = drums.vol ?? drums.volume ?? 0.8;
    if (bassGainRef.current) bassGainRef.current.gain.value = bass.vol ?? bass.volume ?? 0.8;
    if (masterGainRef.current) masterGainRef.current.gain.value = master.vol ?? master.volume ?? 1.0;

    if (drumLowRef.current) drumLowRef.current.gain.value = drums.low ?? 0;
    if (drumMidRef.current) drumMidRef.current.gain.value = drums.mid ?? 0;
    if (drumHighRef.current) drumHighRef.current.gain.value = drums.high ?? 0;

    if (bassLowRef.current) bassLowRef.current.gain.value = bass.low ?? 0;
    if (bassMidRef.current) bassMidRef.current.gain.value = bass.mid ?? 0;
    if (bassHighRef.current) bassHighRef.current.gain.value = bass.high ?? 0;

    if (masterDriveRef.current) {
      const driveAmount = (master.drive ?? 0) * 400;
      masterDriveRef.current.curve = makeDistortionCurve(driveAmount);
    }
  }, [project?.mixer]);

  return { isPlaying, currentStep, togglePlay };
};