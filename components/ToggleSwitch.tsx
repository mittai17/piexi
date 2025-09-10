import React from 'react';

interface ToggleSwitchProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, enabled, onChange }) => {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-gray-300 select-none">{label}</span>
      <div className="relative">
        <input 
            type="checkbox" 
            className="sr-only" 
            checked={enabled} 
            onChange={(e) => onChange(e.target.checked)} 
        />
        <div className={`block w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-600'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enabled ? 'transform translate-x-6' : ''}`}></div>
      </div>
    </label>
  );
};
