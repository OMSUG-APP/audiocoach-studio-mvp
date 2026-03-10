import React, { useRef, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { ChannelMixer } from '../types';
import { RotaryKnob } from './RotaryKnob';

/* ─── Fader CSS ──────────────────────────────────────────────────────────── */
const FADER_STYLE = `
.mixer-fader {
  -webkit-appearance: none;
  appearance: none;
  writing-mode: vertical-lr;
  direction: rtl;
  background: transparent;
  outline: none;
  cursor: ns-resize;
  padding: 0;
  border: none;
}
.mixer-fader::-webkit-slider-runnable-track {
  width: 4px;
  border-radius: 2px;
  background: #1a1a1e;
  border: 1px solid #2e2e38;
}
.mixer-fader::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 10px;
  background: linear-gradient(180deg, #4a4a54 0%, #2e2e38 50%, #4a4a54 100%);
  border: 1px solid #666670;
  border-radius: 2px;
  cursor: ns-resize;
  margin-left: -12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08);
}
.mixer-fader::-moz-range-track {
  width: 4px;
  border-radius: 2px;
  background: #1a1a1e;
  border: 1px solid #2e2e38;
}
.mixer-fader::-moz-range-thumb {
  width: 28px;
  height: 10px;
  background: linear-gradient(180deg, #4a4a54 0%, #2e2e38 50%, #4a4a54 100%);
  border: 1px solid #666670;
  border-radius: 2px;
  cursor: ns-resize;
  box-shadow: 0 1px 3px rgba(0,0,0,0.6);
}
`;

/* ─── VU Bar — real RMS metering via AnalyserNode ───────────────────────── */
function VuBar({
  getAnalyser, color, height = 130,
}: {
  getAnalyser: () => AnalyserNode | null | undefined;
  color: string;
  height?: number;
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const peakRef     = useRef(0);
  const peakHoldRef = useRef(0);
  // Keep a reusable data buffer; resize lazily when analyser changes
  const dataRef     = useRef<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx2d.clearRect(0, 0, W, H);

      // Background
      ctx2d.fillStyle = '#0A0A0B';
      ctx2d.fillRect(0, 0, W, H);

      // Poll for analyser each frame — picks up lazy-initialised nodes
      const analyser = getAnalyser();
      let rms = 0;
      if (analyser) {
        const needed = analyser.frequencyBinCount;
        if (dataRef.current.length !== needed) dataRef.current = new Uint8Array(needed);
        analyser.getByteTimeDomainData(dataRef.current);
        let sum = 0;
        for (let i = 0; i < needed; i++) {
          const v = (dataRef.current[i] - 128) / 128;
          sum += v * v;
        }
        rms = Math.sqrt(sum / needed);
      }

      // Smooth peak hold
      if (rms > peakRef.current) {
        peakRef.current = rms;
        peakHoldRef.current = 60;
      } else {
        if (peakHoldRef.current > 0) peakHoldRef.current--;
        else peakRef.current *= 0.97;
      }

      const fillH = Math.min(rms * 6, 1) * H;
      const peakY = H - Math.min(peakRef.current * 6, 1) * H;

      // Gradient fill
      const grad = ctx2d.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0,    color);
      grad.addColorStop(0.65, '#22c55e');
      grad.addColorStop(0.85, '#eab308');
      grad.addColorStop(1,    '#ef4444');

      ctx2d.fillStyle = grad;
      ctx2d.fillRect(0, H - fillH, W, fillH);

      // Peak indicator line
      if (peakRef.current > 0.002) {
        ctx2d.fillStyle = peakRef.current > 0.15 ? '#ef4444' : '#fff';
        ctx2d.fillRect(0, peakY - 1, W, 2);
      }

      // Tick marks at 25%, 50%, 75%
      ctx2d.fillStyle = '#333';
      [0.25, 0.5, 0.75].forEach(pct => {
        ctx2d.fillRect(0, H * (1 - pct) - 0.5, W, 1);
      });
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  // getAnalyser is a stable lambda; color/height are primitive — safe deps
  }, [color, height]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={10}
      height={height}
      className="rounded-sm flex-shrink-0"
      style={{ border: '1px solid #1e1e24' }}
    />
  );
}

/* ─── Knob row helper ────────────────────────────────────────────────────── */
function KnobRow({
  label, value, min, max, step, color, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; color: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-[12px] font-bold uppercase tracking-widest text-[#555] w-6 flex-shrink-0">{label}</span>
      <RotaryKnob
        label="" min={min} max={max} step={step}
        value={value} onChange={onChange} color={color} size={32}
        className="flex-shrink-0"
      />
      <span className="text-[12px] font-mono text-[#555] w-8 text-right flex-shrink-0 tabular-nums">
        {value.toFixed(min < 0 ? 0 : step < 0.1 ? 2 : 1)}
      </span>
    </div>
  );
}

/* ─── Defaults ───────────────────────────────────────────────────────────── */
const DEFAULT_CHANNEL: ChannelMixer = {
  volume: 0.8,
  eq: { low: 0, mid: 0, high: 0 },
  reverb: 0,
  delay: { time: 0.3, feedback: 0.3, mix: 0 },
  driveSend: 0,
};

/* ─── Channel strip ──────────────────────────────────────────────────────── */
interface ChannelStripProps {
  label: string;
  color: string;
  channel: ChannelMixer;
  onChange: (ch: ChannelMixer) => void;
  getAnalyser: () => AnalyserNode | null | undefined;
}

const ChannelStrip: React.FC<ChannelStripProps> = ({ label, color, channel, onChange, getAnalyser }) => {
  const ch    = channel || DEFAULT_CHANNEL;
  const eq    = ch.eq    || { low: 0, mid: 0, high: 0 };
  const delay = ch.delay || { time: 0.3, feedback: 0.3, mix: 0 };

  const setEq  = (band: 'high' | 'mid' | 'low', v: number) =>
    onChange({ ...ch, eq: { ...eq, [band]: v } });
  const setRev = (v: number) => onChange({ ...ch, reverb: v });
  const setDly = (v: number) => onChange({ ...ch, delay: { ...delay, mix: v } });
  const setVol = (v: number) => onChange({ ...ch, volume: v });

  return (
    <div
      className="flex flex-col items-center py-4 border border-[#242428] rounded-lg bg-[#0d0d0f]"
      style={{ minWidth: 100 }}
    >
      {/* Name */}
      <div
        className="text-[13px] font-bold uppercase tracking-widest pb-3 px-3 w-full text-center border-b border-[#242428]"
        style={{ color }}
      >
        {label}
      </div>

      {/* EQ + Sends knobs stacked top-to-bottom */}
      <div className="flex flex-col gap-1 px-3 pt-3 pb-2 w-full border-b border-[#242428]">
        <KnobRow label="H"   value={eq.high}     min={-12} max={12} step={0.5}  color={color} onChange={v => setEq('high', v)} />
        <KnobRow label="M"   value={eq.mid}      min={-12} max={12} step={0.5}  color={color} onChange={v => setEq('mid',  v)} />
        <KnobRow label="L"   value={eq.low}      min={-12} max={12} step={0.5}  color={color} onChange={v => setEq('low',  v)} />
        <div className="h-px bg-[#1e1e24] my-0.5" />
        <KnobRow label="DLY" value={delay.mix}   min={0}   max={1}  step={0.01} color={color} onChange={setDly} />
        <KnobRow label="REV" value={ch.reverb ?? 0} min={0} max={1} step={0.01} color={color} onChange={setRev} />
      </div>

      {/* Volume — fader left, VU bar right */}
      <div className="flex flex-col items-center gap-1 pt-3 pb-2 px-3 w-full">
        <div className="flex items-end justify-center gap-3">
          <input
            type="range" min="0" max="1.5" step="0.01"
            value={ch.volume ?? 0.8}
            onChange={e => setVol(parseFloat(e.target.value))}
            className="mixer-fader"
            style={{ height: 130, width: 10 }}
          />
          <VuBar getAnalyser={getAnalyser} color={color} height={130} />
        </div>
        <span className="text-[12px] font-mono mt-1 tabular-nums" style={{ color }}>
          {((ch.volume ?? 0.8) * 100).toFixed(0)}
        </span>
      </div>
    </div>
  );
};

/* ─── Master strip ───────────────────────────────────────────────────────── */
function MasterStrip({
  mixer, onUpdate, getAnalyser,
}: {
  mixer: { volume: number; compressor?: any };
  onUpdate: (v: Partial<{ volume: number; compressor: any }>) => void;
  getAnalyser: () => AnalyserNode | null | undefined;
}) {
  const comp = mixer.compressor || { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 };
  return (
    <div
      className="flex flex-col items-center py-4 border border-[#FF5F00]/40 rounded-lg bg-[#0d0d0f]"
      style={{ minWidth: 110 }}
    >
      <div className="text-[13px] font-bold uppercase tracking-widest pb-3 px-3 w-full text-center border-b border-[#FF5F00]/20 text-[#FF5F00]">
        Master
      </div>

      <div className="flex flex-col gap-1 px-3 pt-3 pb-2 w-full border-b border-[#242428]">
        <span className="text-[11px] uppercase tracking-widest text-[#333] text-center mb-0.5">Comp</span>
        <KnobRow label="THR" value={comp.threshold} min={-40} max={0}   step={1}     color="#FF5F00" onChange={v => onUpdate({ compressor: { ...comp, threshold: v } })} />
        <KnobRow label="RAT" value={comp.ratio}     min={1}   max={20}  step={0.5}   color="#FF5F00" onChange={v => onUpdate({ compressor: { ...comp, ratio: v } })} />
        <KnobRow label="ATK" value={comp.attack}    min={0}   max={0.1} step={0.001} color="#FF5F00" onChange={v => onUpdate({ compressor: { ...comp, attack: v } })} />
        <KnobRow label="REL" value={comp.release}   min={0}   max={2}   step={0.01}  color="#FF5F00" onChange={v => onUpdate({ compressor: { ...comp, release: v } })} />
      </div>

      <div className="flex flex-col items-center gap-1 pt-3 pb-2 px-3 w-full">
        <div className="flex items-end justify-center gap-3">
          <input
            type="range" min="0" max="1.5" step="0.01"
            value={mixer.volume}
            onChange={e => onUpdate({ volume: parseFloat(e.target.value) })}
            className="mixer-fader"
            style={{ height: 130, width: 10 }}
          />
          <VuBar getAnalyser={getAnalyser} color="#FF5F00" height={130} />
        </div>
        <span className="text-[12px] font-mono mt-1 text-[#FF5F00] tabular-nums">
          {(mixer.volume * 100).toFixed(0)}
        </span>
      </div>
    </div>
  );
}

/* ─── Channel list ───────────────────────────────────────────────────────── */
const CHANNELS = [
  { mixKey: 'drums',     label: 'Drum 1',  color: '#FF5F00' },
  { mixKey: 'drum2',     label: 'Drum 2',  color: '#22D3EE' },
  { mixKey: 'bass',      label: 'Bass',    color: '#F59E0B' },
  { mixKey: 'synth',     label: 'Pad',     color: '#8B5CF6' },
  { mixKey: 'polySynth', label: 'Juno',    color: '#A855F7' },
  { mixKey: 'lead',      label: 'Lead',    color: '#EF4444' },
  { mixKey: 'fm',        label: 'FM',      color: '#10B981' },
  { mixKey: 'pluck',     label: 'Pluck',   color: '#EC4899' },
  { mixKey: 'stab',      label: 'Stab',    color: '#6366F1' },
  { mixKey: 'sampler',   label: 'Sampler', color: '#10B981' },
] as const;

/* ─── MixerPage ──────────────────────────────────────────────────────────── */
export function MixerPage({
  analysers,
}: {
  analysers?: React.MutableRefObject<Record<string, AnalyserNode | null>>;
}) {
  const project = useProjectStore(s => s.project);
  const store   = useProjectStore();
  const mixer   = project.mixer;

  return (
    <>
      <style>{FADER_STYLE}</style>
      <div className="flex flex-col h-full bg-[#111113] border border-[#242428] rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#242428] bg-[#0d0d0f] flex-shrink-0">
          <span className="text-[15px] font-bold uppercase tracking-widest text-[#FF5F00]">Mixer</span>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-2 min-w-max h-full">
            {CHANNELS.map(({ mixKey, label, color }) => {
              const ch = (mixer as any)[mixKey] as ChannelMixer | undefined;
              return (
                <ChannelStrip
                  key={mixKey}
                  label={label}
                  color={color}
                  channel={ch || DEFAULT_CHANNEL}
                  onChange={updated => store.updateMixerChannel(mixKey as any, updated)}
                  getAnalyser={() => analysers?.current?.[mixKey] ?? null}
                />
              );
            })}

            <div className="w-px bg-[#242428] mx-2 self-stretch" />

            <MasterStrip
              mixer={mixer.master}
              onUpdate={partial => store.updateMixer({ ...mixer, master: { ...mixer.master, ...partial } })}
              getAnalyser={() => analysers?.current?.master ?? null}
            />
          </div>
        </div>
      </div>
    </>
  );
}
