import React from 'react';
import { Source } from '../types';

interface SourceLinkProps {
  source: Source;
  rank: number;
  onClick: () => void;
  onPrefetch: () => void;
}

export const SourceLink: React.FC<SourceLinkProps> = ({ source, rank, onClick, onPrefetch }) => {
  const hostname = new URL(source.uri).hostname;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onPrefetch}
      className="block w-full text-left bg-gray-700/50 p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 group"
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-gray-900/50 border border-gray-600 rounded-full text-xs font-bold text-purple-400">
          {rank}
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-medium text-gray-200 truncate group-hover:text-purple-400">{source.title}</p>
          <p className="text-xs text-gray-400 truncate">{hostname}</p>
        </div>
      </div>
    </button>
  );
};