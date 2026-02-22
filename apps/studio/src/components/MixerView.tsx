/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Project } from '../types';

interface MixerViewProps {
  mixer: Project['mixer'];
  onMixerChange: (mixer: Project['mixer']) => void;
}

export const MixerView: React.FC<MixerViewProps> = ({ mixer, onMixerChange }) => {
  const updateVolume = (channel: 'drums' | 'bass' | 'master', value: number) => {
    onMixerChange({
      ...mixer,
      [channel]: { ...mixer[channel], volume: value },
    });
  };

  return (
    <div className="p-6 bg-zinc-900 border-l border-zinc-800 w-64 flex flex-col gap-8">
      <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Mixer</h3>
      
      {/* Drums Channel */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-zinc-300">Drums</span>
          <span className="text-[10px] font-mono text-zinc-500">{Math.round(mixer.drums.volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={mixer.drums.volume}
          onChange={(e) => updateVolume('drums', Number(e.target.value))}
          className="accent-emerald-500"
        />
        <div className="grid grid-cols-3 gap-1">
          {['low', 'mid', 'high'].map((band) => (
            <div key={band} className="flex flex-col items-center gap-1">
              <input
                type="range"
                min="-12"
                max="12"
                value={mixer.drums.eq[band as keyof typeof mixer.drums.eq]}
                onChange={(e) => onMixerChange({
                  ...mixer,
                  drums: { ...mixer.drums, eq: { ...mixer.drums.eq, [band]: Number(e.target.value) } }
                })}
                className="h-12 w-1 accent-emerald-500/50"
                style={{ appearance: 'slider-vertical' }}
              />
              <span className="text-[8px] uppercase text-zinc-600">{band}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bass Channel */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-zinc-300">Bass</span>
          <span className="text-[10px] font-mono text-zinc-500">{Math.round(mixer.bass.volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={mixer.bass.volume}
          onChange={(e) => updateVolume('bass', Number(e.target.value))}
          className="accent-indigo-500"
        />
        <div className="grid grid-cols-3 gap-1">
          {['low', 'mid', 'high'].map((band) => (
            <div key={band} className="flex flex-col items-center gap-1">
              <input
                type="range"
                min="-12"
                max="12"
                value={mixer.bass.eq[band as keyof typeof mixer.bass.eq]}
                onChange={(e) => onMixerChange({
                  ...mixer,
                  bass: { ...mixer.bass, eq: { ...mixer.bass.eq, [band]: Number(e.target.value) } }
                })}
                className="h-12 w-1 accent-indigo-500/50"
                style={{ appearance: 'slider-vertical' }}
              />
              <span className="text-[8px] uppercase text-zinc-600">{band}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-8 border-t border-zinc-800 flex flex-col gap-4">
        {/* Master Channel */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Master</span>
            <span className="text-[10px] font-mono text-zinc-500">{Math.round(mixer.master.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={mixer.master.volume}
            onChange={(e) => updateVolume('master', Number(e.target.value))}
            className="accent-white"
          />
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-zinc-500 uppercase font-bold">
              <span>Drive</span>
              <span>{Math.round(mixer.master.drive * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={mixer.master.drive}
              onChange={(e) => onMixerChange({
                ...mixer,
                master: { ...mixer.master, drive: Number(e.target.value) }
              })}
              className="accent-red-500/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
