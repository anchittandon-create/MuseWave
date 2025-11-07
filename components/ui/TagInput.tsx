import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export interface TagInputProps {
  value?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  options?: string[];
  disabled?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Add tags...',
  className,
  options = [],
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const safeTags = Array.isArray(value) ? value : [];

  const filteredSuggestions = options.filter(
    (option) =>
      option.toLowerCase().includes(inputValue.toLowerCase()) &&
      !safeTags.includes(option)
  );

  useEffect(() => {
    if (inputValue.length > 0 && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
      setHighlightedIndex(0);
    } else {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  }, [inputValue, filteredSuggestions.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !safeTags.includes(trimmedTag)) {
      onChange([...safeTags, trimmedTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && safeTags.length > 0) {
      onChange(safeTags.slice(0, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputFocus = () => {
    if (inputValue.length > 0 && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(safeTags.filter(tag => tag !== tagToRemove));
  };

  const showPlaceholder = safeTags.length === 0 && inputValue.trim().length === 0;
  const activePlaceholder = showPlaceholder ? placeholder : '';

  return (
    <div className="relative" ref={containerRef}>
      <div className={cn(
        'flex flex-wrap gap-2 p-2 border border-input rounded-md bg-background min-h-[2.5rem] focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}>
        {safeTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md animate-in fade-in zoom-in duration-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => !disabled && removeTag(tag)}
              disabled={disabled}
              className="hover:bg-primary/80 rounded-full p-0.5 transition-colors disabled:cursor-not-allowed"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          placeholder={activePlaceholder}
          disabled={disabled}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Tag input"
          aria-autocomplete="list"
          aria-controls="tag-suggestions"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          id="tag-suggestions"
          role="listbox"
          aria-label="Suggestion list"
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="p-2 text-xs text-gray-400 border-b border-gray-700">
            Suggestions ({filteredSuggestions.length})
          </div>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex ? "true" : "false"}
              onClick={() => addTag(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer',
                index === highlightedIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-300 hover:bg-gray-700'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1">{suggestion}</span>
                {index === highlightedIndex && (
                  <span className="text-xs opacity-70">↵ Enter</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="mt-1 text-xs text-gray-500">
          Type to search, press Enter or comma to add, Backspace to remove last tag
        </div>
      )}
    </div>
  );
};

export default TagInput;
