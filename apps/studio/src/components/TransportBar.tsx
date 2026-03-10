import React, { useState, useRef, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { Pattern } from '../types';

interface TransportBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  swing: number;
  onSwingChange: (swing: number) => void;
  patterns: Pattern[];
  activePatternId: string;
  onSelectPattern: (id: string) => void;
  onSwitchOrCreatePattern: (slotIndex: number) => void;
  onRenamePattern: (id: string, name: string) => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  onTogglePlay,
  bpm,
  onBpmChange,
  swing,
  onSwingChange,
  patterns,
  activePatternId,
  onSelectPattern,
  onSwitchOrCreatePattern,
  onRenamePattern,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenamePattern(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="bg-[#111113] border-b border-[#242428]">
      {/* Transport row */}
      <div className="flex items-center justify-between px-6 py-3 text-[#F0F0F2]">
        <div className="flex items-center gap-4">
          <button
            onClick={onTogglePlay}
            className="p-3 rounded-full transition-all"
            style={
              isPlaying
                ? { background: '#FF5F00', color: '#000', boxShadow: '0 0 16px rgba(255, 95, 0, 0.5)' }
                : { background: '#1a1a1e', color: '#8A8A94' }
            }
          >
            {isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>

          <div className="flex flex-col">
            <span className="text-[13px] uppercase tracking-[0.2em] text-[#8A8A94] font-bold">Tempo</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bpm}
                onChange={(e) => onBpmChange(Number(e.target.value))}
                className="bg-transparent text-xl font-mono w-16 focus:outline-none text-[#F0F0F2]"
              />
              <span className="text-[13px] uppercase tracking-widest text-[#8A8A94]">BPM</span>
            </div>
          </div>
        </div>

        {/* Pattern slots */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] uppercase tracking-[0.2em] text-[#8A8A94] font-bold mr-1">Patterns</span>
          <div className="flex gap-1">
            {Array.from({ length: 16 }).map((_, i) => {
              const pattern = patterns[i];
              const isActive = pattern?.id === activePatternId;
              const hasData = !!pattern;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (pattern) onSelectPattern(pattern.id);
                    else onSwitchOrCreatePattern(i);
                  }}
                  onDoubleClick={() => {
                    if (pattern) {
                      setRenamingId(pattern.id);
                      setRenameValue(pattern.name);
                    }
                  }}
                  title={pattern?.name || `Slot ${i + 1}`}
                  className="w-7 h-7 rounded text-[13px] font-bold font-mono transition-all flex items-center justify-center relative"
                  style={
                    isActive
                      ? { background: '#1a1a0e', color: '#FF5F00', border: '2px solid #FF5F00', boxShadow: '0 0 8px rgba(255,95,0,0.4)' }
                      : hasData
                      ? { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #333' }
                      : { background: 'transparent', color: '#333', border: '1px solid #1e1e22' }
                  }
                >
                  {renamingId === pattern?.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenamingId(null);
                        e.stopPropagation();
                      }}
                      className="absolute inset-0 bg-[#242428] text-[#F0F0F2] text-[12px] text-center rounded border border-[#FF5F00] focus:outline-none w-full px-0.5"
                      style={{ zIndex: 10 }}
                    />
                  ) : (
                    i + 1
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[13px] uppercase tracking-[0.2em] text-[#8A8A94] font-bold">Swing</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={swing}
                onChange={(e) => onSwingChange(Number(e.target.value))}
                className="w-24"
                style={{ accentColor: '#FF5F00' }}
              />
              <span className="text-xs font-mono w-8 text-right text-[#F0F0F2]">{swing}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
