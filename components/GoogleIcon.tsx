import React from 'react';

export const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        className={className} 
        viewBox="0 0 48 48" 
        xmlns="http://www.w3.org/2000/svg"
    >
        <path fill="#4285F4" d="M24 9.5c3.2 0 6.1 1.1 8.4 3.2l6.3-6.3C34.9 2.5 29.8 0 24 0 14.9 0 7.3 5.4 3 13.2l7.5 5.8C12.4 13.3 17.7 9.5 24 9.5z"></path>
        <path fill="#34A853" d="M46.2 25.4c0-1.7-.2-3.4-.5-5H24v9.3h12.5c-.5 3-2.1 5.6-4.6 7.3l7.3 5.7c4.3-4 6.9-10 6.9-17.3z"></path>
        <path fill="#FBBC05" d="M10.5 28.9c-.4-1.2-.6-2.5-.6-3.9s.2-2.7.6-3.9l-7.5-5.8C1.1 18.9 0 21.4 0 24s1.1 5.1 3 7.8l7.5-5.7z"></path>
        <path fill="#EA4335" d="M24 48c5.8 0 10.9-1.9 14.5-5.2l-7.3-5.7c-1.9 1.3-4.3 2-7.2 2-6.3 0-11.6-3.8-13.5-9L3 31.8C7.3 39.6 14.9 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);
