
import React, { useState, useEffect } from 'react';

const messages = [
  'Searching the web for you...',
  'Analyzing top results...',
  'Synthesizing information...',
  'Citing sources...',
  'Composing your answer...',
];

export const LoadingIndicator: React.FC = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
        <div className="relative flex items-center justify-center">
            <div className="absolute h-16 w-16 bg-purple-500/30 rounded-full animate-ping"></div>
            <div className="absolute h-8 w-8 bg-purple-500/50 rounded-full animate-ping [animation-delay:0.2s]"></div>
            <div className="h-4 w-4 bg-purple-400 rounded-full"></div>
        </div>
        <div 
          className="h-6 relative w-full text-center"
          aria-live="polite"
          aria-label="Loading status"
        >
            {messages.map((message, index) => (
                <p
                    key={index}
                    className={`absolute inset-0 text-gray-400 transition-opacity duration-700 ease-in-out ${currentMessageIndex === index ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden={currentMessageIndex !== index}
                >
                    {message}
                </p>
            ))}
        </div>
    </div>
  );
};
