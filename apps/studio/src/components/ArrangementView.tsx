/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Project } from '../types';

interface ArrangementViewProps {
  arrangement: Project['arrangement'];
  patterns: Project['patterns'];
}

export const ArrangementView: React.FC<ArrangementViewProps> = ({ arrangement, patterns }) => {
  return (
    <div className="h-32 bg-zinc-900 border-b border-zinc-800 overflow-x-auto overflow-y-hidden flex items-center p-4">
      <div className="relative h-20 bg-zinc-950 rounded border border-zinc-800 flex-shrink-0" style={{ width: '2000px' }}>
        {/* Grid Lines */}
        {Array.from({ length: 128 }).map((_, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 border-l ${
              i % 16 === 0 ? 'border-zinc-700' : 'border-zinc-900'
            }`}
            style={{ left: `${i * 20}px` }}
          />
        ))}

        {/* Regions */}
        {arrangement.map((region) => {
          const pattern = patterns.find((p) => p.id === region.patternId);
          return (
            <div
              key={region.id}
              className="absolute top-2 bottom-2 bg-emerald-500/20 border border-emerald-500 rounded flex items-center justify-center text-[10px] font-bold text-emerald-500 uppercase overflow-hidden"
              style={{
                left: `${region.startStep * 20}px`,
                width: `${region.length * 20}px`,
              }}
            >
              {pattern?.name || 'Unknown'}
            </div>
          );
        })}
      </div>
    </div>
  );
};
