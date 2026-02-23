import React from 'react';

// 1. Moved ChannelRack OUTSIDE so React doesn't destroy it on every drag!
const ChannelRack = ({ title, color, section, data, updateMixer }: any) => (
  <div className="bg-[#0a0a0a] p-3 rounded border border-[#27272a] flex flex-col">
    <div className="text-[10px] font-bold mb-3 uppercase tracking-wider" style={{ color }}>{title}</div>
    <div className="flex items-stretch gap-4">
      
      {/* Volume Fader */}
      <div className="flex flex-col items-center w-8 border-r border-[#27272a] pr-4">
        <input type="range" min="0" max="1.5" step="0.01" value={data.volume} onChange={e => updateMixer(section, 'volume', parseFloat(e.target.value))} className="w-1 h-48 bg-[#1a1a1a] rounded-lg cursor-pointer" style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: color }} />
        <span className="text-[9px] text-[#a1a1aa] mt-2 uppercase">Vol</span>
      </div>

      {/* Parameters Column */}
      <div className="flex-1 flex flex-col gap-3 justify-center">
        
        {/* EQ Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2"><span className="text-[9px] text-[#a1a1aa] w-12 font-bold">EQ HI</span><input type="range" min="-12" max="12" step="0.1" value={data.eq.high} onChange={e => updateMixer(section, 'eq', parseFloat(e.target.value), 'high')} className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
          <div className="flex items-center gap-2"><span className="text-[9px] text-[#a1a1aa] w-12 font-bold">EQ MID</span><input type="range" min="-12" max="12" step="0.1" value={data.eq.mid} onChange={e => updateMixer(section, 'eq', parseFloat(e.target.value), 'mid')} className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
          <div className="flex items-center gap-2"><span className="text-[9px] text-[#a1a1aa] w-12 font-bold">EQ LOW</span><input type="range" min="-12" max="12" step="0.1" value={data.eq.low} onChange={e => updateMixer(section, 'eq', parseFloat(e.target.value), 'low')} className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#27272a] my-1"></div>

        {/* FX Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2"><span className="text-[9px] text-[#a1a1aa] w-12 font-bold">REVERB</span><input type="range" min="0" max="1" step="0.01" value={data.reverb} onChange={e => updateMixer(section, 'reverb', parseFloat(e.target.value))} className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
          <div className="flex items-center gap-2"><span className="text-[9px] text-[#a1a1aa] w-12 font-bold">D.TIME</span><input type="range" min="0.1" max="1.0" step="0.01" value={data.delay.time} onChange={e => updateMixer(section, 'delay', parseFloat(e.target.value), 'time')} className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
          <div className="flex items-center gap-2"><span className="text-[9px] text-[#a1a1aa] w-12 font-bold">D.FDBK</span><input type="range" min="0" max="0.9" step="0.01" value={data.delay.feedback} onChange={e => updateMixer(section, 'delay', parseFloat(e.target.value), 'feedback')} className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
          <div className="flex items-center gap-2"><span className="text-[9px] text-[#a1a1aa] w-12 font-bold">D.MIX</span><input type="range" min="0" max="1" step="0.01" value={data.delay.mix} onChange={e => updateMixer(section, 'delay', parseFloat(e.target.value), 'mix')} className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
        </div>

      </div>
    </div>
  </div>
);

export function MixerView({ mixer, onMixerChange }: any) {
  const updateMixer = (section: string, param: string, value: number, subParam?: string) => {
    const newMixer = JSON.parse(JSON.stringify(mixer));
    
    // Ensure default structures exist for all channels
    ['drums', 'bass', 'synth'].forEach(ch => {
      if (!newMixer[ch]) newMixer[ch] = { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } };
      if (newMixer[ch].reverb === undefined) newMixer[ch].reverb = 0;
      if (!newMixer[ch].delay) newMixer[ch].delay = { time: 0.3, feedback: 0.3, mix: 0 };
    });
    if (!newMixer.master) newMixer.master = { volume: 1.0, drive: 0 };

    if (subParam) newMixer[section][param][subParam] = value;
    else newMixer[section][param] = value;
    onMixerChange(newMixer);
  };

  const m = mixer || {};
  
  const getChannel = (name: string, defaultVol: number) => {
    const ch = m[name] || { volume: defaultVol, eq: { low: 0, mid: 0, high: 0 } };
    return {
      ...ch,
      reverb: ch.reverb || 0,
      delay: ch.delay || { time: 0.3, feedback: 0.3, mix: 0 }
    };
  };

  const drums = getChannel('drums', 0.8);
  const bass = getChannel('bass', 0.8);
  const synth = getChannel('synth', 0.7);
  const master = m.master || { volume: 1.0, drive: 0 };

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-bold text-[#f97316] tracking-widest uppercase mb-4 border-b border-[#27272a] pb-2">
        Mixer Console
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4 custom-scrollbar">
        
        {/* 2. Pass updateMixer down as a prop */}
        <ChannelRack title="Drums" color="#10b981" section="drums" data={drums} updateMixer={updateMixer} />
        <ChannelRack title="Bass" color="#f97316" section="bass" data={bass} updateMixer={updateMixer} />
        <ChannelRack title="Synth" color="#8b5cf6" section="synth" data={synth} updateMixer={updateMixer} />

        {/* MASTER RACK */}
        <div className="bg-[#1a1a1a] p-3 rounded border border-[#3f3f46] shadow-[0_0_15px_rgba(0,0,0,0.5)] flex flex-col mt-2">
          <div className="text-[10px] font-bold text-white mb-3 uppercase tracking-wider">Master Bus</div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center w-8 border-r border-[#3f3f46] pr-4">
              <input type="range" min="0" max="1.5" step="0.01" value={master.volume} onChange={e => updateMixer('master', 'volume', parseFloat(e.target.value))} className="w-1 h-16 bg-[#27272a] rounded-lg cursor-pointer accent-white" style={{ writingMode: 'vertical-lr', direction: 'rtl' }} />
              <span className="text-[9px] text-white mt-2 uppercase font-bold">Vol</span>
            </div>
            <div className="flex-1 flex flex-col gap-3 justify-center">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#ef4444] font-bold w-12">DRIVE</span>
                <input type="range" min="0" max="1" step="0.01" value={master.drive} onChange={e => updateMixer('master', 'drive', parseFloat(e.target.value))} className="flex-1 h-1 bg-[#27272a] rounded-lg cursor-pointer accent-[#ef4444]" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}