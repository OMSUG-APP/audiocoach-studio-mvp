/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { encodeWAV } from './wavEncoder.js';

/**
 * Renders the audio graph to a WAV Blob.
 * @param project The project data (e.g., tracks, patterns)
 * @param buildAudioGraphCallback A function that takes an OfflineAudioContext and project data, and sets up the graph.
 * @param durationSeconds The duration of the render in seconds.
 */
export async function renderToWav<T>(
  project: T,
  buildAudioGraphCallback: (context: OfflineAudioContext, project: T) => Promise<void> | void,
  durationSeconds: number
): Promise<Blob> {
  const sampleRate = 44100;
  const length = Math.ceil(sampleRate * durationSeconds);
  const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

  await buildAudioGraphCallback(offlineCtx, project);

  const renderedBuffer = await offlineCtx.startRendering();
  return encodeWAV(renderedBuffer);
}

/**
 * Triggers a browser download for the given Blob.
 */
export function downloadWav(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
