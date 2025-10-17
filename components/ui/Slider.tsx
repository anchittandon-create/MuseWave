


import React, { useCallback, useEffect, useRef, useState } from 'react';
// FIX: Changed import path to point to .tsx file.
import { cn } from '../../lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

const Slider = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
}: SliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getValueFromX = useCallback((x: number) => {
    if (!sliderRef.current) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const range = max - min;
    const rawValue = min + percent * range;
    return Math.round(rawValue / step) * step;
  }, [min, max, step]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || disabled) return;
    const newValue = getValueFromX(e.clientX);
    if (newValue !== value[0]) {
      onValueChange([newValue]);
    }
  }, [isDragging, disabled, getValueFromX, value, onValueChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if(disabled) return;
    setIsDragging(true);
    const newValue = getValueFromX(e.clientX);
    onValueChange([newValue]);
  };

  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <div
      ref={sliderRef}
      onMouseDown={handleMouseDown}
      className={cn(
        'relative flex h-5 w-full touch-none select-none items-center',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-800">
        <div className="absolute h-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
      <div
        className="absolute block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ left: `calc(${percentage}% - 0.625rem)` }}
      />
    </div>
  );
};

export default Slider;