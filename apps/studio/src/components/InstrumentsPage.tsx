import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore, useActivePattern } from '../store/useProjectStore';
import { RotaryKnob } from './RotaryKnob';

type InstrumentTab = 'drum1' | 'drum2' | 'bass' | 'pad' | 'polysynth' | 'lead' | 'fm' | 'pluck' | 'stab';

const TAB_LABELS: Record<InstrumentTab, string> = {
  drum1: 'Drum 1', drum2: 'Drum 2', bass: 'Bass', pad: 'Pad',
  polysynth: 'Juno', lead: 'Lead', fm: 'FM', pluck: 'Pluck', stab: 'Stab',
};

const TAB_COLORS: Record<InstrumentTab, string> = {
  drum1: '#FF5F00', drum2: '#22D3EE', bass: '#F59E0B', pad: '#8B5CF6',
  polysynth: '#A855F7', lead: '#EF4444', fm: '#10B981', pluck: '#EC4899', stab: '#6366F1',
};

// Map instrument tab to mixer channel key
const MIXER_KEY: Record<InstrumentTab, string> = {
  drum1: 'drums', drum2: 'drum2', bass: 'bass', pad: 'synth',
  polysynth: 'polySynth', lead: 'lead', fm: 'fm', pluck: 'pluck', stab: 'stab',
};

/* ─── Stereo Imager (Goniometer / Lissajous) ─────────────────────────────── */
function StereoImager({ getStereoL, getStereoR, color, size = 72 }: {
  getStereoL: () => AnalyserNode | null | undefined;
  getStereoR: () => AnalyserNode | null | undefined;
  color: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const dataLRef  = useRef<Uint8Array>(new Uint8Array(0));
  const dataRRef  = useRef<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const S = canvas.width; // square
    const cx = S / 2; const cy = S / 2;
    const scale = (S / 2) * 0.88;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      // Persistence fade
      ctx.fillStyle = 'rgba(10,10,11,0.35)';
      ctx.fillRect(0, 0, S, S);

      // Grid: crosshairs + diagonal guides
      ctx.strokeStyle = '#1e1e24';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, S);   // vertical (M axis)
      ctx.moveTo(0, cy); ctx.lineTo(S, cy);   // horizontal (S axis)
      // 45° diagonals (mono L/R guides)
      ctx.moveTo(0, S); ctx.lineTo(S, 0);
      ctx.moveTo(0, 0); ctx.lineTo(S, S);
      ctx.stroke();

      const analyserL = getStereoL();
      const analyserR = getStereoR();
      if (!analyserL || !analyserR) return;

      const bins = analyserL.frequencyBinCount;
      if (dataLRef.current.length !== bins) { dataLRef.current = new Uint8Array(bins); dataRRef.current = new Uint8Array(bins); }
      analyserL.getByteTimeDomainData(dataLRef.current);
      analyserR.getByteTimeDomainData(dataRRef.current);

      ctx.strokeStyle = color + 'cc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < bins; i++) {
        const l = (dataLRef.current[i] - 128) / 128;
        const r = (dataRRef.current[i] - 128) / 128;
        // Rotate 45°: Mid = (L+R)/√2, Side = (L-R)/√2
        const mid  = (l + r) * 0.7071;
        const side = (l - r) * 0.7071;
        const px = cx + side * scale;
        const py = cy - mid  * scale;
        if (first) { ctx.moveTo(px, py); first = false; } else { ctx.lineTo(px, py); }
      }
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#333';
      ctx.font = '7px monospace';
      ctx.fillText('M', cx + 2, 8);
      ctx.fillText('L', 2, cy - 2);
      ctx.fillText('R', S - 8, cy - 2);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, size]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas ref={canvasRef} width={size} height={size}
      className="rounded-sm flex-shrink-0" style={{ border: '1px solid #1e1e24' }} />
  );
}

/* ─── Spectrum visualiser ────────────────────────────────────────────────── */
function SpectrumBar({ getAnalyser, color, width = 300, height = 56 }: {
  getAnalyser: () => AnalyserNode | null | undefined;
  color: string;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const dataRef   = useRef<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width; const H = canvas.height;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0A0A0B'; ctx.fillRect(0, 0, W, H);

      const analyser = getAnalyser();
      if (!analyser) {
        ctx.fillStyle = '#1a1a1e'; ctx.fillRect(0, H - 1, W, 1); return;
      }

      const bins = analyser.frequencyBinCount;
      if (dataRef.current.length !== bins) dataRef.current = new Uint8Array(bins);
      analyser.getByteFrequencyData(dataRef.current);

      const displayBins = Math.min(bins, 512);
      const barW = W / displayBins;

      const grad = ctx.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0, color + '88'); grad.addColorStop(0.6, color + 'cc');
      grad.addColorStop(1, '#ef4444');
      ctx.fillStyle = grad;

      for (let i = 0; i < displayBins; i++) {
        const v = dataRef.current[i] / 255;
        const bH = v * H;
        ctx.fillRect(i * barW, H - bH, Math.max(1, barW - 0.5), bH);
      }
      ctx.fillStyle = '#1a1a1e';
      [0.25, 0.5, 0.75].forEach(p => ctx.fillRect(0, H * (1 - p), W, 1));
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas ref={canvasRef} width={width} height={height}
      className="rounded-sm flex-shrink-0" style={{ border: '1px solid #1e1e24' }} />
  );
}

/* ─── Instrument monitor panel (stereo imager + spectrum) ───────────────── */
function InstrumentMonitor({ getStereoL, getStereoR, getSpectrum, color }: {
  getStereoL: () => AnalyserNode | null | undefined;
  getStereoR: () => AnalyserNode | null | undefined;
  getSpectrum: () => AnalyserNode | null | undefined;
  color: string;
}) {
  return (
    <div className="flex items-end gap-4 p-3 rounded border border-[#1a1a1e] bg-[#0a0a0b] mb-4">
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#444]">Imager</span>
        <StereoImager getStereoL={getStereoL} getStereoR={getStereoR} color={color} size={300} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#444]">Spectrum</span>
        <SpectrumBar getAnalyser={getSpectrum} color={color} width={300} height={300} />
      </div>
    </div>
  );
}

/* ─── ParamRow — knob ────────────────────────────────────────────────────── */
function ParamRow({ label, value, onChange, min = 0, max = 1, step = 0.01, color }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 min-w-[64px]">
      <RotaryKnob
        label="" min={min} max={max} step={step}
        value={value} onChange={onChange} color={color} size={44}
      />
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#555] text-center leading-tight">{label}</span>
      <span className="text-[12px] font-mono tabular-nums" style={{ color }}>
        {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
      </span>
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
      <div className="text-[13px] font-bold uppercase tracking-widest text-[#555] mb-3">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/* ─── WaveformToggle ─────────────────────────────────────────────────────── */
function WaveformToggle({ value, onChange, color }: { value: string; onChange: (v: string) => void; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[15px] text-[#555]">Waveform</span>
      {['sawtooth', 'square', 'triangle'].map(w => (
        <button key={w} onClick={() => onChange(w)}
          className="px-3 py-1 text-[13px] font-bold rounded uppercase tracking-widest transition-colors"
          style={value === w ? { background: color, color: '#000' } : { background: '#1a1a1e', color: '#555', border: '1px solid #242428' }}>
          {w === 'sawtooth' ? 'SAW' : w === 'square' ? 'SQR' : 'TRI'}
        </button>
      ))}
    </div>
  );
}

/* ─── EQ Section ─────────────────────────────────────────────────────────── */
function EQSection({ eq, onChange, color }: {
  eq: { low: number; mid: number; high: number };
  onChange: (band: 'low' | 'mid' | 'high', v: number) => void;
  color: string;
}) {
  return (
    <Section title="3-Band EQ">
      <ParamRow label="Low"  value={eq.low}  onChange={v => onChange('low',  v)} min={-12} max={12} step={0.5} color={color} />
      <ParamRow label="Mid"  value={eq.mid}  onChange={v => onChange('mid',  v)} min={-12} max={12} step={0.5} color={color} />
      <ParamRow label="High" value={eq.high} onChange={v => onChange('high', v)} min={-12} max={12} step={0.5} color={color} />
    </Section>
  );
}

/* ─── InstrumentsPage ────────────────────────────────────────────────────── */
export function InstrumentsPage({
  stereoAnalysers,
  spectrumAnalysers,
}: {
  stereoAnalysers?: React.MutableRefObject<Record<string, { left: AnalyserNode; right: AnalyserNode } | null>>;
  spectrumAnalysers?: React.MutableRefObject<Record<string, AnalyserNode | null>>;
}) {
  const [activeTab, setActiveTab] = useState<InstrumentTab>('drum1');
  const project = useProjectStore(s => s.project);
  const store = useProjectStore();
  const activePattern = useActivePattern();

  const color = TAB_COLORS[activeTab];
  const mixerKey = MIXER_KEY[activeTab];
  const eq = ((project.mixer as any)[mixerKey] || {}).eq || { low: 0, mid: 0, high: 0 };
  const handleEqChange = (band: 'low' | 'mid' | 'high', v: number) => {
    const ch = (project.mixer as any)[mixerKey] || {};
    store.updateMixerChannel(mixerKey as any, { ...ch, eq: { ...ch.eq, [band]: v } });
  };

  return (
    <div className="flex flex-col h-full bg-[#111113] border border-[#242428] rounded-lg shadow-lg overflow-hidden">
      {/* Instrument tabs */}
      <div className="flex border-b border-[#242428] bg-[#0d0d0f] overflow-x-auto">
        {(Object.keys(TAB_LABELS) as InstrumentTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-shrink-0 px-3 py-2.5 text-[13px] font-bold uppercase tracking-widest transition-colors"
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
        {/* Per-instrument monitor */}
        <InstrumentMonitor
          getStereoL={() => stereoAnalysers?.current?.[mixerKey]?.left ?? null}
          getStereoR={() => stereoAnalysers?.current?.[mixerKey]?.right ?? null}
          getSpectrum={() => spectrumAnalysers?.current?.[mixerKey] ?? null}
          color={color}
        />

        {activeTab === 'drum1' && (
          <DrumInstrumentEditor
            drumParams={project.drumParams || {}}
            drumKit={project.drumKit || '808'}
            onUpdateParam={store.updateDrumParam}
            onDrumKitChange={store.drumKitChange}
            color={color}
          />
        )}
        {activeTab === 'drum2' && (
          <Drum2Editor
            tracks={activePattern.drum2 || []}
            onUpdateParam={store.updateDrum2TrackParam}
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
        {activeTab === 'lead' && (
          <LeadSynthEditor
            params={project.leadParams || { waveform: 'sawtooth', octave: 4, cutoff: 0.8, resonance: 0.3, attack: 0.01, decay: 0.3, portamento: 0.0 }}
            onUpdateParam={store.updateLeadParam}
            color={color}
          />
        )}
        {activeTab === 'fm' && (
          <FMSynthEditor
            params={project.fmParams || { ratio: 0.5, modIndex: 0.7, attack: 0.01, decay: 0.8, octave: 5, feedback: 0.0 }}
            onUpdateParam={store.updateFMParam}
            color={color}
          />
        )}
        {activeTab === 'pluck' && (
          <PluckSynthEditor
            params={project.pluckParams || { damping: 0.7, brightness: 0.8, body: 0.5, octave: 3 }}
            onUpdateParam={store.updatePluckParam}
            color={color}
          />
        )}
        {activeTab === 'stab' && (
          <ChordStabEditor
            params={project.stabParams || { waveform: 'sawtooth', octave: 4, cutoff: 0.7, attack: 0.01, decay: 0.15, spread: 0.3 }}
            onUpdateParam={store.updateStabParam}
            color={color}
          />
        )}

        {/* 3-Band EQ (shared for all instruments, reads from mixer channel) */}
        <div className="mt-4">
          <EQSection eq={eq} onChange={handleEqChange} color={color} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-editors ────────────────────────────────────────────────────────────

function DrumInstrumentEditor({ drumParams, drumKit, onUpdateParam, onDrumKitChange, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Drum Machine 1</h3>
      <div className="flex gap-2 mb-6">
        <span className="text-[15px] uppercase tracking-widest text-[#555] self-center mr-2">Kit</span>
        {(['808', '909'] as const).map(k => (
          <button key={k} onClick={() => onDrumKitChange(k)}
            className="px-4 py-1.5 text-[13px] font-bold rounded uppercase tracking-widest transition-colors"
            style={drumKit === k ? { background: color, color: '#000' } : { background: '#1a1a1e', color: '#555', border: '1px solid #242428' }}>
            {k}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {['BD', 'SD', 'HC', 'OH', 'LT', 'HT'].map(inst => {
          const p = drumParams[inst] || { tune: 0.5, decay: 0.5 };
          return (
            <div key={inst} className="p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
              <div className="text-[11px] font-bold mb-3" style={{ color }}>{inst}</div>
              <div className="flex flex-wrap gap-2">
                <ParamRow label="Tune" value={p.tune} onChange={v => onUpdateParam(inst, 'tune', v)} color={color} />
                <ParamRow label="Decay" value={p.decay} onChange={v => onUpdateParam(inst, 'decay', v)} color={color} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Drum2Editor({ tracks, onUpdateParam, color }: any) {
  const DRUM_NAMES = ['BD', 'SD', 'HC', 'OH', 'LT', 'MT', 'HT', 'CP'];
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Elektron Drum Machine 2</h3>
      <div className="grid grid-cols-2 gap-4">
        {(tracks.length > 0 ? tracks : DRUM_NAMES.map((name: string) => ({ name, tune: 0.5, decay: 0.5, mute: false, solo: false, steps: [] }))).map((track: any, i: number) => (
          <div key={i} className="p-4 rounded border border-[#1a1a1e] bg-[#0d0d0f]">
            <div className="text-[11px] font-bold mb-3" style={{ color }}>{track.name || DRUM_NAMES[i] || `T${i + 1}`}</div>
            <div className="flex flex-wrap gap-2">
              <ParamRow label="Tune" value={track.tune ?? 0.5} onChange={v => onUpdateParam(i, 'tune', v)} color={color} />
              <ParamRow label="Decay" value={track.decay ?? 0.5} onChange={v => onUpdateParam(i, 'decay', v)} color={color} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BassEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Bass 303 Synthesizer</h3>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Oscillator">
          <WaveformToggle value={params.waveform} onChange={v => onUpdateParam('waveform', v)} color={color} />
          <ParamRow label="Octave" value={params.octave ?? 2} onChange={v => onUpdateParam('octave', Math.round(v))} min={0} max={8} step={1} color={color} />
        </Section>
        <Section title="Filter">
          <ParamRow label="Cutoff" value={params.cutoff} onChange={v => onUpdateParam('cutoff', v)} color={color} />
          <ParamRow label="Resonance" value={params.resonance} onChange={v => onUpdateParam('resonance', v)} color={color} />
          <ParamRow label="Env Mod" value={params.envMod} onChange={v => onUpdateParam('envMod', v)} color={color} />
          <ParamRow label="Decay" value={params.decay} onChange={v => onUpdateParam('decay', v)} color={color} />
        </Section>
      </div>
    </div>
  );
}

function PadEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Atmospheric Pad Synth</h3>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Envelope">
          <ParamRow label="Attack" value={params.attack} onChange={v => onUpdateParam('attack', v)} color={color} />
          <ParamRow label="Release" value={params.release} onChange={v => onUpdateParam('release', v)} color={color} />
        </Section>
        <Section title="Filter / Tone">
          <ParamRow label="Cutoff" value={params.cutoff} onChange={v => onUpdateParam('cutoff', v)} color={color} />
          <ParamRow label="Detune" value={params.detune} onChange={v => onUpdateParam('detune', v)} color={color} />
          <ParamRow label="Octave" value={params.octave ?? 4} onChange={v => onUpdateParam('octave', Math.round(v))} min={0} max={8} step={1} color={color} />
        </Section>
      </div>
    </div>
  );
}

function PolySynthEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Juno Poly Synthesizer</h3>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Oscillator">
          <ParamRow label="Osc Mix" value={params.oscMix} onChange={v => onUpdateParam('oscMix', v)} color={color} />
          <ParamRow label="Sub Level" value={params.subLevel} onChange={v => onUpdateParam('subLevel', v)} color={color} />
          <ParamRow label="Octave" value={params.octave} onChange={v => onUpdateParam('octave', Math.round(v))} min={2} max={6} step={1} color={color} />
        </Section>
        <Section title="Filter">
          <ParamRow label="Cutoff" value={params.cutoff} onChange={v => onUpdateParam('cutoff', v)} color={color} />
          <ParamRow label="Resonance" value={params.resonance} onChange={v => onUpdateParam('resonance', v)} color={color} />
          <ParamRow label="Env Mod" value={params.envMod} onChange={v => onUpdateParam('envMod', v)} color={color} />
        </Section>
        <Section title="Amp Envelope">
          <ParamRow label="Attack" value={params.attack} onChange={v => onUpdateParam('attack', v)} min={0} max={2} color={color} />
          <ParamRow label="Decay" value={params.decay} onChange={v => onUpdateParam('decay', v)} color={color} />
          <ParamRow label="Sustain" value={params.sustain} onChange={v => onUpdateParam('sustain', v)} color={color} />
          <ParamRow label="Release" value={params.release} onChange={v => onUpdateParam('release', v)} min={0} max={4} color={color} />
        </Section>
        <Section title="Effects">
          <ParamRow label="Chorus" value={params.chorus} onChange={v => onUpdateParam('chorus', v)} color={color} />
        </Section>
      </div>
    </div>
  );
}

function LeadSynthEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Lead Synthesizer</h3>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Oscillator">
          <WaveformToggle value={params.waveform} onChange={v => onUpdateParam('waveform', v)} color={color} />
          <ParamRow label="Octave" value={params.octave ?? 4} onChange={v => onUpdateParam('octave', Math.round(v))} min={0} max={8} step={1} color={color} />
          <ParamRow label="Portamento" value={params.portamento ?? 0} onChange={v => onUpdateParam('portamento', v)} color={color} />
        </Section>
        <Section title="Filter / Envelope">
          <ParamRow label="Cutoff" value={params.cutoff} onChange={v => onUpdateParam('cutoff', v)} color={color} />
          <ParamRow label="Resonance" value={params.resonance} onChange={v => onUpdateParam('resonance', v)} color={color} />
          <ParamRow label="Attack" value={params.attack} onChange={v => onUpdateParam('attack', v)} color={color} />
          <ParamRow label="Decay" value={params.decay} onChange={v => onUpdateParam('decay', v)} color={color} />
        </Section>
      </div>
    </div>
  );
}

function FMSynthEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>FM Synthesizer</h3>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Modulator">
          <ParamRow label="FM Ratio" value={params.ratio} onChange={v => onUpdateParam('ratio', v)} min={0} max={10} step={0.1} color={color} />
          <ParamRow label="Mod Index" value={params.modIndex} onChange={v => onUpdateParam('modIndex', v)} min={0} max={20} step={0.1} color={color} />
          <ParamRow label="Feedback" value={params.feedback ?? 0} onChange={v => onUpdateParam('feedback', v)} color={color} />
        </Section>
        <Section title="Envelope / Pitch">
          <ParamRow label="Octave" value={params.octave ?? 5} onChange={v => onUpdateParam('octave', Math.round(v))} min={0} max={8} step={1} color={color} />
          <ParamRow label="Attack" value={params.attack} onChange={v => onUpdateParam('attack', v)} color={color} />
          <ParamRow label="Decay" value={params.decay} onChange={v => onUpdateParam('decay', v)} color={color} />
        </Section>
      </div>
    </div>
  );
}

function PluckSynthEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Pluck Synthesizer (Karplus-Strong)</h3>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Tone">
          <ParamRow label="Damping" value={params.damping} onChange={v => onUpdateParam('damping', v)} color={color} />
          <ParamRow label="Brightness" value={params.brightness} onChange={v => onUpdateParam('brightness', v)} color={color} />
          <ParamRow label="Body" value={params.body} onChange={v => onUpdateParam('body', v)} color={color} />
        </Section>
        <Section title="Pitch">
          <ParamRow label="Octave" value={params.octave ?? 3} onChange={v => onUpdateParam('octave', Math.round(v))} min={0} max={8} step={1} color={color} />
        </Section>
      </div>
    </div>
  );
}

function ChordStabEditor({ params, onUpdateParam, color }: any) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color }}>Chord Stab Synthesizer</h3>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Oscillator">
          <WaveformToggle value={params.waveform} onChange={v => onUpdateParam('waveform', v)} color={color} />
          <ParamRow label="Octave" value={params.octave ?? 4} onChange={v => onUpdateParam('octave', Math.round(v))} min={0} max={8} step={1} color={color} />
          <ParamRow label="Spread" value={params.spread ?? 0.3} onChange={v => onUpdateParam('spread', v)} color={color} />
        </Section>
        <Section title="Filter / Envelope">
          <ParamRow label="Cutoff" value={params.cutoff} onChange={v => onUpdateParam('cutoff', v)} color={color} />
          <ParamRow label="Attack" value={params.attack} onChange={v => onUpdateParam('attack', v)} color={color} />
          <ParamRow label="Decay" value={params.decay} onChange={v => onUpdateParam('decay', v)} color={color} />
        </Section>
      </div>
    </div>
  );
}
