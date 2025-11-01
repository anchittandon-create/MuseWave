import React from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label className={cn('relative inline-flex items-center cursor-pointer', className)}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="sr-only"
          {...props}
        />
        <div className={cn(
          'relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 transition-colors',
          checked ? 'bg-blue-600' : 'bg-gray-200'
        )}>
          <div className={cn(
            'absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-transform',
            checked ? 'translate-x-full border-white' : ''
          )} />
        </div>
      </label>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch;