import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface AutosuggestInputProps {
  label: string;
  field: 'genres' | 'artistInspiration' | 'vocalLanguages';
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  context: {
    musicPrompt?: string;
    genres?: string[];
    artistInspiration?: string[];
    vocalLanguages?: string[];
    lyrics?: string;
  };
  maxItems?: number;
  disabled?: boolean;
}

export function AutosuggestInput({
  label,
  field,
  value,
  onChange,
  placeholder = 'Type to search...',
  context,
  maxItems = 5,
  disabled = false,
}: AutosuggestInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 1) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          input,
          context: {
            ...context,
            [field]: value, // Include current selections
          },
        }),
      });

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setShowDropdown(data.suggestions?.length > 0);
    } catch (error) {
      console.error('[Autosuggest] Fetch error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [field, context, value]);

  // Debounced input handler
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (inputValue.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(inputValue);
      }, 300); // 300ms debounce
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue, fetchSuggestions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter' && inputValue.trim()) {
        addValue(inputValue.trim());
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          addValue(suggestions[selectedIndex]);
        } else if (inputValue.trim()) {
          addValue(inputValue.trim());
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Add value (suggestion or manual input)
  const addValue = (newValue: string) => {
    if (!newValue || value.includes(newValue)) return;
    
    if (value.length >= maxItems) {
      alert(`Maximum ${maxItems} items allowed`);
      return;
    }

    onChange([...value, newValue]);
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Remove value
  const removeValue = (valueToRemove: string) => {
    onChange(value.filter((v) => v !== valueToRemove));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/90">
        {label}
      </label>

      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((item) => (
            <div
              key={item}
              className="flex items-center gap-1 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-300"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => removeValue(item)}
                className="hover:text-purple-100 transition-colors"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled || value.length >= maxItems}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Suggestions dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addValue(suggestion)}
                  className={`w-full px-4 py-3 text-left text-white hover:bg-purple-500/20 transition-colors ${
                    index === selectedIndex ? 'bg-purple-500/30' : ''
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <span>{suggestion}</span>
                    <span className="text-xs text-white/40">AI suggested</span>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-xs text-white/40">
              Press Enter to add • ↑↓ to navigate • Esc to close
            </div>
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-white/40">
        {value.length}/{maxItems} items • Type to get AI suggestions • Press Enter to add custom
      </p>
    </div>
  );
}
