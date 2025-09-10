
import React from 'react';

export const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
        <div className="relative flex items-center justify-center">
            <div className="absolute h-16 w-16 bg-purple-500/30 rounded-full animate-ping"></div>
            <div className="absolute h-8 w-8 bg-purple-500/50 rounded-full animate-ping [animation-delay:0.2s]"></div>
            <div className="h-4 w-4 bg-purple-400 rounded-full"></div>
        </div>
        <p className="text-gray-400">Plexi is browsing the web for you...</p>
    </div>
  );
};
