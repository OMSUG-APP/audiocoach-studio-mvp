import React from 'react';

// Moved outside to prevent re-rendering issues
const ControlSlider = ({ label, value, min, max, step, onChange, colorClass, displayValue }: any) => (
  <div className="flex flex-col gap-1 mb-3">
    <div className="flex justify-between text-[10px] font-bold text-[#a1a1aa] uppercase tracking-wider">
      <span>{label}</span>
      <span>{displayValue}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value || 0}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full h-1.5 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer ${colorClass}`}
    />
  </div>
);

// Safe formatter that handles undefined values
const formatEq = (val: number) => {
  const safeVal = val || 0;
  return `${safeVal > 0 ? '+' : ''}${safeVal.toFixed(1)}`;
};

export function MixerView({ mixer, onMixerChange }: any) {
  
  // Safe fallbacks in case the initial project state is missing these
  const safeMixer = {
    drums: { vol: 0.8, low: 0, mid: 0, high: 0, ...mixer?.drums },
    bass: { vol: 0.8, low: 0, mid: 0, high: 0, ...mixer?.bass },
    master: { vol: 1, drive: 0, ...mixer?.master }
  };

  const updateChannel = (channel: 'drums' | 'bass', param: string, value: number) => {
    onMixerChange({
      ...safeMixer,
      [channel]: { ...safeMixer[channel], [param]: value }
    });
  };

  const updateMaster = (param: string, value: number) => {
    onMixerChange({
      ...safeMixer,
      master: { ...safeMixer.master, [param]: value }
    });
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xs font-bold text-[#a1a1aa] tracking-widest uppercase mb-6">Mixer</h2>

      {/* DRUMS CHANNEL */}
      <div className="mb-6 bg-[#0a0a0a] p-3 rounded border border-[#27272a]">
        <h3 className="text-sm font-bold text-[#f4f4f5] mb-4">Drums</h3>
        
        <ControlSlider
          label="Volume" value={safeMixer.drums.vol} min={0} max={1} step={0.01}
          onChange={(v: number) => updateChannel('drums', 'vol', v)}
          colorClass="accent-[#10b981]" displayValue={`${Math.round(safeMixer.drums.vol * 100)}%`}
        />
        
        <div className="grid grid-cols-3 gap-3 mt-4">
          <ControlSlider label="Low" value={safeMixer.drums.low} min={-12} max={12} step={0.1}
            onChange={(v: number) => updateChannel('drums', 'low', v)} colorClass="accent-[#10b981]" displayValue={formatEq(safeMixer.drums.low)} />
          <ControlSlider label="Mid" value={safeMixer.drums.mid} min={-12} max={12} step={0.1}
            onChange={(v: number) => updateChannel('drums', 'mid', v)} colorClass="accent-[#10b981]" displayValue={formatEq(safeMixer.drums.mid)} />
          <ControlSlider label="High" value={safeMixer.drums.high} min={-12} max={12} step={0.1}
            onChange={(v: number) => updateChannel('drums', 'high', v)} colorClass="accent-[#10b981]" displayValue={formatEq(safeMixer.drums.high)} />
        </div>
      </div>

      {/* BASS CHANNEL */}
      <div className="mb-6 bg-[#0a0a0a] p-3 rounded border border-[#27272a]">
        <h3 className="text-sm font-bold text-[#f4f4f5] mb-4">Bass</h3>
        
        <ControlSlider
          label="Volume" value={safeMixer.bass.vol} min={0} max={1} step={0.01}
          onChange={(v: number) => updateChannel('bass', 'vol', v)}
          colorClass="accent-[#f97316]" displayValue={`${Math.round(safeMixer.bass.vol * 100)}%`}
        />
        
        <div className="grid grid-cols-3 gap-3 mt-4">
          <ControlSlider label="Low" value={safeMixer.bass.low} min={-12} max={12} step={0.1}
            onChange={(v: number) => updateChannel('bass', 'low', v)} colorClass="accent-[#f97316]" displayValue={formatEq(safeMixer.bass.low)} />
          <ControlSlider label="Mid" value={safeMixer.bass.mid} min={-12} max={12} step={0.1}
            onChange={(v: number) => updateChannel('bass', 'mid', v)} colorClass="accent-[#f97316]" displayValue={formatEq(safeMixer.bass.mid)} />
          <ControlSlider label="High" value={safeMixer.bass.high} min={-12} max={12} step={0.1}
            onChange={(v: number) => updateChannel('bass', 'high', v)} colorClass="accent-[#f97316]" displayValue={formatEq(safeMixer.bass.high)} />
        </div>
      </div>

      <div className="flex-1" />

      {/* MASTER CHANNEL */}
      <div className="border-t border-[#27272a] pt-4">
        <h3 className="text-sm font-bold text-[#f4f4f5] mb-4 uppercase tracking-widest">Master</h3>
        <ControlSlider
          label="Volume" value={safeMixer.master.vol} min={0} max={1} step={0.01}
          onChange={(v: number) => updateMaster('vol', v)}
          colorClass="accent-white" displayValue={`${Math.round(safeMixer.master.vol * 100)}%`}
        />
        <ControlSlider
          label="Drive" value={safeMixer.master.drive} min={0} max={1} step={0.01}
          onChange={(v: number) => updateMaster('drive', v)}
          colorClass="accent-[#f43f5e]" displayValue={`${Math.round(safeMixer.master.drive * 100)}%`}
        />
      </div>
    </div>
  );
}