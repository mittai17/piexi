import React from 'react';

export const TabsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        className={className}
        viewBox="0 0 24 24"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="5" width="15" height="13" rx="2" />
        <path d="M21 9v10a2 2 0 0 1-2 2H6" />
    </svg>
);
