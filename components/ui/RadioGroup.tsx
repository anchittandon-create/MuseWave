


import React from 'react';
// FIX: Changed import path to point to .tsx file.
import { cn } from '../../lib/utils';

interface RadioGroupProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const RadioGroupContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

export const RadioGroup = ({ children, value, onValueChange, className }: RadioGroupProps) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={cn('grid gap-2', className)}>{children}</div>
    </RadioGroupContext.Provider>
  );
};

interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

export const RadioGroupItem = ({ value, children, ...props }: RadioGroupItemProps) => {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error('RadioGroupItem must be used within a RadioGroup');
  }

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        'flex items-center space-x-2 rounded-md border p-4 transition-colors',
        isSelected ? 'border-indigo-500 bg-gray-800' : 'border-gray-700 hover:bg-gray-800/50'
      )}
      {...props}
    >
      <div className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-400">
        {isSelected && <div className="h-2 w-2 rounded-full bg-indigo-500" />}
      </div>
      <div>{children}</div>
    </button>
  );
};