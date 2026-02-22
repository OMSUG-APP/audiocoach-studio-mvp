/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pattern, DrumInstrument } from '../types';
import { DRUM_INSTRUMENTS } from '../constants';

interface PatternEditorProps {
  pattern: Pattern;
  currentStep: number;
  onToggleDrumStep: (inst: DrumInstrument, step: number) => void;
  onToggleBassStep: (step: number) => void;
  onBassNoteClick: (step: number) => void;
}

export const PatternEditor: React.FC<PatternEditorProps> = ({
  pattern,
  currentStep,
  onToggleDrumStep,
  onToggleBassStep,
  onBassNoteClick,
}) => {
  return (
    <div className="flex-1 overflow-auto p-4 bg-zinc-950">
      <div className="grid grid-cols-[80px_1fr] gap-y-2">
        {/* Drum Rows */}
        {DRUM_INSTRUMENTS.map((inst) => (
          <React.Fragment key={inst}>
            <div className="flex items-center text-xs font-bold text-zinc-500 uppercase tracking-widest">
              {inst}
            </div>
            <div className="grid grid-cols-16 gap-1">
              {pattern.drums[inst].map((step, i) => (
                <button
                  key={i}
                  onClick={() => onToggleDrumStep(inst, i)}
                  className={`h-10 rounded-sm transition-all ${
                    step.active
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  } ${currentStep === i ? 'border-b-2 border-white' : ''} ${
                    i % 4 === 0 ? 'opacity-100' : 'opacity-80'
                  }`}
                />
              ))}
            </div>
          </React.Fragment>
        ))}

        <div className="h-4" /> {/* Spacer */}

        {/* Bass Row */}
        <div className="flex items-center text-xs font-bold text-zinc-500 uppercase tracking-widest">
          Bass
        </div>
        <div className="grid grid-cols-16 gap-1">
          {pattern.bass.map((step, i) => (
            <div key={i} className="flex flex-col gap-1">
              <button
                onClick={() => onToggleBassStep(i)}
                className={`h-10 rounded-sm transition-all ${
                  step.active
                    ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                } ${currentStep === i ? 'border-b-2 border-white' : ''}`}
              />
              {step.active && (
                <button
                  onClick={() => onBassNoteClick(i)}
                  className="text-[10px] font-mono text-zinc-400 hover:text-white"
                >
                  {step.note}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
