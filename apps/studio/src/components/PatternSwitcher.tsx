/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pattern } from '../types';

interface PatternSwitcherProps {
  patterns: Pattern[];
  activePatternId: string;
  onSelectPattern: (id: string) => void;
  onAddPattern: () => void;
}

export const PatternSwitcher: React.FC<PatternSwitcherProps> = ({
  patterns,
  activePatternId,
  onSelectPattern,
  onAddPattern,
}) => {
  return (
    <div className="p-4 bg-zinc-900 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Patterns</span>
        <button
          onClick={onAddPattern}
          className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold hover:text-emerald-400"
        >
          + New
        </button>
      </div>
      <div className="grid grid-cols-8 gap-2">
        {Array.from({ length: 32 }).map((_, i) => {
          const pattern = patterns[i];
          const isActive = pattern?.id === activePatternId;
          return (
            <button
              key={i}
              disabled={!pattern}
              onClick={() => pattern && onSelectPattern(pattern.id)}
              className={`h-10 rounded border transition-all flex items-center justify-center text-xs font-mono ${
                isActive
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                  : pattern
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-800 cursor-not-allowed'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
