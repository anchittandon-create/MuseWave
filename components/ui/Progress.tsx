


import React from 'react';
// FIX: Changed import path to point to .tsx file.
import { cn } from '../../lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary border border-border', className)}
      {...props}
    >
      <div
        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out shadow-lg"
        style={{ 
          width: `${Math.min(100, Math.max(0, value || 0))}%`,
          boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-foreground/70">
          {Math.round(value || 0)}%
        </span>
      </div>
    </div>
  )
);
Progress.displayName = 'Progress';

export default Progress;