import React, { useRef, useState, useCallback } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { ArrangementBlock } from '../types';

const BAR_WIDTH = 80; // px per bar
const TRACK_HEIGHT = 40;

const PATTERN_COLORS = [
  '#FF5F00', '#22D3EE', '#A855F7', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

export function ArrangementPage() {
  const project = useProjectStore(s => s.project);
  const store = useProjectStore();
  const blocks = project.arrangementBlocks || [];
  const patterns = project.patterns;

  const [dragging, setDragging] = useState<{ id: string; offsetBar: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startLen: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const totalBars = Math.max(16, ...blocks.map(b => b.startBar + b.lengthBars)) + 4;

  const patternColorMap = Object.fromEntries(
    patterns.map((p, i) => [p.id, PATTERN_COLORS[i % PATTERN_COLORS.length]])
  );

  const updateBlock = useCallback((id: string, update: Partial<ArrangementBlock>) => {
    store.updateArrangementBlocks(blocks.map(b => b.id === id ? { ...b, ...update } : b));
  }, [blocks, store]);

  const deleteBlock = useCallback((id: string) => {
    store.updateArrangementBlocks(blocks.filter(b => b.id !== id));
  }, [blocks, store]);

  const addBlock = (patternId: string, startBar: number) => {
    const newBlock: ArrangementBlock = {
      id: `ab${Date.now()}`,
      patternId,
      startBar,
      lengthBars: 2,
    };
    store.updateArrangementBlocks([...blocks, newBlock]);
  };

  const getBarFromX = (clientX: number): number => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.floor((clientX - rect.left) / BAR_WIDTH));
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (e.target !== timelineRef.current) return; // Only click on empty space
    const bar = getBarFromX(e.clientX);
    if (patterns.length > 0) {
      addBlock(patterns[0].id, bar);
    }
  };

  const handleBlockMouseDown = (e: React.MouseEvent, block: ArrangementBlock) => {
    e.preventDefault();
    e.stopPropagation();
    const clickBar = getBarFromX(e.clientX);
    setDragging({ id: block.id, offsetBar: clickBar - block.startBar });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, block: ArrangementBlock) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({ id: block.id, startX: e.clientX, startLen: block.lengthBars });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const bar = getBarFromX(e.clientX);
      const newStart = Math.max(0, bar - dragging.offsetBar);
      updateBlock(dragging.id, { startBar: newStart });
    }
    if (resizing) {
      const dx = e.clientX - resizing.startX;
      const barsDelta = Math.round(dx / BAR_WIDTH);
      const newLen = Math.max(1, resizing.startLen + barsDelta);
      updateBlock(resizing.id, { lengthBars: newLen });
    }
  }, [dragging, resizing, updateBlock]);

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#111113] border border-[#242428] rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[#242428] bg-[#0d0d0f]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF5F00]">Arrangement</span>
        <span className="text-[9px] text-[#444]">Click empty space to add block · Drag to move · Right edge to resize · Del to remove</span>
      </div>

      {/* Pattern palette */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#242428] bg-[#0a0a0b] flex-wrap">
        <span className="text-[8px] uppercase tracking-widest text-[#333] mr-2">Patterns</span>
        {patterns.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold"
            style={{ background: patternColorMap[p.id] + '30', border: `1px solid ${patternColorMap[p.id]}`, color: patternColorMap[p.id] }}
          >
            <span>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Bar ruler */}
      <div className="flex overflow-x-auto bg-[#0a0a0b] border-b border-[#1a1a1e]" style={{ minHeight: '20px' }}>
        <div className="flex" style={{ width: `${totalBars * BAR_WIDTH}px`, flexShrink: 0 }}>
          {Array.from({ length: totalBars }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-start px-1 border-l border-[#1a1a1e] text-[8px] text-[#333]"
              style={{ width: BAR_WIDTH, flexShrink: 0 }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div
        className="flex-1 overflow-auto relative cursor-crosshair"
        style={{ minHeight: TRACK_HEIGHT + 40 }}
      >
        <div
          ref={timelineRef}
          className="relative"
          style={{ width: `${totalBars * BAR_WIDTH}px`, height: `${TRACK_HEIGHT * 2}px` }}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid lines */}
          {Array.from({ length: totalBars }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l"
              style={{ left: i * BAR_WIDTH, borderColor: i % 4 === 0 ? '#242428' : '#1a1a1e' }}
            />
          ))}

          {/* Blocks */}
          {blocks.map(block => {
            const pattern = patterns.find(p => p.id === block.patternId);
            const color = patternColorMap[block.patternId] || '#FF5F00';
            return (
              <div
                key={block.id}
                className="absolute top-2 rounded border cursor-grab select-none flex items-center"
                style={{
                  left: block.startBar * BAR_WIDTH,
                  width: block.lengthBars * BAR_WIDTH - 2,
                  height: TRACK_HEIGHT - 4,
                  background: color + '30',
                  borderColor: color,
                }}
                onMouseDown={e => handleBlockMouseDown(e, block)}
                onDoubleClick={() => {
                  // Cycle to next pattern
                  const idx = patterns.findIndex(p => p.id === block.patternId);
                  const next = patterns[(idx + 1) % patterns.length];
                  if (next) updateBlock(block.id, { patternId: next.id });
                }}
              >
                <span className="px-1.5 text-[8px] font-bold truncate flex-1" style={{ color }}>
                  {pattern?.name || 'Unknown'}
                </span>
                {/* Delete */}
                <button
                  className="px-1 text-[8px] opacity-50 hover:opacity-100 flex-shrink-0"
                  style={{ color }}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); deleteBlock(block.id); }}
                >
                  ×
                </button>
                {/* Resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                  onMouseDown={e => handleResizeMouseDown(e, block)}
                  style={{ background: color + '40' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
