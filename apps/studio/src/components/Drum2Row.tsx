import React from 'react';
import { Shuffle } from 'lucide-react';
import { Drum2Track } from '../types';
import { InstrumentPanel } from './InstrumentPanel';

interface Drum2RowProps {
  tracks: Drum2Track[];
  currentStep: number;
  currentDrum2Step: number;
  poweredOn: boolean;
  onTogglePower: () => void;
  onToggleStep: (trackIndex: number, step: number) => void;
  onUpdateTrackParam: (trackIndex: number, param: string, value: any) => void;
  onGenerate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const GenBtn = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-2 py-1 text-[13px] font-bold rounded border border-[#242428] hover:border-[#22D3EE] hover:text-[#22D3EE] text-[#555] transition-colors uppercase tracking-widest flex-shrink-0"
  >
    <Shuffle size={9} />
    Generate
  </button>
);

export const Drum2Row: React.FC<Drum2RowProps> = ({
  tracks,
  currentDrum2Step,
  poweredOn,
  onTogglePower,
  onToggleStep,
  onUpdateTrackParam,
  onGenerate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const BAR_SIZE = 16;
  return (
    <InstrumentPanel
      id="drum2"
      title="Elektron Drum 2"
      poweredOn={poweredOn}
      onTogglePower={onTogglePower}
      defaultExpanded={false}
      color="#22D3EE"
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      isFirst={isFirst}
      isLast={isLast}
    >
      <div className="px-3 pb-3">
        {/* Header bar with Generate */}
        <div className="flex items-center py-2 border-b border-[#242428] mb-3">
          <div className="ml-auto">
            <GenBtn onClick={onGenerate} />
          </div>
        </div>

        {/* Bar labels */}
        <div className="flex gap-2 mb-1 ml-[6.5rem]">
          <div className="flex-1 flex">
            <span className="text-[12px] text-[#333] tracking-widest">Bar 1</span>
          </div>
          <div className="flex-1 flex">
            <span className="text-[12px] text-[#333] tracking-widest">Bar 2</span>
          </div>
        </div>

        {/* Track rows */}
        <div className="flex flex-col gap-1">
          {tracks.map((track, trackIndex) => {
            const isMuted  = track.mute  ?? false;
            const isSoloed = track.solo  ?? false;
            return (
              <div key={trackIndex} className="flex items-center gap-2">
                <span
                  className="text-[13px] font-bold uppercase tracking-wider w-8 text-right flex-shrink-0"
                  style={{ color: '#22D3EE' }}
                >
                  {track.name}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onUpdateTrackParam(trackIndex, 'mute', !isMuted)}
                    className="text-[13px] font-bold px-1.5 py-0.5 rounded border transition-colors"
                    style={isMuted
                      ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' }
                      : { background: 'transparent', borderColor: '#333338', color: '#666' }}
                  >M</button>
                  <button
                    onClick={() => onUpdateTrackParam(trackIndex, 'solo', !isSoloed)}
                    className="text-[13px] font-bold px-1.5 py-0.5 rounded border transition-colors"
                    style={isSoloed
                      ? { background: '#22D3EE', borderColor: '#22D3EE', color: '#000' }
                      : { background: 'transparent', borderColor: '#333338', color: '#666' }}
                  >S</button>
                </div>
                <div className="flex flex-1 gap-2">
                  {[0, 1].map(bar => (
                    <div
                      key={bar}
                      className="flex-1"
                      style={{ display: 'grid', gridTemplateColumns: `repeat(${BAR_SIZE}, 1fr)`, gap: '2px' }}
                    >
                      {track.steps.slice(bar * BAR_SIZE, (bar + 1) * BAR_SIZE).map((step, i) => {
                        const stepIndex  = bar * BAR_SIZE + i;
                        const isActive   = step.active;
                        const isCurrent  = stepIndex === currentDrum2Step;
                        const groupBorder = i > 0 && i % 4 === 0;
                        return (
                          <button
                            key={stepIndex}
                            onClick={() => onToggleStep(trackIndex, stepIndex)}
                            className="h-6 rounded-sm transition-all"
                            style={{
                              background:  isCurrent ? '#22D3EE' : isActive ? '#0E7490' : '#1a1a1e',
                              border:      isCurrent ? '1px solid #22D3EE' : isActive ? '1px solid #0891B2' : '1px solid #242428',
                              marginLeft:  groupBorder ? '3px' : undefined,
                              boxShadow:   isCurrent ? '0 0 6px rgba(34,211,238,0.5)' : 'none',
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tune / Decay params */}
        <div className="mt-4 flex gap-3 overflow-x-auto items-center pb-1">
          {tracks.map((track, trackIndex) => (
            <div key={trackIndex} className="flex flex-col bg-[#0A0A0B] p-3 rounded border border-[#242428] min-w-[110px] flex-shrink-0">
              <div className="text-[13px] font-bold mb-3 text-center tracking-widest" style={{ color: '#22D3EE' }}>{track.name}</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#8A8A94] uppercase w-8 tracking-widest">Tune</span>
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={track.tune ?? 0.5}
                    onChange={e => onUpdateTrackParam(trackIndex, 'tune', parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer"
                    style={{ accentColor: '#22D3EE' }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#8A8A94] uppercase w-8 tracking-widest">Dcy</span>
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={track.decay ?? 0.5}
                    onChange={e => onUpdateTrackParam(trackIndex, 'decay', parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer"
                    style={{ accentColor: '#22D3EE' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </InstrumentPanel>
  );
};
