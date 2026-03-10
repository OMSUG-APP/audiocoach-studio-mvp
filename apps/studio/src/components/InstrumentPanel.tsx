import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface InstrumentPanelProps {
  title: string;
  poweredOn: boolean;
  onTogglePower: () => void;
  defaultExpanded?: boolean;
  color?: string;
  children: React.ReactNode;
}

export const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  title,
  poweredOn,
  onTogglePower,
  defaultExpanded = true,
  color = '#FF5F00',
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className="border rounded-lg overflow-hidden mb-3"
      style={{ borderColor: expanded && poweredOn ? color + '40' : '#242428' }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        style={{ background: '#0d0d0f' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[#555]">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.2em] flex-1"
          style={{ color: poweredOn ? color : '#444' }}
        >
          {title}
        </span>
        {/* Power LED */}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePower(); }}
          className="w-4 h-4 rounded-full border-2 transition-all"
          style={
            poweredOn
              ? { background: color, borderColor: color, boxShadow: `0 0 6px ${color}80` }
              : { background: 'transparent', borderColor: '#333' }
          }
          title={poweredOn ? 'Power off' : 'Power on'}
        />
      </div>

      {/* Content */}
      {expanded && (
        <div style={{ opacity: poweredOn ? 1 : 0.35, pointerEvents: poweredOn ? 'auto' : 'none' }}>
          {children}
        </div>
      )}
    </div>
  );
};
