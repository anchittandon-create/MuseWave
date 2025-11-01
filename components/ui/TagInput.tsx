import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export interface TagInputProps {
  value?: string[];  // Renamed from tags to match usage
  onChange: (tags: string[]) => void; // Renamed from onTagsChange
  placeholder?: string;
  className?: string;
  options?: string[]; // Added options prop that's being passed
  disabled?: boolean; // Added disabled prop that's being passed
}

const TagInput: React.FC<TagInputProps> = ({
  value = [], // Renamed from tags
  onChange, // Renamed from onTagsChange
  placeholder = 'Add tags...',
  className,
  options = [], // New prop
  disabled = false, // New prop
}) => {
  const [inputValue, setInputValue] = useState('');

  // Ensure value is always an array
  const safeTags = Array.isArray(value) ? value : [];

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !safeTags.includes(newTag)) {
        onChange([...safeTags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && safeTags.length > 0) {
      onChange(safeTags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(safeTags.filter(tag => tag !== tagToRemove));
  };

  const showPlaceholder = safeTags.length === 0 && inputValue.trim().length === 0;
  const activePlaceholder = showPlaceholder ? placeholder : '';

  return (
    <div className={cn(
      'flex flex-wrap gap-2 p-2 border border-input rounded-md bg-background min-h-[2.5rem]',
      className
    )}>
      {safeTags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:bg-primary/80 rounded-full p-0.5"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder={activePlaceholder}
        disabled={disabled}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm disabled:opacity-50"
      />
    </div>
  );
};

export default TagInput;
