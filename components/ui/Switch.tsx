


import React from 'react';
// FIX: Changed import path to point to .tsx file.
import { cn } from '../../lib/utils.tsx';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const handleToggle = () => {
      if (!props.disabled) {
        onCheckedChange(!checked);
      }
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        className={cn(
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-gray-700',
          className
        )}
        disabled={props.disabled}
      >
        <span
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleToggle}
          className="sr-only"
          {...props}
        />
      </button>
    );
  }
);
Switch.displayName = 'Switch';

export default Switch;