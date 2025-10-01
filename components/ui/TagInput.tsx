


import React, { useState, useRef, KeyboardEvent } from 'react';
// FIX: Changed import path to point to .tsx file.
import { cn } from '../../lib/utils.tsx';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  options?: string[];
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const TagInput = ({ value, onChange, placeholder, disabled, options = [] }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(
    (option) =>
      option.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.map(v => v.toLowerCase()).includes(option.toLowerCase())
  );

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.find(t => t.toLowerCase() === trimmedTag.toLowerCase())) {
      onChange([...value, trimmedTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      e.preventDefault();
      handleRemoveTag(value[value.length - 1]);
    }
  };

  return (
    <div className="relative">
        <div 
            className={cn(
                "flex flex-wrap gap-2 items-center w-full p-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm",
                "focus-within:ring-2 focus-within:ring-ring focus-within:border-primary",
                disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && inputRef.current?.focus()}
        >
            {value.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-2.5 py-1 rounded-full">
                    {tag}
                    <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        disabled={disabled}
                        className="rounded-full hover:bg-primary/80 disabled:opacity-50"
                        aria-label={`Remove ${tag}`}
                    >
                        <XIcon className="h-3.5 w-3.5" />
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    if (!showSuggestions) setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={value.length === 0 ? placeholder : ''}
                disabled={disabled}
                className="flex-grow bg-transparent outline-none text-white sm:text-sm p-1 min-w-[100px]"
            />
        </div>
        {showSuggestions && filteredOptions.length > 0 && !disabled && (
            <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <ul className="py-1">
                    {filteredOptions.map((option) => (
                        <li
                            key={option}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleAddTag(option)}
                            className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                        >
                            {option}
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
  );
};

export default TagInput;