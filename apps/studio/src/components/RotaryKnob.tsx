import React, { useRef, useState, useEffect } from 'react';

interface RotaryKnobProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  color?: string;
  className?: string;
  size?: number;
}

export function RotaryKnob({
  label,
  min,
  max,
  step,
  value,
  onChange,
  color = '#FF5F00',
  className = '',
  size: sizeProp,
}: RotaryKnobProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Refs: stable across re-renders, never cause effect re-registration
  const startYRef      = useRef(0);
  const startValueRef  = useRef(value);
  const onChangeRef    = useRef(onChange);
  const minRef         = useRef(min);
  const maxRef         = useRef(max);
  const stepRef        = useRef(step);

  // Keep refs in sync with props each render (cheap, no effect needed)
  onChangeRef.current = onChange;
  minRef.current      = min;
  maxRef.current      = max;
  stepRef.current     = step;

  const RANGE = max - min;

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    startYRef.current     = e.clientY;
    startValueRef.current = value;   // snapshot value at drag start
    setIsDragging(true);
  };

  // Effect only re-runs when isDragging toggles — never due to changing callbacks
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY    = startYRef.current - e.clientY;
      // 180px of drag = full range — responsive but precise
      const rawChange = (deltaY / 180) * (maxRef.current - minRef.current);
      let newValue    = startValueRef.current + rawChange;
      newValue = Math.max(minRef.current, Math.min(maxRef.current, newValue));
      newValue = Math.round(newValue / stepRef.current) * stepRef.current;
      // Fix floating-point rounding (e.g. 0.30000000004 → 0.30)
      const decimals = stepRef.current.toString().split('.')[1]?.length ?? 0;
      newValue = parseFloat(newValue.toFixed(decimals));
      onChangeRef.current(newValue);
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup',   handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup',   handleMouseUp);
    };
  }, [isDragging]); // ← only isDragging; all others via refs

  // Visual
  const TOTAL_ROTATION = 270; // 270° sweep looks good on a single-turn knob
  const size      = sizeProp ?? 48;
  const centerX   = size / 2;
  const centerY   = size / 2;
  const radius    = size * 0.375;
  const trackWidth = 2;

  const valuePercent      = (value - min) / RANGE;
  const rotationAngle     = valuePercent * TOTAL_ROTATION;
  const startAngle        = -135; // starts at bottom-left
  const normalizedAngle   = startAngle + rotationAngle;
  const angleRad          = (normalizedAngle * Math.PI) / 180;
  const endX              = centerX + radius * Math.cos(angleRad);
  const endY              = centerY + radius * Math.sin(angleRad);
  const largeArc          = rotationAngle > 180 ? 1 : 0;

  // Arc from start position
  const startRad = (startAngle * Math.PI) / 180;
  const startX   = centerX + radius * Math.cos(startRad);
  const startY_svg = centerY + radius * Math.sin(startRad);
  const arcPath  = `M ${startX} ${startY_svg} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;

  return (
    <div className={`flex flex-col items-center gap-0.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="cursor-ns-resize select-none"
        onMouseDown={handleMouseDown}
        style={{
          filter: isDragging
            ? `drop-shadow(0 0 5px ${color}aa)`
            : `drop-shadow(0 0 2px ${color}44)`,
          transition: 'filter 0.1s ease',
        }}
      >
        {/* Track circle */}
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#242428" strokeWidth={trackWidth} />

        {/* Active arc */}
        <path d={arcPath} fill="none" stroke={color} strokeWidth={trackWidth + 0.5} strokeLinecap="round" />

        {/* Indicator line — rotates with value */}
        <line
          x1={centerX}
          y1={centerY - radius + 3}
          x2={centerX}
          y2={centerY - radius - 3}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          style={{
            transform: `rotate(${startAngle + rotationAngle}deg)`,
            transformOrigin: `${centerX}px ${centerY}px`,
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
          }}
        />
      </svg>

      {label && (
        <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#666' }}>
          {label}
        </span>
      )}
      {label && (
        <span className="text-[9px] font-mono leading-none" style={{ color }}>
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
        </span>
      )}
    </div>
  );
}
