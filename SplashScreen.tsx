import React from 'react';
import { PlexiLogo } from './components/PlexiLogo';

export const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full animate-fade-in">
      <PlexiLogo className="w-24 h-24 mb-4" />
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
      </div>
    </div>
  );
};
