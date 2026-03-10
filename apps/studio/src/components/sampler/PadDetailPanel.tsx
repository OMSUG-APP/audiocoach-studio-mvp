import React, { useRef } from 'react';
import { SamplerPad, SamplerEnvelope, SamplerFilter, PadLoadStatus } from '../../types';
import { PadEnvelopeControls } from './PadEnvelopeControls';
import { PadFilterControls } from './PadFilterControls';
import { SoundCategory, SOUND_CATEGORIES } from '../../utils/generateSound';

// ─── Waveform display ──────────────────────────────────────────────────────────

interface WaveformDisplayProps {
  peaks: number[];       // 256 values, 0-1
  color: string;
  startPoint: number;    // 0-1 normalised
  endPoint: number;      // 0-1 normalised
}

function WaveformDisplay({ peaks, color, startPoint, endPoint }: WaveformDisplayProps) {
  const W = 512;
  const H = 80;
  const mid = H / 2;

  const xScale = peaks.length > 1 ? 1 / (peaks.length - 1) : 0;
  const topPts = peaks
    .map((v, i) => `${i * xScale * W},${mid - v * mid}`)
    .join(' ');
  const botPts = peaks
    .map((v, i) => `${i * xScale * W},${mid + v * mid}`)
    .join(' ');

  const startX = startPoint * W;
  const endX   = endPoint   * W;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full rounded"
      style={{ height: 80, background: '#0A0A0B', display: 'block' }}
    >
      {startX > 0 && (
        <rect x={0} y={0} width={startX} height={H} fill="#000" opacity={0.55} />
      )}
      {endX < W && (
        <rect x={endX} y={0} width={W - endX} height={H} fill="#000" opacity={0.55} />
      )}

      <polyline points={topPts} fill="none" stroke={color} strokeWidth={1} opacity={0.8} />
      <polyline points={botPts} fill="none" stroke={color} strokeWidth={1} opacity={0.8} />

      <line x1={0} y1={mid} x2={W} y2={mid} stroke="#333" strokeWidth={0.5} />

      <line x1={startX} y1={0} x2={startX} y2={H} stroke={color} strokeWidth={1.5} />
      <polygon points={`${startX},4 ${startX + 6},0 ${startX},0`} fill={color} />

      <line x1={endX} y1={0} x2={endX} y2={H} stroke={color} strokeWidth={1.5} />
      <polygon points={`${endX},4 ${endX - 6},0 ${endX},0`} fill={color} />
    </svg>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────────────────

interface PadDetailPanelProps {
  pad: SamplerPad;
  status: PadLoadStatus;
  waveformPeaks?: number[] | null;
  onUpdateLabel: (label: string) => void;
  onUpdateVolume: (v: number) => void;
  onUpdatePitch: (v: number) => void;
  onUpdatePan?: (v: number) => void;
  onUpdateLoop?: (v: boolean) => void;
  onUpdateAttack?: (v: number) => void;
  onUpdateEnvelope: (env: Partial<SamplerEnvelope>) => void;
  onUpdateFilter: (filter: Partial<SamplerFilter>) => void;
  onUpdateMute: (v: boolean) => void;
  onUpdateSolo: (v: boolean) => void;
  onClear: () => void;
  onTrigger: () => void;
  onLoadFile: (file: File) => void;
  onGenerate: (category: SoundCategory) => Promise<void>;
}

export function PadDetailPanel({
  pad, status, waveformPeaks,
  onUpdateLabel, onUpdateVolume, onUpdatePitch,
  onUpdatePan, onUpdateLoop, onUpdateAttack,
  onUpdateEnvelope, onUpdateFilter,
  onUpdateMute, onUpdateSolo,
  onClear, onTrigger, onLoadFile, onGenerate,
}: PadDetailPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = React.useState(false);
  const [category, setCategory] = React.useState<SoundCategory>('beats');

  const loaded = status === 'loaded';

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 pb-3 border-b border-[#242428]">

        {/* Row 1: identity */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: pad.color }} />

          <input
            value={pad.label}
            maxLength={14}
            onChange={e => onUpdateLabel(e.target.value.toUpperCase())}
            className="bg-transparent text-sm font-bold text-[#F0F0F2] uppercase tracking-widest focus:outline-none flex-1 min-w-0"
          />

          <span className="text-[13px] tracking-widest flex-shrink-0" style={{ color: loaded ? pad.color : '#555' }}>
            {loaded ? '● loaded' : status === 'loading' ? '⟳ loading' : status === 'error' ? '✕ error' : '○ empty'}
          </span>

          {loaded && pad.fileName && (
            <span className="text-[12px] text-[#555] truncate max-w-[120px]" title={pad.fileName}>
              {pad.fileName}
            </span>
          )}
        </div>

        {/* Row 2: category selector + generate button */}
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={e => setCategory(e.target.value as SoundCategory)}
            className="flex-1 bg-[#0A0A0B] border border-[#2a2a30] rounded px-2 py-1.5 text-[13px] uppercase tracking-widest text-[#8A8A94] focus:outline-none cursor-pointer"
            style={{ accentColor: pad.color }}
          >
            {SOUND_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <button
            onClick={async () => {
              setGenerating(true);
              await onGenerate(category);
              setGenerating(false);
            }}
            disabled={generating}
            className="px-4 py-1.5 rounded text-[13px] font-bold uppercase tracking-widest transition-colors border disabled:opacity-50 flex-shrink-0"
            style={{ borderColor: pad.color, color: pad.color, background: 'transparent' }}
          >
            {generating ? '...' : '⚡ Generate'}
          </button>
        </div>
      </div>

      {/* ── Sample load / replace ───────────────────────────────────────── */}
      <div
        className="flex items-center justify-between rounded border border-dashed px-4 py-3 cursor-pointer transition-colors"
        style={{ borderColor: loaded ? '#333' : '#2a2a30', background: '#0A0A0B' }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onLoadFile(f);
            e.target.value = '';
          }}
        />
        <span className="text-[13px] text-[#8A8A94] tracking-widest">
          {loaded ? 'click to replace sample' : 'click or drag a file onto a pad to load'}
        </span>
        {loaded && (
          <button
            className="text-[13px] text-[#ef4444] hover:text-red-300 ml-4 flex-shrink-0"
            onClick={e => { e.stopPropagation(); onClear(); }}
          >
            × clear
          </button>
        )}
      </div>

      {/* ── Waveform ────────────────────────────────────────────────────── */}
      {loaded && waveformPeaks && waveformPeaks.length > 0 ? (
        <div className="flex flex-col gap-1">
          <WaveformDisplay
            peaks={waveformPeaks}
            color={pad.color}
            startPoint={pad.envelope.start}
            endPoint={pad.envelope.end}
          />
          <div className="flex justify-between px-0.5">
            <span className="text-[12px] text-[#444] font-mono">0:00</span>
            <span className="text-[12px] text-[#444] font-mono tracking-widest">waveform</span>
            <span className="text-[12px] text-[#444] font-mono">end</span>
          </div>
        </div>
      ) : loaded ? (
        <div className="h-[80px] rounded bg-[#0A0A0B] flex items-center justify-center">
          <span className="text-[13px] text-[#333] tracking-widest">computing waveform…</span>
        </div>
      ) : null}

      {/* ── Envelope ───────────────────────────────────────────────────── */}
      <PadEnvelopeControls
        envelope={pad.envelope}
        color={pad.color}
        onChange={onUpdateEnvelope}
      />

      <div className="border-t border-[#242428]" />

      {/* ── Filter ─────────────────────────────────────────────────────── */}
      <PadFilterControls
        filter={pad.filter}
        color={pad.color}
        onChange={onUpdateFilter}
      />

      <div className="border-t border-[#242428]" />

      {/* ── Volume & Pitch ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <span className="text-[13px] font-bold text-[#8A8A94] uppercase tracking-widest">Output</span>

        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest w-14 flex-shrink-0">Volume</span>
          <input
            type="range" min={0} max={1.5} step={0.01} value={pad.volume}
            onChange={e => onUpdateVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer"
            style={{ accentColor: pad.color }}
          />
          <span className="text-[13px] font-mono w-10 text-right flex-shrink-0" style={{ color: pad.color }}>
            {Math.round(pad.volume * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest w-14 flex-shrink-0">Pitch</span>
          <input
            type="range" min={-24} max={24} step={1} value={pad.pitch}
            onChange={e => onUpdatePitch(parseInt(e.target.value))}
            className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer"
            style={{ accentColor: pad.color }}
          />
          <span className="text-[13px] font-mono w-10 text-right flex-shrink-0" style={{ color: pad.color }}>
            {pad.pitch > 0 ? `+${pad.pitch}` : pad.pitch}st
          </span>
        </div>

        {onUpdatePan && (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest w-14 flex-shrink-0">Pan</span>
            <input
              type="range" min={-1} max={1} step={0.01} value={pad.pan ?? 0}
              onChange={e => onUpdatePan(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer"
              style={{ accentColor: pad.color }}
            />
            <span className="text-[13px] font-mono w-10 text-right flex-shrink-0" style={{ color: pad.color }}>
              {(pad.pan ?? 0) === 0 ? 'C' : (pad.pan ?? 0) > 0 ? `R${Math.round((pad.pan ?? 0) * 100)}` : `L${Math.round(Math.abs(pad.pan ?? 0) * 100)}`}
            </span>
          </div>
        )}

        {onUpdateAttack && (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest w-14 flex-shrink-0">Attack</span>
            <input
              type="range" min={0.001} max={2} step={0.001} value={pad.attack ?? 0.005}
              onChange={e => onUpdateAttack(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer"
              style={{ accentColor: pad.color }}
            />
            <span className="text-[13px] font-mono w-10 text-right flex-shrink-0" style={{ color: pad.color }}>
              {(pad.attack ?? 0.005).toFixed(3)}s
            </span>
          </div>
        )}

        {onUpdateLoop && (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#8A8A94] uppercase tracking-widest w-14 flex-shrink-0">Loop</span>
            <button
              onClick={() => onUpdateLoop(!(pad.loop ?? false))}
              className="px-3 py-1 text-[13px] font-bold rounded border transition-colors uppercase tracking-widest"
              style={(pad.loop ?? false)
                ? { background: pad.color, borderColor: pad.color, color: '#000' }
                : { background: 'transparent', borderColor: '#333', color: '#666' }}
            >
              {(pad.loop ?? false) ? 'On' : 'Off'}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-[#242428]" />

      {/* ── Mute / Solo / Preview ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-auto">
        <button
          onClick={() => onUpdateMute(!pad.mute)}
          className="px-3 py-1.5 rounded text-[13px] font-bold border transition-colors uppercase tracking-widest"
          style={pad.mute
            ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' }
            : { background: 'transparent', borderColor: '#333', color: '#666' }}
        >
          Mute
        </button>
        <button
          onClick={() => onUpdateSolo(!pad.solo)}
          className="px-3 py-1.5 rounded text-[13px] font-bold border transition-colors uppercase tracking-widest"
          style={pad.solo
            ? { background: pad.color, borderColor: pad.color, color: '#000' }
            : { background: 'transparent', borderColor: '#333', color: '#666' }}
        >
          Solo
        </button>

        <div className="flex-1" />

        <button
          onClick={onTrigger}
          disabled={!loaded}
          className="px-4 py-1.5 rounded text-[13px] font-bold uppercase tracking-widest transition-colors disabled:opacity-30"
          style={{ background: pad.color, color: '#000' }}
        >
          ▶ Preview
        </button>
      </div>

    </div>
  );
}
