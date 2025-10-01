


import React from 'react';
// FIX: Changed import path to point to .tsx file.
import { cn } from '../../lib/utils.tsx';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-gray-800', className)}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-indigo-500 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
);
Progress.displayName = 'Progress';

export default Progress;