import { Pattern, DrumTrackData } from '@sequencer/contracts';
import { Transport } from './Transport.js';
import { bpmToStepDuration, calculateStepTime } from './timing.js';

export interface StepEvent {
  stepIndex: number;
  patternId: string;
  trackType: 'drum' | 'bass';
  lane: string;
  preciseTime: number;
  velocity: number;
  noteData?: unknown;
}

export type OnStepCallback = (event: StepEvent) => void;

export class Scheduler {
  private audioContext: AudioContext;
  private transport: Transport;
  private onStep: OnStepCallback;
  private patterns: Map<string, Pattern>;

  private timerId: number | null = null;
  private nextStepTime: number = 0;
  private currentStep: number = 0;
  
  private readonly lookahead: number = 0.1; // 100ms
  private readonly scheduleInterval: number = 25; // 25ms

  constructor(
    audioContext: AudioContext,
    transport: Transport,
    patterns: Pattern[],
    onStep: OnStepCallback
  ) {
    this.audioContext = audioContext;
    this.transport = transport;
    this.onStep = onStep;
    this.patterns = new Map(patterns.map(p => [p.id, p]));
  }

  start() {
    if (this.timerId) return;
    
    this.nextStepTime = this.audioContext.currentTime;
    this.currentStep = 0;
    
    this.timerId = window.setInterval(() => this.schedule(), this.scheduleInterval);
  }

  stop() {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private schedule() {
    if (!this.transport.isPlaying) return;

    // While there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (this.nextStepTime < this.audioContext.currentTime + this.lookahead) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  }

  private scheduleStep(stepIndex: number, time: number) {
    const patternId = this.transport.currentPatternId;
    if (!patternId) return;

    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    const stepDuration = bpmToStepDuration(this.transport.bpm);
    const swing = this.transport.swing;

    // The 'time' passed here is the base time for the start of the step sequence.
    // However, the lookahead pattern usually maintains 'nextStepTime' as the absolute time.
    // We apply swing to the emitted time.
    const preciseTime = calculateStepTime(0, time, stepDuration, swing);
    // Wait, the calculateStepTime logic I wrote takes stepIndex. 
    // In a lookahead loop, 'time' IS already the time for the current step.
    // But swing depends on whether the step is even or odd.
    
    // Let's adjust: the 'time' in the loop is the un-swung time.
    // We apply swing for the callback.
    const swungTime = (stepIndex % 2 !== 0) 
      ? time + swing * (stepDuration * 0.33)
      : time;

    for (const track of pattern.tracks) {
      if (track.type === 'drum') {
        const drumTrack = track as DrumTrackData;
        for (const [laneId, steps] of Object.entries(drumTrack.lanes)) {
          const step = steps[stepIndex];
          if (step?.active) {
            this.onStep({
              stepIndex,
              patternId,
              trackType: 'drum',
              lane: laneId,
              preciseTime: swungTime,
              velocity: step.velocity,
            });
          }
        }
      } else if (track.type === 'bass') {
        const bassStep = track.steps[stepIndex];
        if (bassStep?.active) {
          this.onStep({
            stepIndex,
            patternId,
            trackType: 'bass',
            lane: 'bass',
            preciseTime: swungTime,
            velocity: bassStep.velocity,
            noteData: bassStep.note,
          });
        }
      }
    }
  }

  private advanceStep() {
    const stepDuration = bpmToStepDuration(this.transport.bpm);
    this.nextStepTime += stepDuration;

    this.currentStep++;
    if (this.currentStep >= 16) {
      this.currentStep = 0;
      this.transport.advancePattern();
    }
  }
}
