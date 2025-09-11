import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { AppMode, Bookmark, Folder, HistoryItem, TabSession, Extension, ExtensionID } from '../types';
import { HistoryIcon } from './HistoryIcon';
import { BookmarkSidebarIcon } from './BookmarkSidebarIcon';
import { InsightsIcon } from './InsightsIcon';
import { SettingsSidebarIcon } from './SettingsSidebarIcon';
import { generateSessionSummary } from '../services/geminiService';
import { ToggleSwitch } from './ToggleSwitch';
import { PlexiLogo } from './PlexiLogo';
import { CloseIcon } from './CloseIcon';
import { TabSpinner } from './TabSpinner';
import { TabsIcon } from './TabsIcon';
import { TrashIcon } from './TrashIcon';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { SparkleIcon } from './SparkleIcon';
import { ExtensionIcon } from './ExtensionIcon';

type SidebarView = 'tabs' | 'history' | 'bookmarks' | 'insights' | 'settings' | 'extensions';

interface UnifiedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // Tabs
  tabs: TabSession[];
  activeTabId: string | null;
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
  onSwitchTab: (tabId: string) => void;
  onRenameTab: (tabId: string, newTitle: string) => void;
  onReorderTabs: (draggedId: string, targetId: string) => void;
  generatingTitleTabId: string | null;
  onGenerateTabTitle: (tabId: string) => void;
  // History
  activeHistory: HistoryItem[];
  onHistoryItemClick: (index: number) => void;
  // Bookmarks
  bookmarks: Bookmark[];
  folders: Folder[];
  onAddFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveBookmark: (bookmarkId: string, folderId: string | null) => void;
  onDeleteBookmark: (id: string) => void;
  // Settings
  mode: AppMode;
  onToggleIncognito: () => void;
  onClearHistory: () => void;
  // Auth
  session: Session | null;
  onShowLogin: () => void;
  // Extensions
  availableExtensions: Extension[];
  installedExtensions: ExtensionID[];
  enabledExtensions: ExtensionID[];
  onToggleExtension: (id: ExtensionID, enabled: boolean) => void;
  onShowExtensionStore: () => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = (props) => {
  const [activeView, setActiveView] = useState<SidebarView>('tabs');
  const logoInnerColor = props.mode === 'incognito' ? '#202124' : '#121212';
  
  const views: SidebarView[] = ['tabs', 'history', 'bookmarks', 'extensions', 'insights', 'settings'];
  const currentViewIndex = views.indexOf(activeView);

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${props.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={props.onClose}
        aria-hidden="true"
      ></div>
      <div
        className={`fixed top-0 left-0 h-full w-full max-w-[300px] bg-gray-900/80 backdrop-blur-md border-r border-gray-700/50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${props.isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700/50">
            <div className="flex items-center gap-2 text-xl font-bold text-white">
                <PlexiLogo className="w-7 h-7" innerColor={logoInnerColor} />
                <span>Plexi</span>
            </div>
            <button 
                onClick={props.onClose}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Close sidebar"
            >
                <CloseIcon className="w-4 h-4" />
            </button>
        </header>
        
        <div className="relative flex-grow overflow-hidden">
            <div
                className={`absolute top-0 left-0 w-full h-full overflow-y-auto transition-all duration-300 ease-in-out ${activeView === 'tabs' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ transform: `translateX(${(0 - currentViewIndex) * 100}%)` }}
            >
                <TabsView {...props} />
            </div>
            <div
                className={`absolute top-0 left-0 w-full h-full overflow-y-auto transition-all duration-300 ease-in-out ${activeView === 'history' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ transform: `translateX(${(1 - currentViewIndex) * 100}%)` }}
            >
                <HistoryView history={props.activeHistory} onItemClick={props.onHistoryItemClick} />
            </div>
            <div
                className={`absolute top-0 left-0 w-full h-full overflow-y-auto transition-all duration-300 ease-in-out ${activeView === 'bookmarks' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ transform: `translateX(${(2 - currentViewIndex) * 100}%)` }}
            >
                <BookmarksView {...props} />
            </div>
             <div
                className={`absolute top-0 left-0 w-full h-full overflow-y-auto transition-all duration-300 ease-in-out ${activeView === 'extensions' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ transform: `translateX(${(3 - currentViewIndex) * 100}%)` }}
            >
                <ExtensionsView {...props} />
            </div>
            <div
                className={`absolute top-0 left-0 w-full h-full overflow-y-auto transition-all duration-300 ease-in-out ${activeView === 'insights' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ transform: `translateX(${(4 - currentViewIndex) * 100}%)` }}
            >
                <InsightsView history={props.activeHistory} isActive={activeView === 'insights'} />
            </div>
            <div
                className={`absolute top-0 left-0 w-full h-full overflow-y-auto transition-all duration-300 ease-in-out ${activeView === 'settings' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ transform: `translateX(${(5 - currentViewIndex) * 100}%)` }}
            >
                <SettingsView {...props} />
            </div>
        </div>
        
        <footer className="flex-shrink-0 grid grid-cols-3 gap-1 p-2 bg-black/20 border-t border-gray-800/50">
           <SidebarNavButton
                label="Tabs"
                icon={<TabsIcon className="w-6 h-6" />}
                isActive={activeView === 'tabs'}
                onClick={() => setActiveView('tabs')}
           />
           <SidebarNavButton
                label="History"
                icon={<HistoryIcon className="w-6 h-6" />}
                isActive={activeView === 'history'}
                onClick={() => setActiveView('history')}
           />
           <SidebarNavButton
                label="Bookmarks"
                icon={<BookmarkSidebarIcon className="w-6 h-6" />}
                isActive={activeView === 'bookmarks'}
                onClick={() => setActiveView('bookmarks')}
           />
           <SidebarNavButton
                label="Extensions"
                icon={<ExtensionIcon className="w-6 h-6" />}
                isActive={activeView === 'extensions'}
                onClick={() => setActiveView('extensions')}
           />
           <SidebarNavButton
                label="Insights"
                icon={<InsightsIcon className="w-6 h-6" />}
                isActive={activeView === 'insights'}
                onClick={() => setActiveView('insights')}
           />
           <SidebarNavButton
                label="Settings"
                icon={<SettingsSidebarIcon className="w-6 h-6" />}
                isActive={activeView === 'settings'}
                onClick={() => setActiveView('settings')}
           />
        </footer>
      </div>
    </>
  );
};


// --- Sub-Components for each sidebar view ---

const SidebarNavButton: React.FC<{label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg w-full h-16 transition-colors duration-200 ${isActive ? 'bg-purple-800/40 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
        aria-label={label}
        title={label}
    >
        {icon}
        <span className="text-xs mt-1">{label}</span>
    </button>
);

const TabsView: React.FC<Pick<UnifiedSidebarProps, 'tabs' | 'activeTabId' | 'onNewTab' | 'onCloseTab' | 'onSwitchTab'| 'onRenameTab' | 'onReorderTabs' | 'generatingTitleTabId' | 'onGenerateTabTitle'>> = (props) => {
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (renamingTabId && renameInputRef.current) {
          renameInputRef.current.focus();
          renameInputRef.current.select();
      }
    }, [renamingTabId]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
      e.dataTransfer.setData('text/plain', tabId);
      setDraggedTabId(tabId);
    };

    const handleDragEnd = () => {
        setDraggedTabId(null);
        setDropTargetId(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetTabId: string) => {
        e.preventDefault();
        if (draggedTabId && draggedTabId !== targetTabId) {
            setDropTargetId(targetTabId);
        }
    };

    const handleDragLeave = () => {
        setDropTargetId(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetTabId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== targetTabId) {
        props.onReorderTabs(draggedId, targetTabId);
      }
      setDraggedTabId(null);
      setDropTargetId(null);
    };
    
    const handleStartRename = (tab: TabSession) => {
      setRenamingTabId(tab.id);
      setRenameValue(tab.title);
    }

    const handleFinishRename = () => {
        if (renamingTabId && renameValue.trim()) {
            props.onRenameTab(renamingTabId, renameValue.trim());
        }
        setRenamingTabId(null);
    }
  
    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if(e.key === 'Enter') handleFinishRename();
        if(e.key === 'Escape') setRenamingTabId(null);
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow p-2 space-y-1">
                {props.tabs.map(tab => (
                    <div
                        key={tab.id}
                        draggable={!renamingTabId}
                        onDragStart={(e) => handleDragStart(e, tab.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, tab.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, tab.id)}
                        onClick={() => props.onSwitchTab(tab.id)}
                        onDoubleClick={() => handleStartRename(tab)}
                        className={`group flex items-center gap-2 w-full p-2 rounded-md cursor-pointer transition-all duration-200 ${ props.activeTabId === tab.id ? 'bg-purple-800/50 text-white' : 'text-gray-400 hover:bg-gray-700/50' } ${ draggedTabId === tab.id ? 'opacity-30' : ''} ${ dropTargetId === tab.id ? 'ring-2 ring-purple-500' : ''}`}
                        title={tab.title}
                    >
                        {tab.isLoading && <TabSpinner />}
                         {renamingTabId === tab.id ? (
                            <input
                                ref={renameInputRef}
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={handleFinishRename}
                                onKeyDown={handleRenameKeyDown}
                                className="bg-transparent outline-none ring-1 ring-purple-500 rounded px-1 text-sm w-full"
                            />
                        ) : (
                            <span className="truncate text-sm">{tab.title}</span>
                        )}
                        <div className="flex-grow" />
                        <div className="flex items-center">
                            {props.generatingTitleTabId === tab.id ? (
                                <TabSpinner />
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); props.onGenerateTabTitle(tab.id); }}
                                    disabled={tab.history.length === 0}
                                    className="p-1 rounded-full text-purple-400/70 hover:text-purple-300 hover:bg-gray-600/50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
                                    aria-label={`Generate AI title for ${tab.title}`}
                                    title="Generate AI title"
                                >
                                    <SparkleIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); props.onCloseTab(tab.id); }}
                            disabled={props.tabs.length <= 1}
                            className="p-1 rounded-full text-gray-500 hover:text-white hover:bg-gray-600/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`Close tab ${tab.title}`}
                        >
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="p-2">
                <button 
                    onClick={props.onNewTab}
                    className="w-full text-center p-2 bg-gray-700/50 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white font-semibold transition-colors"
                >
                    New Tab
                </button>
            </div>
        </div>
    )
}

const HistoryView: React.FC<{history: HistoryItem[], onItemClick: (index: number) => void}> = ({ history, onItemClick }) => (
    <>
        {history.length > 0 ? (
            <ul className="py-2">
                {history.slice().reverse().map((item, index) => (
                    <li key={item.id}>
                        <button 
                            onClick={() => onItemClick(history.length - 1 - index)}
                            className="w-full text-left px-4 py-3 text-gray-300 hover:bg-purple-800/20 hover:text-white transition-colors duration-200 truncate"
                        >
                            {item.query}
                        </button>
                    </li>
                ))}
            </ul>
        ) : (
            <div className="p-8 text-center text-gray-500">
                <p>Your search history for this tab will appear here.</p>
            </div>
        )}
    </>
);

const BookmarkItem: React.FC<{ bookmark: Bookmark, onDelete: (id: string) => void, onDragStart: (e: React.DragEvent, id: string) => void }> = ({ bookmark, onDelete, onDragStart }) => (
    <div
        draggable="true"
        onDragStart={(e) => onDragStart(e, bookmark.id)}
        className="flex items-center justify-between p-2 rounded-md text-sm text-gray-300 hover:bg-gray-700/50 group"
    >
        <span className="truncate">{bookmark.history_item.query}</span>
        <button
            onClick={() => onDelete(bookmark.id)}
            className="p-1 rounded-full text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete bookmark"
        >
            <TrashIcon className="w-4 h-4" />
        </button>
    </div>
);


const BookmarksView: React.FC<Pick<UnifiedSidebarProps, 'bookmarks' | 'folders' | 'onAddFolder' | 'onDeleteFolder' | 'onMoveBookmark' | 'onDeleteBookmark' | 'session' | 'onShowLogin'>> = (props) => {
    const [newFolderName, setNewFolderName] = useState('');
    const [draggedBookmarkId, setDraggedBookmarkId] = useState<string | null>(null);
    const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

    if (!props.session) {
        return (
            <div className="p-6 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                <BookmarkSidebarIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <h3 className="font-bold text-lg text-white mb-2">Save Your Discoveries</h3>
                <p className="text-sm mb-6">Sign in to bookmark your favorite answers and organize them into folders across all your devices.</p>
                <button
                    onClick={props.onShowLogin}
                    className="w-full px-4 py-2 font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Sign In / Sign Up
                </button>
            </div>
        );
    }

    const handleAddFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if(newFolderName.trim()){
            props.onAddFolder(newFolderName.trim());
            setNewFolderName('');
        }
    }

    const handleDeleteFolder = (folderId: string, folderName: string) => {
        if(window.confirm(`Are you sure you want to delete the "${folderName}" folder? All bookmarks inside will become uncategorized.`)){
            props.onDeleteFolder(folderId);
        }
    };
    
    const handleDeleteBookmark = (bookmarkId: string) => {
        if(window.confirm('Are you sure you want to delete this bookmark?')){
            props.onDeleteBookmark(bookmarkId);
        }
    };

    const handleDragStart = (e: React.DragEvent, bookmarkId: string) => {
        e.dataTransfer.setData('text/plain', bookmarkId);
        setDraggedBookmarkId(bookmarkId);
    };

    const handleDragEnd = () => {
        setDraggedBookmarkId(null);
        setDropTargetFolderId(null);
    };

    const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        const bookmarkId = e.dataTransfer.getData('text/plain');
        if (bookmarkId) {
            props.onMoveBookmark(bookmarkId, targetFolderId);
        }
        handleDragEnd();
    };

    const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        setDropTargetFolderId(folderId);
    };
    
    const handleDragLeave = () => {
        setDropTargetFolderId(null);
    };

    const bookmarksInFolders = useMemo(() => {
        return props.folders.map(folder => ({
            ...folder,
            bookmarks: props.bookmarks.filter(b => b.folder_id === folder.id)
        }));
    }, [props.bookmarks, props.folders]);

    const uncategorizedBookmarks = useMemo(() => props.bookmarks.filter(b => !b.folder_id), [props.bookmarks]);

    return (
        <div className="p-4 space-y-6">
            <form onSubmit={handleAddFolder} className="flex gap-2">
                <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name..."
                    className="flex-grow p-2 bg-gray-800 border border-gray-700 rounded-md focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
                <button type="submit" className="px-4 py-2 bg-purple-600 rounded-md hover:bg-purple-700 font-semibold">Add</button>
            </form>

            <div className="space-y-2">
                {bookmarksInFolders.map(folder => (
                    <details key={folder.id} open className="group">
                        <summary className={`flex items-center justify-between p-2 rounded-md font-semibold cursor-pointer transition-colors ${dropTargetFolderId === folder.id ? 'bg-purple-800/50' : ''}`}>
                            <span className="truncate">{folder.name} ({folder.bookmarks.length})</span>
                             <button
                                onClick={() => handleDeleteFolder(folder.id, folder.name)}
                                className="p-1 rounded-full text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Delete folder"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </summary>
                        <div
                            onDrop={(e) => handleDrop(e, folder.id)}
                            onDragOver={(e) => handleDragOver(e, folder.id)}
                            onDragLeave={handleDragLeave}
                            className={`pl-4 pt-2 pb-1 border-l-2 border-gray-700 ml-2 space-y-1 transition-colors ${dropTargetFolderId === folder.id ? 'border-purple-500' : ''}`}
                        >
                            {folder.bookmarks.length > 0 ? (
                                folder.bookmarks.map(bm => (
                                    <BookmarkItem key={bm.id} bookmark={bm} onDelete={handleDeleteBookmark} onDragStart={handleDragStart} />
                                ))
                            ) : (
                                <p className="text-xs text-gray-500 p-2">Drop bookmarks here</p>
                            )}
                        </div>
                    </details>
                ))}
                
                <div
                    onDrop={(e) => handleDrop(e, null)}
                    onDragOver={(e) => handleDragOver(e, null)}
                    onDragLeave={handleDragLeave}
                    className={`pt-4 rounded-md transition-colors ${dropTargetFolderId === null ? 'bg-purple-800/50' : ''}`}
                 >
                    <h3 className="font-semibold mb-2 p-2">Uncategorized ({uncategorizedBookmarks.length})</h3>
                    <div className="space-y-1 p-1">
                        {uncategorizedBookmarks.map(bm => (
                             <BookmarkItem key={bm.id} bookmark={bm} onDelete={handleDeleteBookmark} onDragStart={handleDragStart} />
                        ))}
                    </div>
                </div>
            </div>
             {props.bookmarks.length === 0 && <p className="text-center text-gray-500 pt-4">Your saved bookmarks will appear here.</p>}
        </div>
    );
};

const InsightsView: React.FC<{history: HistoryItem[], isActive: boolean}> = ({ history, isActive }) => {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const summarizedHistoryId = useRef<string | null>(null);

    useEffect(() => {
        const currentHistoryId = history.length > 0 ? history.map(h => h.id).join(',') : null;

        if (currentHistoryId !== summarizedHistoryId.current) {
            setSummary('');
            setError('');
        }
        
        if (isActive && history.length > 0 && currentHistoryId !== summarizedHistoryId.current && !isLoading) {
            const generate = async () => {
                setIsLoading(true);
                setError('');
                
                try {
                    const result = await generateSessionSummary(history);
                    setSummary(result);
                    summarizedHistoryId.current = currentHistoryId;
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to generate summary.');
                } finally {
                    setIsLoading(false);
                }
            };
            generate();
        }

    }, [isActive, history, isLoading]);

    const renderContent = () => {
        if (error) {
            return <p className="p-4 text-red-400 bg-red-900/20 rounded-lg animate-fade-in">{error}</p>;
        }
        if (summary) {
            return (
                <div className="p-4 bg-gray-800/50 rounded-lg animate-fade-in">
                    <h3 className="font-bold text-lg mb-2 text-purple-300">Session Summary</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{summary}</p>
                </div>
            );
        }
        if (history.length === 0) {
            return (
                <div className="p-8 text-center text-gray-500">
                    <p>Start a search to generate insights for this session.</p>
                </div>
            );
        }
        if (isActive) {
             return (
                <div className="flex flex-col items-center justify-center space-y-2 pt-8 animate-fade-in">
                    <TabSpinner />
                    <p className="text-gray-400 text-sm">Generating insights...</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-4 space-y-4 text-gray-300">
            <h2 className="text-lg font-bold">Session Insights</h2>
            <p className="text-sm text-gray-400">Here's a quick AI-powered overview of your current research session in this tab.</p>
            <div className="pt-4">
              {renderContent()}
            </div>
        </div>
    );
};

const SettingsView: React.FC<Pick<UnifiedSidebarProps, 'mode' | 'onToggleIncognito' | 'onClearHistory' | 'session' | 'onShowLogin'>> = ({ mode, onToggleIncognito, onClearHistory, session, onShowLogin }) => {
    const handleLogout = async () => {
        if (supabase) {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Error signing out:", error);
            }
        }
    };
    
    return (
        <div className="p-4 space-y-6">
            {session ? (
                <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                    <p className="text-gray-300 break-words">
                        Signed in as <span className="font-semibold text-white">{session.user.email}</span>
                    </p>
                    <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-md font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            ) : (
                <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                    <p className="text-center text-gray-400">Create an account to save your data across devices.</p>
                     <button
                        onClick={onShowLogin}
                        className="w-full px-4 py-2 font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Sign In / Sign Up
                    </button>
                </div>
            )}
            
            <div className='space-y-4 p-4 bg-gray-800/50 rounded-lg'>
               <ToggleSwitch
                label="Incognito Mode"
                enabled={mode === 'incognito'}
                onChange={onToggleIncognito}
              />
            </div>
            <button
              onClick={onClearHistory}
              className="w-full px-4 py-3 text-lg font-semibold text-white bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
            >
              Clear Current Tab History
            </button>
        </div>
    );
};

const ExtensionsView: React.FC<Pick<UnifiedSidebarProps, 'availableExtensions' | 'installedExtensions' | 'enabledExtensions' | 'onToggleExtension' | 'onShowExtensionStore'>> = (props) => {
    const installed = useMemo(() => {
        return props.availableExtensions.filter(ext => props.installedExtensions.includes(ext.id));
    }, [props.availableExtensions, props.installedExtensions]);
    
    return (
         <div className="p-4 space-y-6">
            <h2 className="text-lg font-bold">Installed Extensions</h2>
            {installed.length > 0 ? (
                <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="space-y-6 divide-y divide-gray-700/50">
                        {installed.map(ext => (
                            <div key={ext.id} className="pt-6 first:pt-0">
                                <ToggleSwitch
                                    label={ext.name}
                                    enabled={props.enabledExtensions.includes(ext.id)}
                                    onChange={(enabled) => props.onToggleExtension(ext.id, enabled)}
                                />
                                <p className="text-sm text-gray-400 mt-2 pr-16">{ext.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>You don't have any extensions installed yet.</p>
                </div>
            )}

            <button
                onClick={props.onShowExtensionStore}
                className="w-full px-4 py-3 text-lg font-semibold text-white bg-purple-600/80 hover:bg-purple-600 rounded-lg transition-colors"
            >
                Browse Extension Store
            </button>
        </div>
    );
};