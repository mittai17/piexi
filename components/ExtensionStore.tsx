import React from 'react';
import { Extension, ExtensionID } from '../types';
import { CloseIcon } from './CloseIcon';
import { PlexiLogo } from './PlexiLogo';
import { NightShiftIcon } from './NightShiftIcon';
import { SummarizeIcon } from './SummarizeIcon';

interface ExtensionStoreProps {
  isOpen: boolean;
  onClose: () => void;
  extensions: Extension[];
  installedIds: ExtensionID[];
  onInstall: (id: ExtensionID) => void;
}

const extensionIcons: Record<ExtensionID, React.FC<{className?: string}>> = {
    'night-shift': NightShiftIcon,
    'ai-summarizer': SummarizeIcon
};


export const ExtensionStore: React.FC<ExtensionStoreProps> = ({ isOpen, onClose, extensions, installedIds, onInstall }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="relative bg-gray-900/80 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
         <div className="flex-shrink-0 flex items-center justify-between pb-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
                 <PlexiLogo className="w-8 h-8" />
                 <h1 className="text-2xl font-bold text-white">Extension Store</h1>
            </div>
            <button 
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Close"
            >
                <CloseIcon className="w-4 h-4" />
            </button>
         </div>

        <div className="flex-grow overflow-y-auto py-4 space-y-4">
            {extensions.map(ext => {
                const isInstalled = installedIds.includes(ext.id);
                const Icon = extensionIcons[ext.id];
                return (
                    <div key={ext.id} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex-shrink-0 p-3 bg-gray-700/50 rounded-lg">
                            <Icon className="w-8 h-8 text-purple-400" />
                        </div>
                        <div className="flex-grow">
                            <h2 className="font-bold text-lg text-white">{ext.name}</h2>
                            <p className="text-sm text-gray-400">{ext.description}</p>
                        </div>
                        <button
                            onClick={() => onInstall(ext.id)}
                            disabled={isInstalled}
                            className="px-4 py-2 font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {isInstalled ? 'Installed' : 'Install'}
                        </button>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};