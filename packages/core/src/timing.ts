/**
 * Converts BPM to the duration of a single 16th note in seconds.
 */
export function bpmToStepDuration(bpm: number): number {
  // 60 seconds / bpm = duration of a quarter note
  // quarter note / 4 = duration of a 16th note
  return 60 / bpm / 4;
}

/**
 * Calculates the precise time for a step, including swing offset.
 * Swing only affects even-numbered 16th notes (0-indexed: 1, 3, 5...).
 */
export function calculateStepTime(
  stepIndex: number,
  startTime: number,
  stepDuration: number,
  swing: number
): number {
  let time = startTime + stepIndex * stepDuration;
  
  // Apply swing to even-numbered steps (1, 3, 5...)
  // The requirement says "even-numbered 16th note steps", 
  // which usually means the "off-beats" in a 16th note grid.
  if (stepIndex % 2 !== 0) {
    // swing * (stepDuration * 0.33) as per requirements
    time += swing * (stepDuration * 0.33);
  }
  
  return time;
}
