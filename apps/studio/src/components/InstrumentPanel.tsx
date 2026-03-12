import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

interface InstrumentPanelProps {
  id: string;
  title: string;
  poweredOn: boolean;
  onTogglePower: () => void;
  defaultExpanded?: boolean;
  color?: string;
  children: React.ReactNode;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  id,
  title,
  poweredOn,
  onTogglePower,
  defaultExpanded = true,
  color = '#FF5F00',
  children,
  onMoveUp,
  onMoveDown,
  isFirst = true,
  isLast = true,
}) => {
  const collapsed = useProjectStore(s => s.collapsedPanels[id] ?? !defaultExpanded);
  const setCollapsedPanel = useProjectStore(s => s.setCollapsedPanel);
  const expanded = !collapsed;

  return (
    <div
      className="border rounded-lg overflow-hidden mb-3"
      style={{ borderColor: expanded && poweredOn ? color + '40' : '#242428' }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        style={{ background: '#0d0d0f' }}
        onClick={() => setCollapsedPanel(id, !collapsed)}
      >
        <span className="text-[#555]">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span
          className="text-[15px] font-bold uppercase tracking-[0.2em] flex-1"
          style={{ color: poweredOn ? color : '#444' }}
        >
          {title}
        </span>
        {/* Reorder buttons */}
        {(onMoveUp || onMoveDown) && (
          <div className="flex flex-col gap-0.5 mr-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="w-4 h-3 flex items-center justify-center text-[9px] rounded transition-colors"
              style={isFirst ? { color: '#333', cursor: 'default' } : { color: '#8A8A94', hover: 'color: #F0F0F2' }}
              title="Move up"
            >▲</button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="w-4 h-3 flex items-center justify-center text-[9px] rounded transition-colors"
              style={isLast ? { color: '#333', cursor: 'default' } : { color: '#8A8A94' }}
              title="Move down"
            >▼</button>
          </div>
        )}
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
