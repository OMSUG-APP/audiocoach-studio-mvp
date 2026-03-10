import React, { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { Pattern, DrumInstrument, Step, NoteStep, SamplerPad, PadLoadStatus, PolySynthParams, Drum2Track, LeadSynthParams, FMSynthParams, PluckSynthParams, ChordStabParams } from '../types';
import { BASS_PRESETS, SYNTH_PRESETS, LEAD_PRESETS, FM_PRESETS, PLUCK_PRESETS, STAB_PRESETS } from '../constants';
import { PolySynthRow } from './PolySynthRow';
import { Drum2Row } from './Drum2Row';
import { InstrumentPanel } from './InstrumentPanel';
import {
  DrumStyle, Density, MusicalKey, ScaleName,
  MUSICAL_KEYS, SCALE_NAMES, DRUM_STYLES, DRUM_STYLE_LABELS,
  generateDrumPattern, generateBassPattern, generateSynthPattern, generateSamplerSteps, generateDrum2Pattern,
  generateLeadPattern, generateFMPattern, generatePluckPattern, generateStabPattern,
} from '../utils/patternGenerator';

interface PatternEditorProps {
  pattern: Pattern;
  currentStep: number;
  onToggleDrumStep: (inst: DrumInstrument, step: number) => void;
  onToggleBassStep: (step: number, note: string) => void;
  onToggleSynthStep: (step: number, note: string) => void;
  drumKit?: '808' | '909';
  onDrumKitChange?: (kit: '808' | '909') => void;
  drumParams?: Record<string, { tune: number; decay: number; mute?: boolean; solo?: boolean }>;
  onUpdateDrumParam: (inst: string, param: string, value: any) => void;
  bassParams?: { waveform: string; octave?: number; cutoff: number; resonance: number; envMod: number; decay: number };
  bassPreset?: string;
  onUpdateBassParam: (param: string, value: any) => void;
  onApplyBassPreset?: (preset: typeof BASS_PRESETS[string], name: string) => void;
  synthParams?: { octave?: number; attack: number; release: number; cutoff: number; detune: number };
  synthPreset?: string;
  onUpdateSynthParam: (param: string, value: any) => void;
  onApplySynthPreset?: (preset: typeof SYNTH_PRESETS[string], name: string) => void;
  // Sampler rows
  samplerPads?: SamplerPad[];
  padLoadStatus?: PadLoadStatus[];
  samplerSteps?: boolean[][];
  onToggleSamplerStep?: (padId: number, step: number) => void;
  // Pattern set callbacks (used by generator)
  onSetDrumSteps?: (steps: Record<DrumInstrument, Step[]>) => void;
  onSetBassSteps?: (steps: NoteStep[]) => void;
  onSetSynthSteps?: (steps: NoteStep[]) => void;
  onSetSamplerSteps?: (steps: boolean[][]) => void;
  // Power toggles for main instruments
  drumsPoweredOn?: boolean;
  onToggleDrumsPower?: () => void;
  bassPoweredOn?: boolean;
  onToggleBassPower?: () => void;
  synthPoweredOn?: boolean;
  onToggleSynthPower?: () => void;
  // Poly synth
  polySynthParams?: PolySynthParams;
  polySynthPoweredOn?: boolean;
  onTogglePolySynthPower?: () => void;
  onTogglePolySynthStep?: (step: number) => void;
  onSetPolySynthChord?: (step: number, chord: string[]) => void;
  onUpdatePolySynthParam?: (param: string, value: any) => void;
  currentPolySynthStep?: number;
  // Drum2
  drum2PoweredOn?: boolean;
  onToggleDrum2Power?: () => void;
  onToggleDrum2Step?: (trackIndex: number, step: number) => void;
  currentDrum2Step?: number;
  onUpdateDrum2TrackParam?: (trackIndex: number, param: string, value: any) => void;
  onSetDrum2Steps?: (tracks: Drum2Track[]) => void;
  // Sampler
  samplerPoweredOn?: boolean;
  onToggleSamplerPower?: () => void;
  // Lead Synth
  leadParams?: LeadSynthParams;
  leadPreset?: string;
  onUpdateLeadParam?: (param: string, value: any) => void;
  onApplyLeadPreset?: (preset: LeadSynthParams, name: string) => void;
  onToggleLeadStep?: (step: number, note: string) => void;
  onSetLeadSteps?: (steps: NoteStep[]) => void;
  leadPoweredOn?: boolean;
  onToggleLeadPower?: () => void;
  // FM Synth
  fmParams?: FMSynthParams;
  fmPreset?: string;
  onUpdateFMParam?: (param: string, value: any) => void;
  onApplyFMPreset?: (preset: FMSynthParams, name: string) => void;
  onToggleFMStep?: (step: number, note: string) => void;
  onSetFMSteps?: (steps: NoteStep[]) => void;
  fmPoweredOn?: boolean;
  onToggleFMPower?: () => void;
  // Pluck Synth
  pluckParams?: PluckSynthParams;
  pluckPreset?: string;
  onUpdatePluckParam?: (param: string, value: any) => void;
  onApplyPluckPreset?: (preset: PluckSynthParams, name: string) => void;
  onTogglePluckStep?: (step: number, note: string) => void;
  onSetPluckSteps?: (steps: NoteStep[]) => void;
  currentPluckStep?: number;
  pluckPoweredOn?: boolean;
  onTogglePluckPower?: () => void;
  // Chord Stab
  stabParams?: ChordStabParams;
  stabPreset?: string;
  onUpdateStabParam?: (param: string, value: any) => void;
  onApplyStabPreset?: (preset: ChordStabParams, name: string) => void;
  onToggleStabStep?: (step: number, note: string) => void;
  onSetStabSteps?: (steps: NoteStep[]) => void;
  stabPoweredOn?: boolean;
  onToggleStabPower?: () => void;
}

const BASS_NOTES  = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
const SYNTH_NOTES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
const GRID_MIN_W  = 'min-w-[520px]';

// ─── Pill button ──────────────────────────────────────────────────────────────
interface PillProps { key?: React.Key; label: string; active: boolean; color?: string; onClick: () => void }
const Pill = ({ label, active, color = '#FF5F00', onClick }: PillProps) => (
  <button
    onClick={onClick}
    className="px-2 py-0.5 text-[13px] font-bold rounded transition-colors uppercase tracking-widest"
    style={active
      ? { background: color, color: color === '#FF5F00' ? '#000' : '#fff' }
      : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }}
  >
    {label}
  </button>
);

// ─── Generate button ──────────────────────────────────────────────────────────
const GenBtn = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-2 py-1 text-[13px] font-bold rounded border border-[#242428] hover:border-[#FF5F00] hover:text-[#FF5F00] text-[#555] transition-colors uppercase tracking-widest flex-shrink-0"
  >
    <Shuffle size={9} />
    Generate
  </button>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function PatternEditor({
  pattern, currentStep, onToggleDrumStep, onToggleBassStep, onToggleSynthStep,
  drumKit, onDrumKitChange, drumParams = {}, onUpdateDrumParam,
  bassParams, bassPreset, onUpdateBassParam, onApplyBassPreset,
  synthParams, synthPreset, onUpdateSynthParam, onApplySynthPreset,
  samplerPads = [], padLoadStatus = [], samplerSteps = [], onToggleSamplerStep,
  onSetDrumSteps, onSetBassSteps, onSetSynthSteps, onSetSamplerSteps,
  drumsPoweredOn = true, onToggleDrumsPower,
  bassPoweredOn = true, onToggleBassPower,
  synthPoweredOn = true, onToggleSynthPower,
  polySynthParams, polySynthPoweredOn = true, onTogglePolySynthPower, onTogglePolySynthStep, onSetPolySynthChord, onUpdatePolySynthParam, currentPolySynthStep = 0,
  drum2PoweredOn = true, onToggleDrum2Power, onToggleDrum2Step, currentDrum2Step = 0,
  onUpdateDrum2TrackParam, onSetDrum2Steps,
  samplerPoweredOn = true, onToggleSamplerPower,
  leadParams, leadPreset, onUpdateLeadParam, onApplyLeadPreset, onToggleLeadStep, onSetLeadSteps, leadPoweredOn = true, onToggleLeadPower,
  fmParams, fmPreset, onUpdateFMParam, onApplyFMPreset, onToggleFMStep, onSetFMSteps, fmPoweredOn = true, onToggleFMPower,
  pluckParams, pluckPreset, onUpdatePluckParam, onApplyPluckPreset, onTogglePluckStep, onSetPluckSteps, currentPluckStep = 0, pluckPoweredOn = true, onTogglePluckPower,
  stabParams, stabPreset, onUpdateStabParam, onApplyStabPreset, onToggleStabStep, onSetStabSteps, stabPoweredOn = true, onToggleStabPower,
}: PatternEditorProps) {

  const bp = bassParams  || { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 };
  const sp = synthParams || { attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 };
  const lp = leadParams  || { waveform: 'sawtooth' as const, octave: 4, cutoff: 0.8, resonance: 0.3, attack: 0.01, decay: 0.3, portamento: 0.0 };
  const fp = fmParams    || { ratio: 0.5, modIndex: 0.7, attack: 0.01, decay: 0.8, octave: 5, feedback: 0.0 };
  const pp = pluckParams || { damping: 0.7, brightness: 0.8, body: 0.5, octave: 3 };
  const sbp = stabParams || { waveform: 'sawtooth' as const, octave: 4, cutoff: 0.7, attack: 0.01, decay: 0.15, spread: 0.3 };

  // ── Generator settings (local state — no need to persist) ─────────────────
  const [genKey,     setGenKey]     = useState<MusicalKey>('A');
  const [genScale,   setGenScale]   = useState<ScaleName>('Minor');
  const [genStyle,   setGenStyle]   = useState<DrumStyle>('house');
  const [genDensity, setGenDensity] = useState<Density>('mid');

  // ── Generator handlers ────────────────────────────────────────────────────
  const handleGenerateDrums = () => {
    onSetDrumSteps?.(generateDrumPattern(genStyle, genDensity));
  };

  const handleGenerateBass = () => {
    onSetBassSteps?.(generateBassPattern(genKey, genScale, genStyle, genDensity, bp.octave ?? 2));
  };

  const handleGenerateSynth = () => {
    onSetSynthSteps?.(generateSynthPattern(genKey, genScale, genStyle, genDensity, sp.octave ?? 4));
  };

  const handleGenerateDrum2 = () => {
    onSetDrum2Steps?.(generateDrum2Pattern(genStyle, genDensity));
  };

  const handleGenerateSampler = () => {
    const loadedIds = samplerPads
      .filter(p => padLoadStatus[p.id] === 'loaded')
      .map(p => p.id);
    onSetSamplerSteps?.(generateSamplerSteps(loadedIds, genStyle, genDensity));
  };

  const handleGenerateLead = () => {
    onSetLeadSteps?.(generateLeadPattern(genKey, genScale, genStyle, genDensity, lp.octave ?? 4));
  };

  const handleGenerateFM = () => {
    onSetFMSteps?.(generateFMPattern(genKey, genScale, genStyle, genDensity, fp.octave ?? 5));
  };

  const handleGeneratePluck = () => {
    onSetPluckSteps?.(generatePluckPattern(genKey, genScale, genStyle, genDensity, pp.octave ?? 3));
  };

  const handleGenerateStab = () => {
    onSetStabSteps?.(generateStabPattern(genKey, genScale, genStyle, genDensity, sbp.octave ?? 4));
  };

  // ── Select style ──────────────────────────────────────────────────────────
  const selectCls = 'bg-[#1a1a1e] border border-[#242428] text-[#F0F0F2] text-[13px] rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:border-[#FF5F00]';

  return (
    <div className="flex flex-col">

      {/* ── GENERATOR BAR ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 bg-[#0A0A0B] border-b border-[#FF5F00] border-opacity-20 mb-1">
        <span className="text-[13px] font-bold text-[#FF5F00] uppercase tracking-widest flex items-center gap-1 flex-shrink-0">
          <Shuffle size={10} />
          Generator
        </span>

        {/* Key */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest">Key</span>
          <select value={genKey} onChange={e => setGenKey(e.target.value as MusicalKey)} className={selectCls}>
            {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Scale */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest">Scale</span>
          <select value={genScale} onChange={e => setGenScale(e.target.value as ScaleName)} className={selectCls}>
            {SCALE_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Style */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest mr-1">Style</span>
          {DRUM_STYLES.map(s => (
            <Pill key={s} label={DRUM_STYLE_LABELS[s]} active={genStyle === s} onClick={() => setGenStyle(s)} />
          ))}
        </div>

        {/* Density */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest mr-1">Density</span>
          {(['low', 'mid', 'high'] as Density[]).map(d => (
            <Pill key={d} label={d} active={genDensity === d} onClick={() => setGenDensity(d)} />
          ))}
        </div>
      </div>

      {/* ── DRUM MACHINE ───────────────────────────────────────────────────── */}
      <InstrumentPanel
        id="drums"
        title="Drum Machine"
        poweredOn={drumsPoweredOn}
        onTogglePower={() => onToggleDrumsPower?.()}
        defaultExpanded={true}
        color="#FF5F00"
      >
        <div className="px-3 pb-3">
          {/* Kit selector */}
          <div className="flex items-center gap-3 py-2 border-b border-[#242428] mb-3">
            <span className="text-[13px] font-bold text-[#8A8A94] uppercase tracking-widest">Kit</span>
            {(['808', '909'] as const).map(kit => (
              <button
                key={kit}
                onClick={() => onDrumKitChange?.(kit)}
                className="px-3 py-1 text-[13px] font-bold rounded transition-colors uppercase tracking-widest"
                style={
                  drumKit === kit
                    ? { background: '#FF5F00', color: '#000', boxShadow: '0 0 8px rgba(255,95,0,0.4)' }
                    : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }
                }
              >
                {kit}
              </button>
            ))}
            <div className="ml-auto">
              <GenBtn onClick={handleGenerateDrums} />
            </div>
          </div>

          {/* Drums grid */}
          <div className="overflow-x-auto">
            <div className={`flex flex-col gap-2 ${GRID_MIN_W}`}>
              {Object.entries(pattern.drums).map(([inst, steps]) => {
                const p        = drumParams[inst] || { tune: 0.5, decay: 0.5, mute: false, solo: false };
                const isMuted  = p.mute  ?? false;
                const isSoloed = p.solo  ?? false;
                return (
                  <div key={inst} className="flex items-center gap-2">
                    <div className="w-7 flex-shrink-0 text-[15px] font-bold text-[#8A8A94] tracking-wider">{inst}</div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onUpdateDrumParam(inst, 'mute', !isMuted)}
                        className="text-[13px] font-bold px-1.5 py-0.5 rounded border transition-colors"
                        style={isMuted
                          ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' }
                          : { background: 'transparent', borderColor: '#333338', color: '#666' }}
                      >M</button>
                      <button
                        onClick={() => onUpdateDrumParam(inst, 'solo', !isSoloed)}
                        className="text-[13px] font-bold px-1.5 py-0.5 rounded border transition-colors"
                        style={isSoloed
                          ? { background: '#FF5F00', borderColor: '#FF5F00', color: '#000' }
                          : { background: 'transparent', borderColor: '#333338', color: '#666' }}
                      >S</button>
                    </div>
                    <div className="flex-1 grid grid-cols-16 gap-1">
                      {steps.map((step: any, i: number) => {
                        const isActive    = step.active;
                        const isCurrent   = currentStep === i;
                        const isLightBeat = Math.floor(i / 4) % 2 === 0;
                        return (
                          <button
                            key={i}
                            onClick={() => onToggleDrumStep(inst as DrumInstrument, i)}
                            className="h-9 rounded-sm border transition-all duration-75"
                            style={
                              isActive
                                ? { background: '#FF5F00', borderColor: '#E05500', boxShadow: isCurrent ? '0 0 10px rgba(255,95,0,0.7)' : '0 0 6px rgba(255,95,0,0.3)' }
                                : isCurrent
                                ? { background: '#1e1e22', borderColor: '#FF5F00', outline: '1px solid #FF5F00' }
                                : isLightBeat
                                ? { background: '#222228', borderColor: '#2e2e36' }
                                : { background: '#151518', borderColor: '#1e1e22' }
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drum params */}
          <div className="mt-4 flex gap-3 overflow-x-auto items-center pb-1">
            {(['BD', 'SD', 'HC', 'OH', 'LT', 'HT'] as const).map(inst => {
              const p = drumParams[inst] || { tune: 0.5, decay: 0.5 };
              return (
                <div key={inst} className="flex flex-col bg-[#0A0A0B] p-3 rounded border border-[#242428] min-w-[110px] flex-shrink-0">
                  <div className="text-[13px] font-bold text-[#FF5F00] mb-3 text-center tracking-widest">{inst}</div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#8A8A94] uppercase w-8 tracking-widest">Tune</span>
                      <input type="range" min="0" max="1" step="0.01" value={p.tune} onChange={e => onUpdateDrumParam(inst, 'tune', parseFloat(e.target.value))} className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#8A8A94] uppercase w-8 tracking-widest">Dcy</span>
                      <input type="range" min="0" max="1" step="0.01" value={p.decay} onChange={e => onUpdateDrumParam(inst, 'decay', parseFloat(e.target.value))} className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </InstrumentPanel>

      {/* ── ELEKTRON DRUM 2 ────────────────────────────────────────────────── */}
      {onToggleDrum2Step && (
        <div className="mt-3">
          <Drum2Row
            tracks={pattern.drum2 || []}
            currentStep={currentStep}
            currentDrum2Step={currentDrum2Step}
            poweredOn={drum2PoweredOn}
            onTogglePower={() => onToggleDrum2Power?.()}
            onToggleStep={onToggleDrum2Step}
            onUpdateTrackParam={(idx, param, val) => onUpdateDrum2TrackParam?.(idx, param, val)}
            onGenerate={handleGenerateDrum2}
          />
        </div>
      )}

      {/* ── SAMPLER SECTION ────────────────────────────────────────────────── */}
      <div className="mt-4">
        <InstrumentPanel
          id="sampler"
          title="Sample Pads"
          poweredOn={samplerPoweredOn}
          onTogglePower={() => onToggleSamplerPower?.()}
          defaultExpanded={false}
          color="#FF5F00"
        >
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 py-2 border-b border-[#242428] mb-3">
              <GenBtn onClick={handleGenerateSampler} />
            </div>

            {samplerPads.filter(p => padLoadStatus[p.id] === 'loaded').length === 0 ? (
              <p className="text-[13px] text-[#444] tracking-widest py-2">
                No samples loaded — add samples in the Sampler tab
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className={`flex flex-col gap-2 ${GRID_MIN_W}`}>
                  {samplerPads
                    .filter(p => padLoadStatus[p.id] === 'loaded')
                    .map(pad => {
                      const padSteps = samplerSteps[pad.id] || Array(16).fill(false);
                      return (
                        <div key={pad.id} className="flex items-center gap-2">
                          <div className="w-7 flex-shrink-0 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pad.color }} />
                            <span
                              className="text-[13px] font-bold truncate"
                              style={{ color: pad.color }}
                              title={pad.label}
                            >
                              {pad.label.slice(0, 4)}
                            </span>
                          </div>
                          <div className="flex-1 grid grid-cols-16 gap-1">
                            {padSteps.map((active: boolean, i: number) => {
                              const isCurrent   = currentStep === i;
                              const isLightBeat = Math.floor(i / 4) % 2 === 0;
                              return (
                                <button
                                  key={i}
                                  onClick={() => onToggleSamplerStep?.(pad.id, i)}
                                  className="h-9 rounded-sm border transition-all duration-75"
                                  style={
                                    active
                                      ? { background: pad.color, borderColor: pad.color, boxShadow: isCurrent ? `0 0 10px ${pad.color}AA` : `0 0 5px ${pad.color}55` }
                                      : isCurrent
                                      ? { background: '#1e1e22', borderColor: pad.color, outline: `1px solid ${pad.color}` }
                                      : isLightBeat
                                      ? { background: '#222228', borderColor: '#2e2e36' }
                                      : { background: '#151518', borderColor: '#1e1e22' }
                                  }
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </InstrumentPanel>
      </div>

      {/* ── BASS SECTION ───────────────────────────────────────────────────── */}
      <InstrumentPanel
        id="bass"
        title="Bass Synthesizer"
        poweredOn={bassPoweredOn}
        onTogglePower={() => onToggleBassPower?.()}
        defaultExpanded={false}
        color="#F59E0B"
      >
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2 pt-2">
            <GenBtn onClick={handleGenerateBass} />
            <div className="flex items-center gap-3 bg-[#0A0A0B] p-2 rounded border border-[#242428] flex-wrap">
              <div className="flex items-center gap-1 border-r border-[#242428] pr-3">
                {Object.keys(BASS_PRESETS).map(name => (
                  <button key={name} onClick={() => onApplyBassPreset?.(BASS_PRESETS[name], name)}
                    className="px-2 py-1 text-[13px] font-bold rounded transition-colors uppercase tracking-widest"
                    style={bassPreset === name
                      ? { background: '#F59E0B', color: '#000' }
                      : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }}>
                    {name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onUpdateBassParam('waveform', bp.waveform === 'sawtooth' ? 'square' : 'sawtooth')}
                className="px-3 py-1 bg-[#1a1a1e] border border-[#242428] hover:border-[#F59E0B] rounded text-[15px] font-bold transition-colors tracking-widest"
                style={{ color: '#F59E0B' }}>
                {bp.waveform === 'sawtooth' ? 'SAW' : 'SQR'}
              </button>
              <div className="flex gap-3">
                {[{ label: 'Cutoff', key: 'cutoff' }, { label: 'Res', key: 'resonance' }, { label: 'Env', key: 'envMod' }, { label: 'Dcy', key: 'decay' }].map(({ label, key }) => (
                  <div key={key} className="flex flex-col items-center gap-1 w-10">
                    <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest">{label}</span>
                    <input type="range" min="0" max="1" step="0.01" value={(bp as any)[key]} onChange={e => onUpdateBassParam(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#F59E0B' }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-2 pl-3 border-l border-[#242428]">
                <button onClick={() => onUpdateBassParam('octave', Math.max(0, (bp.octave ?? 2) - 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#F59E0B] rounded text-xs font-bold text-[#8A8A94] transition-colors">−</button>
                <span className="text-[13px] font-bold min-w-4 text-center" style={{ color: '#F59E0B' }}>{bp.octave ?? 2}</span>
                <button onClick={() => onUpdateBassParam('octave', Math.min(8, (bp.octave ?? 2) + 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#F59E0B] rounded text-xs font-bold text-[#8A8A94] transition-colors">+</button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className={`flex flex-col gap-0.5 ${GRID_MIN_W}`}>
              {BASS_NOTES.map((note) => (
                <div key={note} className="flex items-center gap-2">
                  <div className="w-7 flex-shrink-0 text-[13px] font-bold text-[#8A8A94] text-right pr-1">{note}</div>
                  <div className="flex-1 grid grid-cols-16 gap-1">
                    {pattern.bass.map((step: any, i: number) => {
                      const fullNote    = `${note}${bp.octave ?? 2}`;
                      const isActive    = step.active && step.note === fullNote;
                      const isCurrent   = currentStep === i;
                      const isLightBeat = Math.floor(i / 4) % 2 === 0;
                      return (
                        <button key={i} onClick={() => onToggleBassStep(i, fullNote)}
                          className="h-5 rounded-sm border transition-all duration-75"
                          style={
                            isActive
                              ? { background: '#F59E0B', borderColor: '#D97706', boxShadow: '0 0 6px rgba(245,158,11,0.35)' }
                              : isCurrent
                              ? { background: '#1e1e22', borderColor: '#F59E0B' }
                              : isLightBeat
                              ? { background: '#222228', borderColor: '#2e2e36' }
                              : { background: '#151518', borderColor: '#1e1e22' }
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </InstrumentPanel>

      {/* ── ATMOSPHERIC PAD ────────────────────────────────────────────────── */}
      <InstrumentPanel
        id="pad"
        title="Atmospheric Pad"
        poweredOn={synthPoweredOn}
        onTogglePower={() => onToggleSynthPower?.()}
        defaultExpanded={false}
        color="#8B5CF6"
      >
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2 pt-2">
            <GenBtn onClick={handleGenerateSynth} />
            <div className="flex items-center gap-3 bg-[#0A0A0B] p-2 rounded border border-[#242428] flex-wrap">
              <div className="flex items-center gap-1 border-r border-[#242428] pr-3">
                {Object.keys(SYNTH_PRESETS).map(name => (
                  <button key={name} onClick={() => onApplySynthPreset?.(SYNTH_PRESETS[name], name)}
                    className="px-2 py-1 text-[13px] font-bold rounded transition-colors uppercase tracking-widest"
                    style={synthPreset === name
                      ? { background: '#8b5cf6', color: '#fff' }
                      : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }}>
                    {name}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                {[{ label: 'Atk', key: 'attack' }, { label: 'Rel', key: 'release' }, { label: 'Cutoff', key: 'cutoff' }, { label: 'Detune', key: 'detune' }].map(({ label, key }) => (
                  <div key={key} className="flex flex-col items-center gap-1 w-10">
                    <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest">{label}</span>
                    <input type="range" min="0" max="1" step="0.01" value={(sp as any)[key]} onChange={e => onUpdateSynthParam(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#8b5cf6' }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-2 pl-3 border-l border-[#242428]">
                <button onClick={() => onUpdateSynthParam('octave', Math.max(0, (sp.octave ?? 4) - 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#8b5cf6] rounded text-xs font-bold text-[#8A8A94] transition-colors">−</button>
                <span className="text-[13px] font-bold text-[#8b5cf6] min-w-4 text-center">{sp.octave ?? 4}</span>
                <button onClick={() => onUpdateSynthParam('octave', Math.min(8, (sp.octave ?? 4) + 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#8b5cf6] rounded text-xs font-bold text-[#8A8A94] transition-colors">+</button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className={`flex flex-col gap-0.5 ${GRID_MIN_W}`}>
              {SYNTH_NOTES.map((note) => (
                <div key={note} className="flex items-center gap-2">
                  <div className="w-7 flex-shrink-0 text-[13px] font-bold text-[#8A8A94] text-right pr-1">{note}</div>
                  <div className="flex-1 grid grid-cols-16 gap-1">
                    {(pattern.synth || Array(16).fill({ active: false, note: '' })).map((step: any, i: number) => {
                      const fullNote    = `${note}${sp.octave ?? 4}`;
                      const isActive    = step.active && step.note === fullNote;
                      const isCurrent   = currentStep === i;
                      const isLightBeat = Math.floor(i / 4) % 2 === 0;
                      return (
                        <button key={i} onClick={() => onToggleSynthStep(i, fullNote)}
                          className="h-5 rounded-sm border transition-all duration-75"
                          style={
                            isActive
                              ? { background: '#8b5cf6', borderColor: '#7c3aed', boxShadow: '0 0 6px rgba(139,92,246,0.4)' }
                              : isCurrent
                              ? { background: '#1e1e22', borderColor: '#8b5cf6' }
                              : isLightBeat
                              ? { background: '#222228', borderColor: '#2e2e36' }
                              : { background: '#151518', borderColor: '#1e1e22' }
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </InstrumentPanel>

      {/* ── POLY SYNTH SECTION ─────────────────────────────────────────────── */}
      {polySynthParams && onTogglePolySynthStep && onSetPolySynthChord && onUpdatePolySynthParam && (
        <div className="mt-3">
          <PolySynthRow
            steps={(() => { const s = pattern.polySynth || []; const pad = Array.from({ length: Math.max(0, 32 - s.length) }, () => ({ active: false, chord: [], velocity: 0.7, length: 4 })); return [...s, ...pad]; })()}
            currentStep={currentPolySynthStep}
            params={polySynthParams}
            poweredOn={polySynthPoweredOn}
            onTogglePower={() => onTogglePolySynthPower?.()}
            onToggleStep={onTogglePolySynthStep}
            onSetChord={onSetPolySynthChord}
            onUpdateParam={onUpdatePolySynthParam}
          />
        </div>
      )}

      {/* ── LEAD SYNTH SECTION ─────────────────────────────────────────────── */}
      <InstrumentPanel
        id="lead"
        title="Lead Synthesizer"
        poweredOn={leadPoweredOn}
        onTogglePower={() => onToggleLeadPower?.()}
        defaultExpanded={false}
        color="#EF4444"
      >
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2 pt-2">
            <GenBtn onClick={handleGenerateLead} />
            <div className="flex items-center gap-3 bg-[#0A0A0B] p-2 rounded border border-[#242428] flex-wrap">
              <div className="flex items-center gap-1 border-r border-[#242428] pr-3">
                {Object.keys(LEAD_PRESETS).map(name => (
                  <button key={name} onClick={() => onApplyLeadPreset?.(LEAD_PRESETS[name], name)}
                    className="px-2 py-1 text-[13px] font-bold rounded transition-colors uppercase tracking-widest"
                    style={leadPreset === name
                      ? { background: '#EF4444', color: '#fff' }
                      : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }}>
                    {name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onUpdateLeadParam?.('waveform', lp.waveform === 'sawtooth' ? 'square' : 'sawtooth')}
                className="px-3 py-1 bg-[#1a1a1e] border border-[#242428] hover:border-[#EF4444] rounded text-[15px] font-bold transition-colors tracking-widest"
                style={{ color: '#EF4444' }}>
                {lp.waveform === 'sawtooth' ? 'SAW' : 'SQR'}
              </button>
              <div className="flex gap-3">
                {[{ label: 'Cutoff', key: 'cutoff' }, { label: 'Res', key: 'resonance' }, { label: 'Atk', key: 'attack' }, { label: 'Dcy', key: 'decay' }, { label: 'Port', key: 'portamento' }].map(({ label, key }) => (
                  <div key={key} className="flex flex-col items-center gap-1 w-10">
                    <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest">{label}</span>
                    <input type="range" min="0" max="1" step="0.01" value={(lp as any)[key]} onChange={e => onUpdateLeadParam?.(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#EF4444' }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-2 pl-3 border-l border-[#242428]">
                <button onClick={() => onUpdateLeadParam?.('octave', Math.max(0, (lp.octave ?? 4) - 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#EF4444] rounded text-xs font-bold text-[#8A8A94] transition-colors">−</button>
                <span className="text-[13px] font-bold min-w-4 text-center" style={{ color: '#EF4444' }}>{lp.octave ?? 4}</span>
                <button onClick={() => onUpdateLeadParam?.('octave', Math.min(8, (lp.octave ?? 4) + 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#EF4444] rounded text-xs font-bold text-[#8A8A94] transition-colors">+</button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className={`flex flex-col gap-0.5 ${GRID_MIN_W}`}>
              {SYNTH_NOTES.map((note) => (
                <div key={note} className="flex items-center gap-2">
                  <div className="w-7 flex-shrink-0 text-[13px] font-bold text-[#8A8A94] text-right pr-1">{note}</div>
                  <div className="flex-1 grid grid-cols-16 gap-1">
                    {(pattern.lead || Array(16).fill({ active: false, note: '' })).map((step: any, i: number) => {
                      const fullNote    = `${note}${lp.octave ?? 4}`;
                      const isActive    = step.active && step.note === fullNote;
                      const isCurrent   = currentStep === i;
                      const isLightBeat = Math.floor(i / 4) % 2 === 0;
                      return (
                        <button key={i} onClick={() => onToggleLeadStep?.(i, fullNote)}
                          className="h-5 rounded-sm border transition-all duration-75"
                          style={
                            isActive
                              ? { background: '#EF4444', borderColor: '#DC2626', boxShadow: '0 0 6px rgba(239,68,68,0.4)' }
                              : isCurrent
                              ? { background: '#1e1e22', borderColor: '#EF4444' }
                              : isLightBeat
                              ? { background: '#222228', borderColor: '#2e2e36' }
                              : { background: '#151518', borderColor: '#1e1e22' }
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </InstrumentPanel>

      {/* ── FM SYNTH SECTION ───────────────────────────────────────────────── */}
      <InstrumentPanel
        id="fm"
        title="FM Synthesizer"
        poweredOn={fmPoweredOn}
        onTogglePower={() => onToggleFMPower?.()}
        defaultExpanded={false}
        color="#10B981"
      >
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2 pt-2">
            <GenBtn onClick={handleGenerateFM} />
            <div className="flex items-center gap-3 bg-[#0A0A0B] p-2 rounded border border-[#242428] flex-wrap">
              <div className="flex items-center gap-1 border-r border-[#242428] pr-3">
                {Object.keys(FM_PRESETS).map(name => (
                  <button key={name} onClick={() => onApplyFMPreset?.(FM_PRESETS[name], name)}
                    className="px-2 py-1 text-[13px] font-bold rounded transition-colors uppercase tracking-widest"
                    style={fmPreset === name
                      ? { background: '#10B981', color: '#fff' }
                      : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }}>
                    {name}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                {[{ label: 'Ratio', key: 'ratio' }, { label: 'Mod', key: 'modIndex' }, { label: 'Atk', key: 'attack' }, { label: 'Dcy', key: 'decay' }, { label: 'FB', key: 'feedback' }].map(({ label, key }) => (
                  <div key={key} className="flex flex-col items-center gap-1 w-10">
                    <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest">{label}</span>
                    <input type="range" min="0" max="1" step="0.01" value={(fp as any)[key]} onChange={e => onUpdateFMParam?.(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#10B981' }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-2 pl-3 border-l border-[#242428]">
                <button onClick={() => onUpdateFMParam?.('octave', Math.max(0, (fp.octave ?? 5) - 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#10B981] rounded text-xs font-bold text-[#8A8A94] transition-colors">−</button>
                <span className="text-[13px] font-bold min-w-4 text-center" style={{ color: '#10B981' }}>{fp.octave ?? 5}</span>
                <button onClick={() => onUpdateFMParam?.('octave', Math.min(8, (fp.octave ?? 5) + 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#10B981] rounded text-xs font-bold text-[#8A8A94] transition-colors">+</button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className={`flex flex-col gap-0.5 ${GRID_MIN_W}`}>
              {SYNTH_NOTES.map((note) => (
                <div key={note} className="flex items-center gap-2">
                  <div className="w-7 flex-shrink-0 text-[13px] font-bold text-[#8A8A94] text-right pr-1">{note}</div>
                  <div className="flex-1 grid grid-cols-16 gap-1">
                    {(pattern.fm || Array(16).fill({ active: false, note: '' })).map((step: any, i: number) => {
                      const fullNote    = `${note}${fp.octave ?? 5}`;
                      const isActive    = step.active && step.note === fullNote;
                      const isCurrent   = currentStep === i;
                      const isLightBeat = Math.floor(i / 4) % 2 === 0;
                      return (
                        <button key={i} onClick={() => onToggleFMStep?.(i, fullNote)}
                          className="h-5 rounded-sm border transition-all duration-75"
                          style={
                            isActive
                              ? { background: '#10B981', borderColor: '#059669', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }
                              : isCurrent
                              ? { background: '#1e1e22', borderColor: '#10B981' }
                              : isLightBeat
                              ? { background: '#222228', borderColor: '#2e2e36' }
                              : { background: '#151518', borderColor: '#1e1e22' }
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </InstrumentPanel>

      {/* ── PLUCK SYNTH SECTION ────────────────────────────────────────────── */}
      <InstrumentPanel
        id="pluck"
        title="Pluck Synthesizer"
        poweredOn={pluckPoweredOn}
        onTogglePower={() => onTogglePluckPower?.()}
        defaultExpanded={false}
        color="#EC4899"
      >
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2 pt-2">
            <GenBtn onClick={handleGeneratePluck} />
            <div className="flex items-center gap-3 bg-[#0A0A0B] p-2 rounded border border-[#242428] flex-wrap">
              <div className="flex items-center gap-1 border-r border-[#242428] pr-3">
                {Object.keys(PLUCK_PRESETS).map(name => (
                  <button key={name} onClick={() => onApplyPluckPreset?.(PLUCK_PRESETS[name], name)}
                    className="px-2 py-1 text-[13px] font-bold rounded transition-colors uppercase tracking-widest"
                    style={pluckPreset === name
                      ? { background: '#EC4899', color: '#fff' }
                      : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }}>
                    {name}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                {[{ label: 'Damp', key: 'damping' }, { label: 'Brit', key: 'brightness' }, { label: 'Body', key: 'body' }].map(({ label, key }) => (
                  <div key={key} className="flex flex-col items-center gap-1 w-10">
                    <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest">{label}</span>
                    <input type="range" min="0" max="1" step="0.01" value={(pp as any)[key]} onChange={e => onUpdatePluckParam?.(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#EC4899' }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-2 pl-3 border-l border-[#242428]">
                <button onClick={() => onUpdatePluckParam?.('octave', Math.max(0, (pp.octave ?? 3) - 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#EC4899] rounded text-xs font-bold text-[#8A8A94] transition-colors">−</button>
                <span className="text-[13px] font-bold min-w-4 text-center" style={{ color: '#EC4899' }}>{pp.octave ?? 3}</span>
                <button onClick={() => onUpdatePluckParam?.('octave', Math.min(8, (pp.octave ?? 3) + 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#EC4899] rounded text-xs font-bold text-[#8A8A94] transition-colors">+</button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {/* Bar labels */}
            <div className="flex gap-2 mb-1 ml-9">
              <div className="flex-1"><span className="text-[8px] text-[#333] tracking-widest">Bar 1</span></div>
              <div className="flex-1"><span className="text-[8px] text-[#333] tracking-widest">Bar 2</span></div>
            </div>
            <div className="flex flex-col gap-0.5">
              {SYNTH_NOTES.map(note => {
                const fullNote = `${note}${pp.octave ?? 3}`;
                const pluckSteps = pattern.pluck || Array(32).fill({ active: false, note: '' });
                return (
                  <div key={note} className="flex items-center gap-2">
                    <div className="w-7 flex-shrink-0 text-[13px] font-bold text-right pr-1" style={{ color: '#EC4899' }}>{note}</div>
                    <div className="flex flex-1 gap-2">
                      {[0, 1].map(bar => (
                        <div key={bar} className="flex-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '2px' }}>
                          {pluckSteps.slice(bar * 16, (bar + 1) * 16).map((step: any, i: number) => {
                            const stepIndex  = bar * 16 + i;
                            const isActive   = step.active && step.note === fullNote;
                            const isCurrent  = stepIndex === currentPluckStep;
                            const groupBorder = i > 0 && i % 4 === 0;
                            return (
                              <button key={stepIndex} onClick={() => onTogglePluckStep?.(stepIndex, fullNote)}
                                className="h-5 rounded-sm transition-all duration-75"
                                style={{
                                  background:  isCurrent ? '#EC4899' : isActive ? '#9D174D' : '#1a1a1e',
                                  border:      isCurrent ? '1px solid #EC4899' : isActive ? '1px solid #BE185D' : '1px solid #242428',
                                  marginLeft:  groupBorder ? '3px' : undefined,
                                  boxShadow:   isCurrent ? '0 0 6px rgba(236,72,153,0.5)' : 'none',
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
          </div>
        </div>
      </InstrumentPanel>

      {/* ── CHORD STAB SECTION ─────────────────────────────────────────────── */}
      <InstrumentPanel
        id="stab"
        title="Chord Stab"
        poweredOn={stabPoweredOn}
        onTogglePower={() => onToggleStabPower?.()}
        defaultExpanded={false}
        color="#6366F1"
      >
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2 pt-2">
            <GenBtn onClick={handleGenerateStab} />
            <div className="flex items-center gap-3 bg-[#0A0A0B] p-2 rounded border border-[#242428] flex-wrap">
              <div className="flex items-center gap-1 border-r border-[#242428] pr-3">
                {Object.keys(STAB_PRESETS).map(name => (
                  <button key={name} onClick={() => onApplyStabPreset?.(STAB_PRESETS[name], name)}
                    className="px-2 py-1 text-[13px] font-bold rounded transition-colors uppercase tracking-widest"
                    style={stabPreset === name
                      ? { background: '#6366F1', color: '#fff' }
                      : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }}>
                    {name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onUpdateStabParam?.('waveform', sbp.waveform === 'sawtooth' ? 'square' : 'sawtooth')}
                className="px-3 py-1 bg-[#1a1a1e] border border-[#242428] hover:border-[#6366F1] rounded text-[15px] font-bold transition-colors tracking-widest"
                style={{ color: '#6366F1' }}>
                {sbp.waveform === 'sawtooth' ? 'SAW' : 'SQR'}
              </button>
              <div className="flex gap-3">
                {[{ label: 'Cutoff', key: 'cutoff' }, { label: 'Atk', key: 'attack' }, { label: 'Dcy', key: 'decay' }, { label: 'Sprd', key: 'spread' }].map(({ label, key }) => (
                  <div key={key} className="flex flex-col items-center gap-1 w-10">
                    <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest">{label}</span>
                    <input type="range" min="0" max="1" step="0.01" value={(sbp as any)[key]} onChange={e => onUpdateStabParam?.(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#6366F1' }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-2 pl-3 border-l border-[#242428]">
                <button onClick={() => onUpdateStabParam?.('octave', Math.max(0, (sbp.octave ?? 4) - 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#6366F1] rounded text-xs font-bold text-[#8A8A94] transition-colors">−</button>
                <span className="text-[13px] font-bold min-w-4 text-center" style={{ color: '#6366F1' }}>{sbp.octave ?? 4}</span>
                <button onClick={() => onUpdateStabParam?.('octave', Math.min(8, (sbp.octave ?? 4) + 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#6366F1] rounded text-xs font-bold text-[#8A8A94] transition-colors">+</button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className={`flex flex-col gap-0.5 ${GRID_MIN_W}`}>
              {SYNTH_NOTES.map((note) => (
                <div key={note} className="flex items-center gap-2">
                  <div className="w-7 flex-shrink-0 text-[13px] font-bold text-[#8A8A94] text-right pr-1">{note}</div>
                  <div className="flex-1 grid grid-cols-16 gap-1">
                    {(pattern.stab || Array(16).fill({ active: false, note: '' })).map((step: any, i: number) => {
                      const fullNote    = `${note}${sbp.octave ?? 4}`;
                      const isActive    = step.active && step.note === fullNote;
                      const isCurrent   = currentStep === i;
                      const isLightBeat = Math.floor(i / 4) % 2 === 0;
                      return (
                        <button key={i} onClick={() => onToggleStabStep?.(i, fullNote)}
                          className="h-5 rounded-sm border transition-all duration-75"
                          style={
                            isActive
                              ? { background: '#6366F1', borderColor: '#4F46E5', boxShadow: '0 0 6px rgba(99,102,241,0.4)' }
                              : isCurrent
                              ? { background: '#1e1e22', borderColor: '#6366F1' }
                              : isLightBeat
                              ? { background: '#222228', borderColor: '#2e2e36' }
                              : { background: '#151518', borderColor: '#1e1e22' }
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </InstrumentPanel>


    </div>
  );
}
