/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Project, DrumInstrument } from '../types';
import { createDrumEngine, createBassEngine, noteToFreq } from '../utils/audio';

export const useAudioEngine = (project: Project) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  
  // Mixer nodes
  const drumGainRef = useRef<GainNode | null>(null);
  const bassGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const scheduleNote = useCallback((step: number, time: number) => {
    if (!audioCtxRef.current || !drumGainRef.current || !bassGainRef.current) return;

    const pattern = project.patterns[0]; // For now, just play the first pattern
    const secondsPerStep = 60 / project.bpm / 4;
    
    // Apply swing
    let adjustedTime = time;
    if (step % 2 === 1) {
      adjustedTime += secondsPerStep * (project.swing / 100);
    }

    const drumEngine = createDrumEngine(audioCtxRef.current, drumGainRef.current);
    const bassEngine = createBassEngine(audioCtxRef.current, bassGainRef.current);

    // Drums
    Object.entries(pattern.drums).forEach(([inst, steps]) => {
      const s = steps[step];
      if (s.active) {
        if (inst === 'BD') drumEngine.playBD(adjustedTime, s.velocity);
        if (inst === 'SD') drumEngine.playSD(adjustedTime, s.velocity);
        if (inst === 'HC') drumEngine.playHC(adjustedTime, s.velocity);
        if (inst === 'OH') drumEngine.playOH(adjustedTime, s.velocity);
      }
    });

    // Bass
    const bassStep = pattern.bass[step];
    if (bassStep.active) {
      const freq = noteToFreq(bassStep.note);
      bassEngine.playNote(adjustedTime, freq, secondsPerStep * bassStep.length, bassStep.velocity);
    }
  }, [project]);

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      scheduleNote(stepRef.current, nextNoteTimeRef.current);
      
      const secondsPerStep = 60 / project.bpm / 4;
      nextNoteTimeRef.current += secondsPerStep;
      
      stepRef.current = (stepRef.current + 1) % 16;
      setCurrentStep(stepRef.current);
    }
    timerIDRef.current = window.setTimeout(scheduler, 25);
  }, [project, scheduleNote]);

  const togglePlay = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      
      // Setup Mixer
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.connect(audioCtxRef.current.destination);
      
      drumGainRef.current = audioCtxRef.current.createGain();
      drumGainRef.current.connect(masterGainRef.current);
      
      bassGainRef.current = audioCtxRef.current.createGain();
      bassGainRef.current.connect(masterGainRef.current);
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

  // Update mixer volumes
  useEffect(() => {
    if (drumGainRef.current) drumGainRef.current.gain.value = project.mixer.drums.volume;
    if (bassGainRef.current) bassGainRef.current.gain.value = project.mixer.bass.volume;
    if (masterGainRef.current) masterGainRef.current.gain.value = project.mixer.master.volume;
  }, [project.mixer]);

  return { isPlaying, currentStep, togglePlay };
};
