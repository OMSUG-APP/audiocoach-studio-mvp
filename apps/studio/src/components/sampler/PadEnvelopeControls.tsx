import React from 'react';
import { SamplerEnvelope } from '../../types';
import { RotaryKnob } from '../RotaryKnob';

interface PadEnvelopeControlsProps {
  envelope: SamplerEnvelope;
  color: string;
  onChange: (env: Partial<SamplerEnvelope>) => void;
}

function fmtPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function fmtTime(s: number): string {
  return s < 0.1 ? `${Math.round(s * 1000)}ms` : `${s.toFixed(2)}s`;
}

export function PadEnvelopeControls({ envelope, color, onChange }: PadEnvelopeControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[9px] font-bold text-[#8A8A94] uppercase tracking-widest">Envelope</span>
      <div className="flex gap-4 justify-around">
        <RotaryKnob
          label="START"
          min={0} max={0.999} step={0.001}
          value={envelope.start}
          onChange={v => onChange({ start: Math.min(v, envelope.end - 0.001) })}
          color={color}
        />
        <RotaryKnob
          label="END"
          min={0.001} max={1} step={0.001}
          value={envelope.end}
          onChange={v => onChange({ end: Math.max(v, envelope.start + 0.001) })}
          color={color}
        />
        <RotaryKnob
          label="LENGTH"
          min={0} max={1} step={0.01}
          value={envelope.length}
          onChange={v => onChange({ length: v })}
          color={color}
        />
        <RotaryKnob
          label="ENVELOPE"
          min={0.005} max={4.0} step={0.005}
          value={envelope.envelope}
          onChange={v => onChange({ envelope: v })}
          color={color}
        />
      </div>
      <div className="flex gap-4 justify-around">
        <span className="text-[8px] font-mono text-center w-12" style={{ color }}>{fmtPct(envelope.start)}</span>
        <span className="text-[8px] font-mono text-center w-12" style={{ color }}>{fmtPct(envelope.end)}</span>
        <span className="text-[8px] font-mono text-center w-12" style={{ color }}>{fmtPct(envelope.length)}</span>
        <span className="text-[8px] font-mono text-center w-12" style={{ color }}>{fmtTime(envelope.envelope)}</span>
      </div>
    </div>
  );
}
