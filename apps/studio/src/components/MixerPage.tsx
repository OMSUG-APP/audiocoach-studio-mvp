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

/* ─── Stereo VU Bar ──────────────────────────────────────────────────────── */
function VuBar({
  getAnalyserL, getAnalyserR, getAnalyser, color, height = 130,
}: {
  getAnalyserL?: () => AnalyserNode | null | undefined;
  getAnalyserR?: () => AnalyserNode | null | undefined;
  getAnalyser?: () => AnalyserNode | null | undefined;
  color: string;
  height?: number;
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const peakLRef     = useRef(0); const peakHoldLRef = useRef(0);
  const peakRRef     = useRef(0); const peakHoldRRef = useRef(0);
  const dataRef      = useRef<Uint8Array>(new Uint8Array(0));
  const stereo = !!(getAnalyserL && getAnalyserR);
  const W = stereo ? 22 : 10;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const H = canvas.height;

    function getRms(analyser: AnalyserNode | null | undefined): number {
      if (!analyser) return 0;
      const needed = analyser.frequencyBinCount;
      if (dataRef.current.length !== needed) dataRef.current = new Uint8Array(needed);
      analyser.getByteTimeDomainData(dataRef.current);
      let sum = 0;
      for (let i = 0; i < needed; i++) {
        const v = (dataRef.current[i] - 128) / 128;
        sum += v * v;
      }
      return Math.sqrt(sum / needed);
    }

    function drawBar(x: number, w: number, rms: number, peakRef: React.MutableRefObject<number>, holdRef: React.MutableRefObject<number>) {
      if (rms > peakRef.current) { peakRef.current = rms; holdRef.current = 60; }
      else { if (holdRef.current > 0) holdRef.current--; else peakRef.current *= 0.97; }

      const fillH = Math.min(rms * 6, 1) * H;
      const peakY = H - Math.min(peakRef.current * 6, 1) * H;

      const grad = ctx2d.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0,    color);
      grad.addColorStop(0.65, '#22c55e');
      grad.addColorStop(0.85, '#eab308');
      grad.addColorStop(1,    '#ef4444');
      ctx2d.fillStyle = grad;
      ctx2d.fillRect(x, H - fillH, w, fillH);

      if (peakRef.current > 0.002) {
        ctx2d.fillStyle = peakRef.current > 0.15 ? '#ef4444' : '#fff';
        ctx2d.fillRect(x, peakY - 1, w, 2);
      }

      ctx2d.fillStyle = '#333';
      [0.25, 0.5, 0.75].forEach(pct => {
        ctx2d.fillRect(x, H * (1 - pct) - 0.5, w, 1);
      });
    }

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx2d.clearRect(0, 0, W, H);
      ctx2d.fillStyle = '#0A0A0B';
      ctx2d.fillRect(0, 0, W, H);

      if (stereo) {
        const rmsL = getRms(getAnalyserL!());
        const rmsR = getRms(getAnalyserR!());
        drawBar(0,  10, rmsL, peakLRef, peakHoldLRef);
        drawBar(12, 10, rmsR, peakRRef, peakHoldRRef);
        // L/R labels
        ctx2d.fillStyle = '#333';
        ctx2d.font = '6px monospace';
        ctx2d.fillText('L', 3, H - 2);
        ctx2d.fillText('R', 14, H - 2);
      } else {
        const rms = getRms(getAnalyser?.());
        drawBar(0, 10, rms, peakLRef, peakHoldLRef);
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, height, stereo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={height}
      className="rounded-sm flex-shrink-0"
      style={{ border: '1px solid #1e1e24' }}
    />
  );
}

/* ─── Spectrum Bar ───────────────────────────────────────────────────────── */
function SpectrumBar({
  getAnalyser, color, width = 260, height = 56,
}: {
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
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx2d.clearRect(0, 0, W, H);
      ctx2d.fillStyle = '#0A0A0B';
      ctx2d.fillRect(0, 0, W, H);

      const analyser = getAnalyser();
      if (!analyser) {
        // draw idle baseline
        ctx2d.fillStyle = '#1a1a1e';
        ctx2d.fillRect(0, H - 1, W, 1);
        return;
      }

      const bins = analyser.frequencyBinCount;
      if (dataRef.current.length !== bins) dataRef.current = new Uint8Array(bins);
      analyser.getByteFrequencyData(dataRef.current);

      // Display roughly 20Hz–20kHz on a log scale using the first half of bins
      const displayBins = Math.min(bins, 512);
      const barW = W / displayBins;

      const grad = ctx2d.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0,    color + '88');
      grad.addColorStop(0.6,  color + 'cc');
      grad.addColorStop(1,    '#ef4444');
      ctx2d.fillStyle = grad;

      for (let i = 0; i < displayBins; i++) {
        const v = dataRef.current[i] / 255;
        const barH = v * H;
        ctx2d.fillRect(i * barW, H - barH, Math.max(1, barW - 0.5), barH);
      }

      // Grid lines at 1/4 height intervals
      ctx2d.fillStyle = '#1a1a1e';
      [0.25, 0.5, 0.75].forEach(p => ctx2d.fillRect(0, H * (1 - p), W, 1));
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-sm"
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
  pan: 0,
  width: 1,
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
  getAnalyserL?: () => AnalyserNode | null | undefined;
  getAnalyserR?: () => AnalyserNode | null | undefined;
  getAnalyser?: () => AnalyserNode | null | undefined;
}

const ChannelStrip: React.FC<ChannelStripProps> = ({ label, color, channel, onChange, getAnalyserL, getAnalyserR, getAnalyser }) => {
  const ch    = channel || DEFAULT_CHANNEL;
  const eq    = ch.eq    || { low: 0, mid: 0, high: 0 };
  const delay = ch.delay || { time: 0.3, feedback: 0.3, mix: 0 };

  const setEq  = (band: 'high' | 'mid' | 'low', v: number) =>
    onChange({ ...ch, eq: { ...eq, [band]: v } });
  const setRev = (v: number) => onChange({ ...ch, reverb: v });
  const setDly = (v: number) => onChange({ ...ch, delay: { ...delay, mix: v } });
  const setDrv = (v: number) => onChange({ ...ch, driveSend: v });
  const setWid = (v: number) => onChange({ ...ch, width: v });
  const setVol = (v: number) => onChange({ ...ch, volume: v });
  const setPan = (v: number) => onChange({ ...ch, pan: v });

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

      {/* EQ + Sends knobs */}
      <div className="flex flex-col gap-1 px-3 pt-3 pb-2 w-full border-b border-[#242428]">
        <KnobRow label="H"   value={eq.high ?? 0}   min={-12} max={12} step={0.5}  color={color} onChange={v => setEq('high', v)} />
        <KnobRow label="M"   value={eq.mid  ?? 0}  min={-12} max={12} step={0.5}  color={color} onChange={v => setEq('mid',  v)} />
        <KnobRow label="L"   value={eq.low  ?? 0}  min={-12} max={12} step={0.5}  color={color} onChange={v => setEq('low',  v)} />
        <div className="h-px bg-[#1e1e24] my-0.5" />
        <KnobRow label="PAN" value={ch.pan ?? 0}   min={-1}  max={1}  step={0.01} color={color} onChange={setPan} />
        <div className="h-px bg-[#1e1e24] my-0.5" />
        <KnobRow label="DLY" value={delay.mix ?? 0}     min={0}   max={1}  step={0.01} color={color} onChange={setDly} />
        <KnobRow label="REV" value={ch.reverb ?? 0}      min={0}   max={1}  step={0.01} color={color} onChange={setRev} />
        <KnobRow label="DRV" value={ch.driveSend ?? 0}   min={0}   max={1}  step={0.01} color={color} onChange={setDrv} />
        <div className="h-px bg-[#1e1e24] my-0.5" />
        <KnobRow label="WID" value={ch.width ?? 1}       min={0}   max={2}  step={0.01} color={color} onChange={setWid} />
      </div>

      {/* Volume — fader left, stereo VU bar right */}
      <div className="flex flex-col items-center gap-1 pt-3 pb-2 px-3 w-full">
        <div className="flex items-end justify-center gap-3">
          <input
            type="range" min="0" max="1.5" step="0.01"
            value={ch.volume ?? 0.8}
            onChange={e => setVol(parseFloat(e.target.value))}
            className="mixer-fader"
            style={{ height: 130, width: 10 }}
          />
          <VuBar
            getAnalyserL={getAnalyserL}
            getAnalyserR={getAnalyserR}
            getAnalyser={getAnalyser}
            color={color}
            height={130}
          />
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
  mixer, onUpdate, getAnalyserL, getAnalyserR,
}: {
  mixer: { volume: number; compressor?: any };
  onUpdate: (v: Partial<{ volume: number; compressor: any }>) => void;
  getAnalyserL: () => AnalyserNode | null | undefined;
  getAnalyserR: () => AnalyserNode | null | undefined;
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
        <KnobRow label="THR" value={comp.threshold ?? -12}  min={-40} max={0}   step={1}     color="#FF5F00" onChange={v => onUpdate({ compressor: { ...comp, threshold: v } })} />
        <KnobRow label="RAT" value={comp.ratio     ?? 4}    min={1}   max={20}  step={0.5}   color="#FF5F00" onChange={v => onUpdate({ compressor: { ...comp, ratio: v } })} />
        <KnobRow label="ATK" value={comp.attack    ?? 0.003}min={0}   max={0.1} step={0.001} color="#FF5F00" onChange={v => onUpdate({ compressor: { ...comp, attack: v } })} />
        <KnobRow label="REL" value={comp.release   ?? 0.25} min={0}   max={2}   step={0.01}  color="#FF5F00" onChange={v => onUpdate({ compressor: { ...comp, release: v } })} />
        <div className="h-px bg-[#1e1e24] my-0.5" />
        <span className="text-[10px] uppercase tracking-widest text-[#333] text-center">Limiter OFF</span>
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
          <VuBar getAnalyserL={getAnalyserL} getAnalyserR={getAnalyserR} color="#FF5F00" height={130} />
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
  stereoAnalysers,
  samplerAnalyser,
  samplerStereoL,
  samplerStereoR,
  spectrumAnalysers,
}: {
  analysers?:        React.MutableRefObject<Record<string, AnalyserNode | null>>;
  stereoAnalysers?:  React.MutableRefObject<Record<string, { left: AnalyserNode; right: AnalyserNode } | null>>;
  samplerAnalyser?:  React.MutableRefObject<AnalyserNode | null>;
  samplerStereoL?:   React.MutableRefObject<AnalyserNode | null>;
  samplerStereoR?:   React.MutableRefObject<AnalyserNode | null>;
  spectrumAnalysers?: React.MutableRefObject<Record<string, AnalyserNode | null>>;
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

        {/* Master spectrum — full width at top */}
        <div className="border-b border-[#242428] bg-[#0d0d0f] px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#555]">Master Spectrum</span>
          </div>
          <SpectrumBar
            getAnalyser={() => spectrumAnalysers?.current?.master ?? null}
            color="#FF5F00"
            width={900}
            height={48}
          />
        </div>

        {/* Channel strips row */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-2 min-w-max h-full">
            {CHANNELS.map(({ mixKey, label, color }) => {
              const ch = (mixer as any)[mixKey] as ChannelMixer | undefined;
              const isSampler = mixKey === 'sampler';
              const stereo = isSampler
                ? { L: () => samplerStereoL?.current ?? null, R: () => samplerStereoR?.current ?? null }
                : { L: () => stereoAnalysers?.current?.[mixKey]?.left ?? null, R: () => stereoAnalysers?.current?.[mixKey]?.right ?? null };

              return (
                <ChannelStrip
                  key={mixKey}
                  label={label}
                  color={color}
                  channel={ch || DEFAULT_CHANNEL}
                  onChange={updated => store.updateMixerChannel(mixKey as any, updated)}
                  getAnalyserL={stereo.L}
                  getAnalyserR={stereo.R}
                />
              );
            })}

            <div className="w-px bg-[#242428] mx-2 self-stretch" />

            <MasterStrip
              mixer={mixer.master}
              onUpdate={partial => store.updateMixer({ ...mixer, master: { ...mixer.master, ...partial } })}
              getAnalyserL={() => stereoAnalysers?.current?.master?.left ?? null}
              getAnalyserR={() => stereoAnalysers?.current?.master?.right ?? null}
            />
          </div>
        </div>

      </div>
    </>
  );
}
