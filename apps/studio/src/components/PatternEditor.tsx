import React from 'react';
import { Pattern, DrumInstrument } from '../types';

interface PatternEditorProps {
  pattern: Pattern;
  currentStep: number;
  onToggleDrumStep: (inst: DrumInstrument, step: number) => void;
  onToggleBassStep: (step: number, note: string) => void;
  drumParams?: Record<string, { tune: number; decay: number }>;
  onUpdateDrumParam: (inst: string, param: string, value: number) => void;
  // NEW: Bass Props
  bassParams?: { waveform: string; cutoff: number; resonance: number; envMod: number; decay: number };
  onUpdateBassParam: (param: string, value: any) => void;
}

const BASS_NOTES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];

export function PatternEditor({
  pattern,
  currentStep,
  onToggleDrumStep,
  onToggleBassStep,
  drumParams = {},
  onUpdateDrumParam,
  bassParams,
  onUpdateBassParam
}: PatternEditorProps) {
  
  const formatDrumName = (name: string) => {
    const map: Record<string, string> = {
      kick: 'BD', snare: 'SD', clap: 'HC', hat: 'OH', openhat: 'LT', rim: 'HT'
    };
    return map[name.toLowerCase()] || name.substring(0, 2).toUpperCase();
  };

  const instruments = ['BD', 'SD', 'HC', 'OH'];
  const bp = bassParams || { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 };

  return (
    <div className="flex flex-col h-full">
      
      {/* DRUMS SECTION */}
      <div className="flex flex-col gap-2">
        {Object.entries(pattern.drums).map(([inst, steps]) => (
          <div key={inst} className="flex items-center gap-4">
            <div className="w-8 text-xs font-bold text-[#a1a1aa] tracking-wider">
              {formatDrumName(inst)}
            </div>
            <div className="flex-1 grid grid-cols-16 gap-1">
              {steps.map((step: any, i: number) => (
                <button
                  key={i}
                  onClick={() => onToggleDrumStep(inst as DrumInstrument, i)}
                  className={`h-10 rounded-sm border transition-all duration-75 ${
                    step.active
                      ? 'bg-[#10b981] border-[#059669] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-[#1a1a1a] border-[#27272a] hover:bg-[#27272a]'
                  } ${currentStep === i ? 'ring-2 ring-white z-10' : ''}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* DRUM PARAMS SECTION */}
      <div className="mt-6 mb-2 flex gap-4 overflow-x-auto items-center pb-2">
        {instruments.map(inst => {
          const p = drumParams[inst] || { tune: 0.5, decay: 0.5 };
          return (
            <div key={inst} className="flex flex-col bg-[#0a0a0a] p-3 rounded border border-[#27272a] min-w-[120px]">
              <div className="text-xs font-bold text-[#10b981] mb-3 text-center">{inst}</div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#a1a1aa] uppercase w-8">Tune</span>
                  <input type="range" min="0" max="1" step="0.01" value={p.tune} 
                    onChange={e => onUpdateDrumParam(inst, 'tune', parseFloat(e.target.value))} 
                    className="flex-1 h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#10b981]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#a1a1aa] uppercase w-8">Decay</span>
                  <input type="range" min="0" max="1" step="0.01" value={p.decay} 
                    onChange={e => onUpdateDrumParam(inst, 'decay', parseFloat(e.target.value))} 
                    className="flex-1 h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#10b981]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BASS SECTION (Piano Roll & Controls) */}
      <div className="mt-4 border-t border-[#27272a] pt-6">
        
        {/* Bass Header & Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold text-[#f97316] tracking-widest uppercase">Bass Synthesizer</div>
          
          {/* ACID CONTROLS */}
          <div className="flex items-center gap-4 bg-[#0a0a0a] p-2 rounded border border-[#27272a]">
            
            {/* Waveform Toggle */}
            <button 
              onClick={() => onUpdateBassParam('waveform', bp.waveform === 'sawtooth' ? 'square' : 'sawtooth')}
              className="px-3 py-1 bg-[#1a1a1a] border border-[#3f3f46] hover:bg-[#27272a] rounded text-[10px] font-bold text-[#f97316] transition-colors"
            >
              {bp.waveform === 'sawtooth' ? 'SAW' : 'SQR'}
            </button>

            {/* Sliders */}
            <div className="flex gap-4">
              {[
                { label: 'Cutoff', key: 'cutoff' },
                { label: 'Res', key: 'resonance' },
                { label: 'Env', key: 'envMod' },
                { label: 'Decay', key: 'decay' }
              ].map(({ label, key }) => (
                <div key={key} className="flex flex-col items-center gap-1 w-12">
                  <span className="text-[9px] text-[#a1a1aa] uppercase">{label}</span>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={(bp as any)[key]} 
                    onChange={e => onUpdateBassParam(key, parseFloat(e.target.value))} 
                    className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#f97316]" 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Piano Roll Grid */}
        <div className="flex flex-col gap-1">
          {BASS_NOTES.map((note) => (
            <div key={note} className="flex items-center gap-4">
              <div className="w-8 text-[10px] font-bold text-[#a1a1aa] tracking-wider text-right pr-1">
                {note}
              </div>
              <div className="flex-1 grid grid-cols-16 gap-1">
                {pattern.bass.map((step: any, i: number) => {
                  const fullNote = `${note}2`;
                  const isActive = step.active && step.note === fullNote;
                  
                  return (
                    <button
                      key={i}
                      onClick={() => onToggleBassStep(i, fullNote)}
                      className={`h-6 rounded-sm border transition-all duration-75 ${
                        isActive
                          ? 'bg-[#f97316] border-[#ea580c] shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                          : 'bg-[#1a1a1a] border-[#27272a] hover:bg-[#27272a]'
                      } ${currentStep === i ? 'ring-1 ring-white z-10' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}