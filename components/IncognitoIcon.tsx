import React from 'react';

export const IncognitoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        fill="currentColor" 
        viewBox="0 0 24 24"
    >
        <path d="M12 2C9.24 2 7 4.24 7 7c0 2.42 1.72 4.44 4 4.9V11H7v2h4v.9c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5s5-2.24 5-5c0-2.42-1.72-4.44-4-4.9V13h4v-2h-4v-.1c2.28-.46 4-2.48 4-4.9C17 4.24 14.76 2 12 2zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 10c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
    </svg>
);
