import React, { useState } from 'react';
import { ChordStep, PolySynthParams } from '../types';
import { InstrumentPanel } from './InstrumentPanel';

const CHORD_PRESETS: Record<string, string[]> = {
  'Maj':  ['C4', 'E4', 'G4'],
  'Min':  ['C4', 'Eb4', 'G4'],
  'Dom7': ['C4', 'E4', 'G4', 'Bb4'],
  'Maj7': ['C4', 'E4', 'G4', 'B4'],
  'Sus4': ['C4', 'F4', 'G4'],
  'Aug':  ['C4', 'E4', 'G#4'],
  'Dim':  ['C4', 'Eb4', 'Gb4'],
};

// White key notes in order, black key positions (null = no black key after this white key)
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS: (string | null)[] = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];
const OCTAVES = [3, 4, 5];

interface PianoKeyboardProps {
  selected: string[];
  onToggle: (note: string) => void;
}

function PianoKeyboard({ selected, onToggle }: PianoKeyboardProps) {
  return (
    <div className="flex gap-0.5">
      {OCTAVES.map(oct => (
        <div key={oct} className="flex relative" style={{ gap: 1 }}>
          {WHITE_KEYS.map((wk, wi) => {
            const full = `${wk}${oct}`;
            const bk = BLACK_KEYS[wi];
            const bkFull = bk ? `${bk}${oct}` : null;
            const wSelected = selected.includes(full);
            const bSelected = bkFull ? selected.includes(bkFull) : false;
            return (
              <div key={wk} className="relative" style={{ width: 22 }}>
                {/* White key */}
                <button
                  onClick={() => onToggle(full)}
                  title={full}
                  className="rounded-b transition-all"
                  style={{
                    width: 22, height: 64,
                    background: wSelected ? '#A855F7' : '#d4d4d8',
                    border: wSelected ? '1px solid #A855F7' : '1px solid #555',
                    boxShadow: wSelected ? '0 0 6px rgba(168,85,247,0.6)' : 'none',
                    position: 'relative', zIndex: 1,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    paddingBottom: 3,
                  }}
                >
                  <span style={{ fontSize: 7, color: wSelected ? '#fff' : '#555', fontWeight: 'bold' }}>
                    {wk}{oct}
                  </span>
                </button>
                {/* Black key */}
                {bkFull && (
                  <button
                    onClick={() => onToggle(bkFull)}
                    title={bkFull}
                    className="absolute rounded-b transition-all"
                    style={{
                      width: 14, height: 38,
                      top: 0, left: 14, zIndex: 2,
                      background: bSelected ? '#A855F7' : '#18181b',
                      border: bSelected ? '1px solid #A855F7' : '1px solid #09090b',
                      boxShadow: bSelected ? '0 0 6px rgba(168,85,247,0.7)' : 'none',
                    }}
                  />
                )}
              </div>
            );
          })}
          {/* Octave label */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ bottom: -14 }}>
            <span style={{ fontSize: 7, color: '#444' }}>C{oct}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface PolySynthRowProps {
  steps: ChordStep[];
  currentStep: number;
  params: PolySynthParams;
  poweredOn: boolean;
  onTogglePower: () => void;
  onToggleStep: (step: number) => void;
  onSetChord: (step: number, chord: string[]) => void;
  onUpdateParam: (param: string, value: any) => void;
}

export const PolySynthRow: React.FC<PolySynthRowProps> = ({
  steps,
  currentStep,
  params,
  poweredOn,
  onTogglePower,
  onToggleStep,
  onSetChord,
  onUpdateParam,
}) => {
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState<string[]>([]);

  const openPicker = (step: number) => {
    setEditingStep(step);
    setTempNotes([...(steps[step]?.chord || [])]);
  };

  const commitChord = () => {
    if (editingStep !== null) {
      onSetChord(editingStep, tempNotes);
    }
    setEditingStep(null);
  };

  const applyPreset = (preset: string[]) => setTempNotes(preset);

  return (
    <InstrumentPanel
      title="Juno Poly Synth"
      poweredOn={poweredOn}
      onTogglePower={onTogglePower}
      color="#A855F7"
    >
      <div className="p-3">
        {/* Step grid — 2 bars of 16, click any step to edit its notes */}
        <div className="flex gap-2 mb-1">
          <div className="flex-1"><span className="text-[8px] text-[#333] tracking-widest">Bar 1</span></div>
          <div className="flex-1"><span className="text-[8px] text-[#333] tracking-widest">Bar 2</span></div>
        </div>
        <div className="flex gap-2 mb-3">
          {[0, 1].map(bar => (
            <div key={bar} className="flex-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '3px' }}>
              {steps.slice(bar * 16, (bar + 1) * 16).map((step, i) => {
                const stepIndex = bar * 16 + i;
                const isActive = step.active;
                const isCurrent = stepIndex === currentStep;
                const hasChord = step.chord.length > 0;
                const groupBorder = i > 0 && i % 4 === 0;
                return (
                  <button
                    key={stepIndex}
                    onClick={() => openPicker(stepIndex)}
                    className="h-8 rounded text-[8px] font-mono transition-all flex flex-col items-center justify-center relative overflow-hidden"
                    title={`Step ${stepIndex + 1}: ${step.chord.join(' ') || 'click to add notes'}`}
                    style={{
                      background: isCurrent ? '#A855F7' : isActive && hasChord ? '#6B21A8' : '#1a1a1e',
                      border: isCurrent ? '2px solid #A855F7' : isActive ? '1px solid #6B21A8' : '1px solid #242428',
                      boxShadow: isCurrent ? '0 0 8px rgba(168,85,247,0.5)' : 'none',
                      marginLeft: groupBorder ? '3px' : undefined,
                    }}
                  >
                    {hasChord && (
                      <span className="text-[6px] text-purple-300 leading-none truncate w-full text-center px-0.5">
                        {step.chord.map(n => n.replace(/\d+$/, '')).join(' ')}
                      </span>
                    )}
                    {!hasChord && (
                      <span style={{ fontSize: 8, color: '#333' }}>+</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Piano picker modal */}
        {editingStep !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={commitChord}>
            <div
              className="bg-[#111113] border border-[#A855F7] rounded-lg p-5"
              style={{ minWidth: 520 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
                  Step {editingStep + 1} — Select Notes
                </span>
                <button onClick={commitChord} className="text-[#555] hover:text-white text-xs">✕</button>
              </div>

              {/* Chord presets */}
              <div className="flex flex-wrap gap-1 mb-4">
                <span className="text-[8px] text-[#444] uppercase tracking-widest self-center mr-1">Presets</span>
                {Object.entries(CHORD_PRESETS).map(([name, notes]) => (
                  <button
                    key={name}
                    onClick={() => applyPreset(notes)}
                    className="px-2 py-0.5 text-[9px] font-bold rounded border border-purple-800 text-purple-300 hover:bg-purple-900 transition-colors"
                  >
                    {name}
                  </button>
                ))}
                <button
                  onClick={() => setTempNotes([])}
                  className="px-2 py-0.5 text-[9px] font-bold rounded border border-red-800 text-red-400 hover:bg-red-900 transition-colors ml-2"
                >
                  Clear
                </button>
              </div>

              {/* Piano keyboard */}
              <div className="mb-5 pb-5">
                <PianoKeyboard selected={tempNotes} onToggle={(note) => {
                  setTempNotes(prev => prev.includes(note) ? prev.filter(n => n !== note) : [...prev, note]);
                }} />
              </div>

              {/* Selected notes */}
              <div className="flex items-center gap-2 mb-4 min-h-6 flex-wrap">
                <span className="text-[8px] text-[#444] uppercase tracking-widest">Notes:</span>
                {tempNotes.length > 0 ? tempNotes.map(n => (
                  <span key={n} className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: '#3B1968', color: '#C084FC', border: '1px solid #6B21A8' }}>
                    {n}
                  </span>
                )) : (
                  <span className="text-[9px] text-[#333]">No notes selected — click keys above</span>
                )}
              </div>

              <button
                onClick={commitChord}
                className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white text-[9px] font-bold uppercase tracking-widest rounded transition-colors"
              >
                Apply to Step {editingStep + 1}
              </button>
            </div>
          </div>
        )}

        {/* Params row */}
        <div className="grid grid-cols-6 gap-3 mt-2">
          {[
            { label: 'Cutoff', key: 'cutoff' },
            { label: 'Res', key: 'resonance' },
            { label: 'Env Mod', key: 'envMod' },
            { label: 'Attack', key: 'attack' },
            { label: 'Release', key: 'release' },
            { label: 'Chorus', key: 'chorus' },
          ].map(({ label, key }) => (
            <div key={key} className="flex flex-col gap-1 min-w-0">
              <span className="text-[8px] uppercase tracking-wider text-[#555] text-center truncate">{label}</span>
              <input
                type="range" min={0} max={1} step={0.01}
                value={(params as any)[key] ?? 0.5}
                onChange={e => onUpdateParam(key, parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer block"
                style={{ accentColor: '#A855F7' }}
              />
            </div>
          ))}
        </div>
      </div>
    </InstrumentPanel>
  );
};
