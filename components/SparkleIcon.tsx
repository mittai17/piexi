import React from 'react';

export const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        fill="currentColor" 
        viewBox="0 0 24 24"
    >
        <path d="M12 2.75l.93 1.9l2.09.3l-1.51 1.48l.36 2.08l-1.87-.98l-1.87.98l.36-2.08l-1.51-1.48l2.09-.3L12 2.75zM19.5 9.25l-.93-1.9l-2.09-.3l1.51-1.48l-.36-2.08l1.87.98l1.87-.98l-.36 2.08l1.51 1.48l-2.09.3l-.93 1.9zM19.5 14.75l.93 1.9l2.09.3l-1.51 1.48l.36 2.08l-1.87-.98l-1.87.98l.36-2.08l-1.51-1.48l2.09-.3l.93-1.9zM4.5 9.25l-.93-1.9l-2.09-.3l1.51-1.48l-.36-2.08l1.87.98l1.87-.98l-.36 2.08l1.51 1.48l-2.09.3l-.93 1.9z" />
    </svg>
);