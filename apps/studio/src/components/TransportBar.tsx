/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, Sliders, Music } from 'lucide-react';

interface TransportBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  swing: number;
  onSwingChange: (swing: number) => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  onTogglePlay,
  bpm,
  onBpmChange,
  swing,
  onSwingChange,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 text-zinc-100">
      <div className="flex items-center gap-4">
        <button
          onClick={onTogglePlay}
          className={`p-3 rounded-full transition-all ${
            isPlaying ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          {isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>
        
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Tempo</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              className="bg-transparent text-xl font-mono w-16 focus:outline-none"
            />
            <span className="text-xs text-zinc-600">BPM</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Swing</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={swing}
              onChange={(e) => onSwingChange(Number(e.target.value))}
              className="w-24 accent-emerald-500"
            />
            <span className="text-xs font-mono w-8 text-right">{swing}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
