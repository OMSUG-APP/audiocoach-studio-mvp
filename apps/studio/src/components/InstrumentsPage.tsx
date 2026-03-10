import React, { useState } from 'react';
import { useProjectStore, useActivePattern } from '../store/useProjectStore';
import { Slider } from './Slider';

type InstrumentTab = 'drum1' | 'drum2' | 'bass' | 'pad' | 'polysynth' | 'sampler';

const TAB_LABELS: Record<InstrumentTab, string> = {
  drum1: 'Drum 1', drum2: 'Drum 2', bass: 'Bass 303',
  pad: 'Atm Pad', polysynth: 'Juno Poly', sampler: 'Sampler',
};

const TAB_COLORS: Record<InstrumentTab, string> = {
  drum1: '#FF5F00', drum2: '#22D3EE', bass: '#F59E0B',
  pad: '#8B5CF6', polysynth: '#A855F7', sampler: '#10B981',
};

export function InstrumentsPage() {
  const [activeTab, setActiveTab] = useState<InstrumentTab>('drum1');
  const project = useProjectStore(s => s.project);
  const store = useProjectStore();
  const activePattern = useActivePattern();

  const color = TAB_COLORS[activeTab];

  return (
    <div className="flex flex-col h-full bg-[#111113] border border-[#242428] rounded-lg shadow-lg overflow-hidden">
      {/* Instrument tabs */}
      <div className="flex border-b border-[#242428] bg-[#0d0d0f]">
        {(Object.keys(TAB_LABELS) as InstrumentTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 text-[9px] font-bold uppercase tracking-widest transition-colors"
            style={activeTab === tab
              ? { color: TAB_COLORS[tab], borderBottom: `2px solid ${TAB_COLORS[tab]}` }
              : { color: '#444', borderBottom: '2px solid transparent' }
            }
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'drum1' && (
          <DrumInstrumentEditor
            drumParams={project.drumParams || {}}
            drumKit={project.drumKit || '808'}
            onUpdateParam={store.updateDrumParam}
            onDrumKitChange={store.drumKitChange}
            color={color}
          />
        )}
        {activeTab === 'bass' && (
          <BassEditor
            params={project.bassParams || { waveform: 'sawtooth', octave: 2, cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 }}
            onUpdateParam={store.updateBassParam}
            color={color}
          />
        )}
        {activeTab === 'pad' && (
          <PadEditor
            params={project.synthParams || { octave: 4, attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 }}
            onUpdateParam={store.updateSynthParam}
            color={color}
          />
        )}
        {activeTab === 'polysynth' && (
          <PolySynthEditor
            params={project.polySynthParams || { oscMix: 0.5, subLevel: 0.2, cutoff: 0.5, resonance: 0.2, envMod: 0.4, attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.4, chorus: 0.3, octave: 4 }}
            onUpdateParam={store.updatePolySynthParam}
            color={color}
          />
        )}
        {(activeTab === 'drum2' || activeTab === 'sampler') && (
          <div className="text-[#444] text-sm text-center mt-16">
            {activeTab === 'drum2' ? 'Drum 2 deep editor — coming soon' : 'Sampler deep editor — use Sampler tab above'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-editors ──────────────────────────────────────────────────────────────

function ParamRow({ label, value, onChange, min = 0, max = 1, step = 0.01, color }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; color: string;
}) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-[#1a1a1e]">
      <span className="text-[10px] font-bold uppercase tracking-widest w-28 flex-shrink-0" style={{ color: '#8A8A94' }}>
        {label}
      </span>
      <div className="flex-1">
        <Slider value={value} onChange={onChange} min={min} max={max} step={step} color={color} />
      </div>
      <span className="text-[10px] font-mono w-10 text-right" style={{ color }}>{value.toFixed(2)}</span>
    </div>
  );
}

function DrumInstrumentEditor({ drumParams, drumKit, onUpdateParam, onDrumKitChange, color }: any) {
  return (
    <div>
      <div className="flex gap-2 mb-6">
        <span className="text-[10px] uppercase tracking-widest text-[#555] self-center mr-2">Kit</span>
        {(['808', '909'] as const).map(k => (
          <button
            key={k}
            onClick={() => onDrumKitChange(k)}
            className="px-4 py-1.5 text-[9px] font-bold rounded uppercase tracking-widest transition-colors"
            style={drumKit === k ? { background: color, color: '#000' } : { background: '#1a1a1e', color: '#555', border: '1px solid #242428' }}
          >
            {k}
          </button>
        ))}
      </div>
      {['BD', 'SD', 'HC', 'OH', 'LT', 'HT'].map(inst => {
        const p = drumParams[inst] || { tune: 0.5, decay: 0.5 };
        return (
          <div key={inst} className="mb-4 p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
            <div className="text-[11px] font-bold mb-3" style={{ color }}>{inst}</div>
            <ParamRow label="Tune" value={p.tune} onChange={v => onUpdateParam(inst, 'tune', v)} color={color} />
            <ParamRow label="Decay" value={p.decay} onChange={v => onUpdateParam(inst, 'decay', v)} color={color} />
          </div>
        );
      })}
    </div>
  );
}

function BassEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Bass 303 Synthesizer</h3>
      <div className="p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
        <div className="flex gap-2 mb-4">
          <span className="text-[10px] text-[#555] self-center">Waveform</span>
          {['sawtooth', 'square'].map(w => (
            <button key={w} onClick={() => onUpdateParam('waveform', w)}
              className="px-3 py-1 text-[9px] font-bold rounded uppercase tracking-widest"
              style={params.waveform === w ? { background: color, color: '#000' } : { background: '#1a1a1e', color: '#555', border: '1px solid #242428' }}>
              {w === 'sawtooth' ? 'SAW' : 'SQR'}
            </button>
          ))}
        </div>
        <ParamRow label="Cutoff" value={params.cutoff} onChange={v => onUpdateParam('cutoff', v)} color={color} />
        <ParamRow label="Resonance" value={params.resonance} onChange={v => onUpdateParam('resonance', v)} color={color} />
        <ParamRow label="Env Mod" value={params.envMod} onChange={v => onUpdateParam('envMod', v)} color={color} />
        <ParamRow label="Decay" value={params.decay} onChange={v => onUpdateParam('decay', v)} color={color} />
        <ParamRow label="Octave" value={params.octave ?? 2} onChange={v => onUpdateParam('octave', Math.round(v))} min={0} max={8} step={1} color={color} />
      </div>
    </div>
  );
}

function PadEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Atmospheric Pad Synth</h3>
      <div className="p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
        <ParamRow label="Attack" value={params.attack} onChange={v => onUpdateParam('attack', v)} color={color} />
        <ParamRow label="Release" value={params.release} onChange={v => onUpdateParam('release', v)} color={color} />
        <ParamRow label="Cutoff" value={params.cutoff} onChange={v => onUpdateParam('cutoff', v)} color={color} />
        <ParamRow label="Detune" value={params.detune} onChange={v => onUpdateParam('detune', v)} color={color} />
        <ParamRow label="Octave" value={params.octave ?? 4} onChange={v => onUpdateParam('octave', Math.round(v))} min={0} max={8} step={1} color={color} />
      </div>
    </div>
  );
}

function PolySynthEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Juno Poly Synthesizer</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-3">Oscillator</div>
          <ParamRow label="Osc Mix" value={params.oscMix} onChange={v => onUpdateParam('oscMix', v)} color={color} />
          <ParamRow label="Sub Level" value={params.subLevel} onChange={v => onUpdateParam('subLevel', v)} color={color} />
          <ParamRow label="Octave" value={params.octave} onChange={v => onUpdateParam('octave', Math.round(v))} min={2} max={6} step={1} color={color} />
        </div>
        <div className="p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-3">Filter</div>
          <ParamRow label="Cutoff" value={params.cutoff} onChange={v => onUpdateParam('cutoff', v)} color={color} />
          <ParamRow label="Resonance" value={params.resonance} onChange={v => onUpdateParam('resonance', v)} color={color} />
          <ParamRow label="Env Mod" value={params.envMod} onChange={v => onUpdateParam('envMod', v)} color={color} />
        </div>
        <div className="p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-3">Amp Envelope</div>
          <ParamRow label="Attack" value={params.attack} onChange={v => onUpdateParam('attack', v)} min={0} max={2} color={color} />
          <ParamRow label="Decay" value={params.decay} onChange={v => onUpdateParam('decay', v)} color={color} />
          <ParamRow label="Sustain" value={params.sustain} onChange={v => onUpdateParam('sustain', v)} color={color} />
          <ParamRow label="Release" value={params.release} onChange={v => onUpdateParam('release', v)} min={0} max={4} color={color} />
        </div>
        <div className="p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-3">Effects</div>
          <ParamRow label="Chorus" value={params.chorus} onChange={v => onUpdateParam('chorus', v)} color={color} />
        </div>
      </div>
    </div>
  );
}
