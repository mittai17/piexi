import React from 'react';

interface PlexiLogoProps {
    className?: string;
    innerColor?: string;
}

export const PlexiLogo: React.FC<PlexiLogoProps> = ({ className, innerColor = '#121212' }) => (
    <svg 
        viewBox="0 0 100 100" 
        className={className}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A855F7" />
                <stop offset="1" stopColor="#D946EF" />
            </linearGradient>
        </defs>
        <path 
            d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" 
            fill="url(#logo-gradient)" 
        />
        <path 
            d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" 
            fill={innerColor}
        />
        <path 
            d="M50 20 L80 35 L80 65 L50 80 L20 65 L20 35 Z" 
            fill="url(#logo-gradient)"
        />
    </svg>
);
