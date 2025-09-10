import React, { useState, useRef, useEffect } from 'react';
import { SearchFocus } from '../types';
import { AllIcon } from './AllIcon';
import { AcademicIcon } from './AcademicIcon';
import { WritingIcon } from './WritingIcon';
import { YouTubeIcon } from './YouTubeIcon';
import { RedditIcon } from './RedditIcon';
import { ChevronDownIcon } from './ChevronDownIcon';

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  searchFocus: SearchFocus;
  setSearchFocus: (focus: SearchFocus) => void;
  hasSearched: boolean;
}

const focusOptions: { id: SearchFocus; label: string; icon: React.FC<{className?: string}> }[] = [
    { id: 'all', label: 'All', icon: AllIcon },
    { id: 'academic', label: 'Academic', icon: AcademicIcon },
    { id: 'writing', label: 'Writing', icon: WritingIcon },
    { id: 'youtube', label: 'YouTube', icon: YouTubeIcon },
    { id: 'reddit', label: 'Reddit', icon: RedditIcon },
];

export const SearchBar: React.FC<SearchBarProps> = ({ query, setQuery, onSearch, isLoading, searchFocus, setSearchFocus, hasSearched }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      onSearch();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectFocus = (focus: SearchFocus) => {
    setSearchFocus(focus);
    setIsDropdownOpen(false);
  };

  const isSearchDisabled = isLoading || !query.trim();
  const CurrentFocusIcon = focusOptions.find(f => f.id === searchFocus)?.icon || AllIcon;
  const currentFocusLabel = focusOptions.find(f => f.id === searchFocus)?.label || 'All';

  return (
    <div className={`relative flex items-center w-full rounded-full transition-all duration-300 border border-gray-700 bg-gray-900/60 backdrop-blur-md shadow-2xl ${isFocused ? 'ring-2 ring-purple-600 ring-offset-2 ring-offset-gray-900' : ''}`}>
        {/* Focus Dropdown Button */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 pl-4 pr-3 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700/50 rounded-l-full"
          >
            <CurrentFocusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">{currentFocusLabel}</span>
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          </button>
          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute bottom-full mb-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl animate-fade-in-up-fast z-20">
              <p className="px-4 py-2 text-xs text-gray-500 font-semibold border-b border-gray-700">FOCUS</p>
              {focusOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleSelectFocus(option.id)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors ${searchFocus === option.id ? 'text-purple-400' : 'text-gray-300 hover:bg-purple-900/30'}`}
                >
                  <option.icon className="w-5 h-5" />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-6 bg-gray-700" />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={hasSearched ? 'Ask a follow-up...' : 'Ask anything...'}
          disabled={isLoading}
          className="w-full p-4 pl-4 pr-14 text-base sm:text-lg bg-transparent outline-none transition-all duration-300 text-white placeholder-gray-500"
        />

        <button
          onClick={onSearch}
          disabled={isSearchDisabled}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
          aria-label="Search"
        >
          {isLoading && hasSearched ? (
            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
    </div>
  );
};