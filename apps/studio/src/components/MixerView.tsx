import React from 'react';
import { RotaryKnob } from './RotaryKnob';

// ─── Shared sub-components ────────────────────────────────────────────────────

const SendSlider = ({ label, value, min = 0, max = 1, step = 0.01, color, onChange, unit = '' }: {
  label: string; value: number; min?: number; max?: number; step?: number;
  color: string; onChange: (v: number) => void; unit?: string;
}) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className="text-[9px] text-[#8A8A94] font-bold tracking-widest w-10 flex-shrink-0">{label}</span>
    <div className="flex-1 min-w-0 overflow-hidden">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer block"
        style={{ accentColor: color }}
      />
    </div>
    <span className="text-[9px] font-mono text-right w-8 flex-shrink-0" style={{ color }}>
      {unit === 'ms'  ? `${Math.round(value * 1000)}ms`
       : unit === 's' ? `${value.toFixed(2)}s`
       : unit === 'dB'? `${value > 0 ? '+' : ''}${value.toFixed(1)}`
       : `${Math.round(value * 100)}%`}
    </span>
  </div>
);

// ─── Sequencer channel rack (Drums / Bass / Synth) ────────────────────────────

const ChannelRack = ({ title, color, section, data, updateMixer }: any) => (
  <div className="bg-[#0A0A0B] p-3 rounded border border-[#242428] flex flex-col">
    <div className="text-[10px] font-bold mb-3 uppercase tracking-widest" style={{ color }}>{title}</div>
    <div className="flex items-stretch gap-4">

      {/* Volume fader */}
      <div className="flex flex-col items-center w-8 border-r border-[#242428] pr-4 flex-shrink-0 h-36" style={{ contain: 'layout' }}>
        <input
          type="range" min="0" max="1.5" step="0.01" value={data.volume}
          onChange={e => updateMixer(section, 'volume', parseFloat(e.target.value))}
          className="w-1 h-full bg-[#1a1a1e] rounded-lg cursor-pointer flex-shrink-0"
          style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: color }}
        />
        <span className="text-[9px] text-[#8A8A94] mt-2 uppercase tracking-widest">Vol</span>
      </div>

      {/* EQ + sends */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {/* 3-band EQ */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-[#8A8A94] font-bold tracking-widest">EQ</span>
          <div className="flex gap-2 justify-around">
            <RotaryKnob label="HI"  min={-12} max={12} step={0.1} value={data.eq.high} onChange={v => updateMixer(section, 'eq', v, 'high')} color={color} />
            <RotaryKnob label="MID" min={-12} max={12} step={0.1} value={data.eq.mid}  onChange={v => updateMixer(section, 'eq', v, 'mid')}  color={color} />
            <RotaryKnob label="LOW" min={-12} max={12} step={0.1} value={data.eq.low}  onChange={v => updateMixer(section, 'eq', v, 'low')}  color={color} />
          </div>
        </div>

        <div className="border-t border-[#242428]" />

        {/* Effect sends */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] text-[#8A8A94] font-bold tracking-widest">SENDS</span>
          <SendSlider label="REV" value={data.reverb ?? 0}              color={color} onChange={v => updateMixer(section, 'reverb', v)} />
          <SendSlider label="DLY" value={data.delay?.mix ?? 0}          color={color} onChange={v => updateMixer(section, 'delay', v, 'mix')} />
          <SendSlider label="DRV" value={data.driveSend ?? 0}           color={color} onChange={v => updateMixer(section, 'driveSend', v)} />
        </div>

      </div>
    </div>
  </div>
);

// ─── Sampler channel rack (own FX, no drive send) ─────────────────────────────

const SamplerChannelRack = ({ data, updateMixer }: any) => {
  const color = '#22d3ee';
  return (
    <div className="bg-[#0A0A0B] p-3 rounded border border-[#242428] flex flex-col">
      <div className="text-[10px] font-bold mb-3 uppercase tracking-widest" style={{ color }}>Sampler</div>
      <div className="flex items-stretch gap-4">

        {/* Volume fader */}
        <div className="flex flex-col items-center w-8 border-r border-[#242428] pr-4 flex-shrink-0 h-36" style={{ contain: 'layout' }}>
          <input
            type="range" min="0" max="1.5" step="0.01" value={data.volume}
            onChange={e => updateMixer('sampler', 'volume', parseFloat(e.target.value))}
            className="w-1 h-full bg-[#1a1a1e] rounded-lg cursor-pointer flex-shrink-0"
            style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: color }}
          />
          <span className="text-[9px] text-[#8A8A94] mt-2 uppercase tracking-widest">Vol</span>
        </div>

        {/* EQ + sends */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-[#8A8A94] font-bold tracking-widest">EQ</span>
            <div className="flex gap-2 justify-around">
              <RotaryKnob label="HI"  min={-12} max={12} step={0.1} value={data.eq.high} onChange={v => updateMixer('sampler', 'eq', v, 'high')} color={color} />
              <RotaryKnob label="MID" min={-12} max={12} step={0.1} value={data.eq.mid}  onChange={v => updateMixer('sampler', 'eq', v, 'mid')}  color={color} />
              <RotaryKnob label="LOW" min={-12} max={12} step={0.1} value={data.eq.low}  onChange={v => updateMixer('sampler', 'eq', v, 'low')}  color={color} />
            </div>
          </div>

          <div className="border-t border-[#242428]" />

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] text-[#8A8A94] font-bold tracking-widest">SENDS</span>
            <SendSlider label="REV" value={data.reverb ?? 0}     color={color} onChange={v => updateMixer('sampler', 'reverb', v)} />
            <SendSlider label="DLY" value={data.delay?.mix ?? 0} color={color} onChange={v => updateMixer('sampler', 'delay', v, 'mix')} />
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Shared effects panel ─────────────────────────────────────────────────────

const EffectsPanel = ({ effects, updateEffects }: any) => {
  const fx = effects || {
    reverb: { return: 0.8 },
    delay:  { time: 0.3, feedback: 0.3, return: 0.8 },
    drive:  { amount: 0, return: 0.8 },
  };
  return (
    <div className="bg-[#0A0A0B] p-3 rounded border border-[#242428] flex flex-col gap-3">
      <div className="text-[10px] font-bold text-[#FF5F00] uppercase tracking-widest">Effects</div>

      {/* Reverb */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-bold text-[#8A8A94] tracking-widest">REVERB</span>
        <SendSlider label="RETURN" value={fx.reverb?.return ?? 0.8} color="#60a5fa" onChange={v => updateEffects('reverb', 'return', v)} />
      </div>

      <div className="border-t border-[#242428]" />

      {/* Delay */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-bold text-[#8A8A94] tracking-widest">DELAY</span>
        <SendSlider label="TIME"   value={fx.delay?.time     ?? 0.3} min={0.05} max={1.0} step={0.01} unit="s"  color="#a78bfa" onChange={v => updateEffects('delay', 'time', v)} />
        <SendSlider label="FDBK"   value={fx.delay?.feedback ?? 0.3} min={0}    max={0.95} step={0.01}            color="#a78bfa" onChange={v => updateEffects('delay', 'feedback', v)} />
        <SendSlider label="RETURN" value={fx.delay?.return   ?? 0.8} color="#a78bfa" onChange={v => updateEffects('delay', 'return', v)} />
      </div>

      <div className="border-t border-[#242428]" />

      {/* Drive */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-bold text-[#8A8A94] tracking-widest">DRIVE</span>
        <SendSlider label="AMOUNT" value={fx.drive?.amount ?? 0}   color="#ef4444" onChange={v => updateEffects('drive', 'amount', v)} />
        <SendSlider label="RETURN" value={fx.drive?.return ?? 0.8} color="#ef4444" onChange={v => updateEffects('drive', 'return', v)} />
      </div>
    </div>
  );
};

// ─── Main MixerView ───────────────────────────────────────────────────────────

export function MixerView({ mixer, onMixerChange }: any) {
  const updateMixer = (section: string, param: string, value: number, subParam?: string) => {
    const newMixer = JSON.parse(JSON.stringify(mixer));

    ['drums', 'bass', 'synth', 'sampler'].forEach(ch => {
      if (!newMixer[ch]) newMixer[ch] = { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } };
      if (newMixer[ch].reverb === undefined) newMixer[ch].reverb = 0;
      if (!newMixer[ch].delay) newMixer[ch].delay = { time: 0.3, feedback: 0.3, mix: 0 };
    });
    if (!newMixer.effects) newMixer.effects = {
      reverb: { return: 0.8 },
      delay:  { time: 0.3, feedback: 0.3, return: 0.8 },
      drive:  { amount: 0, return: 0.8 },
    };
    if (!newMixer.master) newMixer.master = { volume: 1.0, compressor: { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 } };
    if (!newMixer.master.compressor) newMixer.master.compressor = { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 };

    if (subParam) newMixer[section][param][subParam] = value;
    else newMixer[section][param] = value;
    onMixerChange(newMixer);
  };

  const updateEffects = (effect: string, param: string, value: number) => {
    const newMixer = JSON.parse(JSON.stringify(mixer));
    if (!newMixer.effects) newMixer.effects = {};
    if (!newMixer.effects[effect]) newMixer.effects[effect] = {};
    newMixer.effects[effect][param] = value;
    onMixerChange(newMixer);
  };

  const m = mixer || {};

  const getChannel = (name: string, defaultVol: number) => {
    const ch = m[name] || { volume: defaultVol, eq: { low: 0, mid: 0, high: 0 } };
    return {
      ...ch,
      reverb:    ch.reverb    ?? 0,
      driveSend: ch.driveSend ?? 0,
      delay: ch.delay || { time: 0.3, feedback: 0.3, mix: 0 },
    };
  };

  const drums   = getChannel('drums', 0.8);
  const bass    = getChannel('bass', 0.8);
  const synth   = getChannel('synth', 0.7);
  const sampler = getChannel('sampler', 0.8);
  const master  = m.master || { volume: 1.0, compressor: { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 } };
  const comp    = master.compressor || { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 };

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-bold text-[#FF5F00] tracking-widest uppercase mb-4 border-b border-[#242428] pb-2">
        Mixer Console
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4">

        <ChannelRack title="Drums" color="#10b981" section="drums" data={drums} updateMixer={updateMixer} />
        <ChannelRack title="Bass"  color="#FF5F00" section="bass"  data={bass}  updateMixer={updateMixer} />
        <ChannelRack title="Synth" color="#8b5cf6" section="synth" data={synth} updateMixer={updateMixer} />
        <SamplerChannelRack data={sampler} updateMixer={updateMixer} />

        {/* Shared Effects */}
        <EffectsPanel effects={m.effects} updateEffects={updateEffects} />

        {/* Master Bus */}
        <div
          className="bg-[#0A0A0B] p-3 rounded border flex flex-col mt-1"
          style={{ borderColor: 'rgba(255, 95, 0, 0.3)', boxShadow: '0 0 12px rgba(255, 95, 0, 0.08)' }}
        >
          <div className="text-[10px] font-bold text-[#FF5F00] mb-3 uppercase tracking-widest">Master Bus</div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center w-8 border-r border-[#242428] pr-4 flex-shrink-0" style={{ contain: 'layout' }}>
              <div className="h-16">
                <input
                  type="range" min="0" max="1.5" step="0.01" value={master.volume}
                  onChange={e => updateMixer('master', 'volume', parseFloat(e.target.value))}
                  className="w-1 h-full bg-[#1a1a1e] rounded-lg cursor-pointer flex-shrink-0"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: '#FF5F00' }}
                />
              </div>
              <span className="text-[9px] text-[#FF5F00] mt-2 uppercase font-bold tracking-widest">Vol</span>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <span className="text-[9px] text-[#8A8A94] font-bold tracking-widest">COMP</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#8A8A94] w-12 tracking-widest">THRESH</span>
                <div className="flex-1"><input type="range" min="-60" max="0" step="0.5" value={comp.threshold} onChange={e => updateMixer('master', 'compressor', parseFloat(e.target.value), 'threshold')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} /></div>
                <span className="text-[9px] text-[#8A8A94] w-10 text-right">{comp.threshold}dB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#8A8A94] w-12 tracking-widest">RATIO</span>
                <div className="flex-1"><input type="range" min="1" max="20" step="0.5" value={comp.ratio} onChange={e => updateMixer('master', 'compressor', parseFloat(e.target.value), 'ratio')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} /></div>
                <span className="text-[9px] text-[#8A8A94] w-10 text-right">{comp.ratio}:1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#8A8A94] w-12 tracking-widest">ATTACK</span>
                <div className="flex-1"><input type="range" min="0" max="0.5" step="0.001" value={comp.attack} onChange={e => updateMixer('master', 'compressor', parseFloat(e.target.value), 'attack')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} /></div>
                <span className="text-[9px] text-[#8A8A94] w-10 text-right">{Math.round(comp.attack * 1000)}ms</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#8A8A94] w-12 tracking-widest">RELEASE</span>
                <div className="flex-1"><input type="range" min="0.01" max="1" step="0.01" value={comp.release} onChange={e => updateMixer('master', 'compressor', parseFloat(e.target.value), 'release')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} /></div>
                <span className="text-[9px] text-[#8A8A94] w-10 text-right">{Math.round(comp.release * 1000)}ms</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
