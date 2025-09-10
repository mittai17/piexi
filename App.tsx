import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { sendMessage, generateSessionSummary } from './services/geminiService';
import { HistoryItem, TabSession, AppMode, Bookmark, Folder, SearchFocus } from './types';
import { SearchBar } from './components/SearchBar';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AnswerCard } from './components/AnswerCard';
import { UnifiedSidebar } from './components/UnifiedSidebar';
import { PlexiLogo } from './components/PlexiLogo';
import { MenuIcon } from './components/MenuIcon';
import { LoginPage } from './LoginPage';
import { SplashScreen } from './SplashScreen';
import { supabase } from './services/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import * as dataService from './services/dataService';
import { EditIcon } from './components/EditIcon';


const URL_REGEX = /^(https|http):\/\/[^\s/$.?#].[^\s]*$/i;

export const createNewTab = (): TabSession => ({
  id: `tab_${Date.now()}_${Math.random()}`,
  title: 'New Tab',
  history: [],
  isLoading: false,
  searchFocus: 'all',
});

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('normal');
  const [tabs, setTabs] = useState<TabSession[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [query, setQuery] = useState('');
  const [editingHistoryItemId, setEditingHistoryItemId] = useState<string | null>(null);
  const [editedQueryText, setEditedQueryText] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const normalSessionRef = useRef<{ tabs: TabSession[], activeTabId: string | null }>({ tabs: [], activeTabId: null });
  const initialSearchHandled = useRef(false);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const hasSearched = activeTab ? activeTab.history.length > 0 : false;
  const bookmarkedIds = useMemo(() => new Set(bookmarks.map(b => b.history_item.id)), [bookmarks]);

  useEffect(() => {
    // Load tabs from local storage
    if (typeof window !== 'undefined') {
      try {
        const savedTabs = localStorage.getItem('plexi_tabs');
        const savedActiveTabId = localStorage.getItem('plexi_active_tab_id');
        if (savedTabs) {
          const parsedTabs = JSON.parse(savedTabs) as TabSession[];
          if (parsedTabs.length > 0) {
            setTabs(parsedTabs);
            setActiveTabId(savedActiveTabId && parsedTabs.some(t => t.id === savedActiveTabId) ? savedActiveTabId : parsedTabs[0].id);
          } else {
             const newTab = createNewTab();
             setTabs([newTab]);
             setActiveTabId(newTab.id);
          }
        } else {
            const newTab = createNewTab();
            setTabs([newTab]);
            setActiveTabId(newTab.id);
        }
      } catch (e) {
        console.error("Failed to load tabs from localStorage", e);
        const newTab = createNewTab();
        setTabs([newTab]);
        setActiveTabId(newTab.id);
      }
    }
    
    // Subscribe to Supabase auth changes
    if (!supabase) {
        setIsCheckingAuth(false);
        return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setIsCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
    });

    return () => subscription.unsubscribe();

  }, []);

  useEffect(() => {
     // Load bookmarks and folders from Supabase, but only if logged in
    const fetchData = async () => {
      if (!session) {
          // If user logs out, clear their data
          setBookmarks([]);
          setFolders([]);
          setIsDataLoaded(true); // Mark as loaded to prevent loading indicators
          return;
      }

      setIsDataLoaded(false);
      try {
          const { bookmarks, folders } = await dataService.fetchData();
          setBookmarks(bookmarks);
          setFolders(folders);
      } catch(e) {
          setError(e instanceof Error ? e.message : "Could not load your saved data.");
      } finally {
          setIsDataLoaded(true);
      }
    }
    fetchData();
  }, [session]);

  useEffect(() => {
    // Save only tabs to local storage
    if (mode === 'normal' && typeof window !== 'undefined') {
      if(tabs.length > 0) {
        localStorage.setItem('plexi_tabs', JSON.stringify(tabs));
        if (activeTabId) {
          localStorage.setItem('plexi_active_tab_id', activeTabId);
        }
      }
    }
  }, [tabs, activeTabId, mode]);
  
  const setIsLoading = (isLoading: boolean) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isLoading } : t));
  }

  const setSearchFocus = (focus: SearchFocus) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, searchFocus: focus } : t));
  };


  useEffect(() => {
    if (activeTab?.isLoading && hasSearched) {
      scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [activeTab?.isLoading, hasSearched]);
  
  const handleToggleIncognito = () => {
    setError(null);

    if (mode === 'normal') {
      normalSessionRef.current = { tabs, activeTabId };
      const newIncognitoTab = createNewTab();
      setTabs([newIncognitoTab]);
      setActiveTabId(newIncognitoTab.id);
      setMode('incognito');
    } else {
      const { tabs: normalTabs, activeTabId: normalActiveTabId } = normalSessionRef.current;
      if (normalTabs.length > 0 && normalActiveTabId) {
        setTabs(normalTabs);
        setActiveTabId(normalActiveTabId);
      }
      setMode('normal');
    }
  };

  const handleSearch = useCallback(async (explicitQuery?: string) => {
    const currentQuery = explicitQuery ?? query;
    if (!currentQuery.trim() || !activeTab || !activeTabId) return;

    setIsLoading(true);
    setError(null);
    const currentFocus = activeTab.searchFocus;
    const currentHistory = activeTab.history;
    if (!explicitQuery) {
        setQuery('');
    }

    const isUrl = URL_REGEX.test(currentQuery);
    const prompt = isUrl
      ? `Please provide a concise summary of the content found at this URL: ${currentQuery}`
      : currentQuery;

    try {
      const result = await sendMessage(prompt, currentFocus, currentHistory);
      
      let finalSources = result.sources;
      if (isUrl) {
         try {
            const hostname = new URL(currentQuery).hostname;
            finalSources = [{ uri: currentQuery, title: `Content from ${hostname}` }];
        } catch (e) {
            finalSources = [{ uri: currentQuery, title: 'Original Source' }];
        }
      }

      const popularity = {
        shares: Math.floor(Math.random() * 9950) + 50,
        bookmarks: Math.floor(Math.random() * 1990) + 10,
      };
      
      const newItem: HistoryItem = {
        id: new Date().toISOString() + Math.random(),
        query: currentQuery, 
        answer: result.answer, 
        sources: finalSources, 
        popularity,
        followupQuestions: result.followupQuestions,
      };
      
      setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === activeTabId) {
          const isFirstSearch = tab.history.length === 0;
          return {
            ...tab,
            title: isFirstSearch ? currentQuery : tab.title,
            history: [...tab.history, newItem],
          };
        }
        return tab;
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [query, activeTab, activeTabId]);
  
  useEffect(() => {
    if (activeTabId && !initialSearchHandled.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const queryFromUrl = urlParams.get('q');
      
      if (queryFromUrl) {
        initialSearchHandled.current = true; // Mark as handled
        
        handleSearch(queryFromUrl);
        
        // Clean the URL to avoid re-triggering on refresh
        const newUrl = `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [activeTabId, handleSearch]);

  const handleNewTab = useCallback(() => {
    const newTab = createNewTab();
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const handleCloseTab = useCallback((tabIdToClose: string) => {
    if (tabs.length <= 1) return;
    
    const closingTabIndex = tabs.findIndex(t => t.id === tabIdToClose);
    const newTabs = tabs.filter(t => t.id !== tabIdToClose);
    
    if (activeTabId === tabIdToClose) {
      const newActiveIndex = Math.max(0, closingTabIndex - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    }
    
    setTabs(newTabs);
  }, [tabs, activeTabId]);
  
  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    setTabs(prevTabs => prevTabs.map(tab => tab.id === tabId ? { ...tab, title: newTitle } : tab));
  }, []);
  
  const handleReorderTabs = useCallback((draggedId: string, targetId: string) => {
    setTabs(prevTabs => {
      const draggedIndex = prevTabs.findIndex(t => t.id === draggedId);
      const targetIndex = prevTabs.findIndex(t => t.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prevTabs;
      const newTabs = [...prevTabs];
      const [draggedTab] = newTabs.splice(draggedIndex, 1);
      newTabs.splice(targetIndex, 0, draggedTab);
      return newTabs;
    });
  }, []);

  const handleClearHistory = () => {
    if (!activeTabId) return;
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.id === activeTabId ? { ...tab, history: [], title: 'New Tab', searchFocus: 'all' } : tab
    ));
    setError(null);
  };
  
  const handleToggleBookmark = async (historyItem: HistoryItem) => {
    const existingBookmark = bookmarks.find(b => b.history_item.id === historyItem.id);

    if (existingBookmark) {
        try {
            await dataService.deleteBookmark(existingBookmark.id);
            setBookmarks(prev => prev.filter(b => b.id !== existingBookmark.id));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete bookmark.");
        }
    } else {
        try {
            const newBookmark = await dataService.addBookmark(historyItem, null);
            setBookmarks(prev => [newBookmark, ...prev]);
        } catch(e) {
            setError(e instanceof Error ? e.message : "Failed to add bookmark.");
        }
    }
  };

  const handleAddFolder = async (name: string) => {
    try {
        const newFolder = await dataService.addFolder(name);
        setFolders(prev => [newFolder, ...prev]);
    } catch(e) {
        setError(e instanceof Error ? e.message : "Failed to add folder.");
    }
  };
  
  const handleDeleteFolder = async (folderId: string) => {
    try {
        await dataService.deleteFolder(folderId);
        setFolders(prev => prev.filter(f => f.id !== folderId));
        // Bookmarks are set to folder_id=NULL in DB via cascade, reflect this in state
        setBookmarks(prev => prev.map(b => b.folder_id === folderId ? { ...b, folder_id: null } : b));
    } catch(e) {
        setError(e instanceof Error ? e.message : "Failed to delete folder.");
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
      try {
          await dataService.deleteBookmark(bookmarkId);
          setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      } catch (e) {
           setError(e instanceof Error ? e.message : "Failed to delete bookmark.");
      }
  };
  
  const handleMoveBookmarkToFolder = async (bookmarkId: string, folderId: string | null) => {
    try {
        await dataService.moveBookmarkToFolder(bookmarkId, folderId);
        setBookmarks(prev => prev.map(b => b.id === bookmarkId ? { ...b, folder_id: folderId } : b));
    } catch(e) {
        setError(e instanceof Error ? e.message : "Failed to move bookmark.");
    }
  };

  const handleSwitchTab = useCallback((direction: 'next' | 'prev') => {
    if (!activeTabId || tabs.length <= 1) return;

    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'next') {
        nextIndex = (currentIndex + 1) % tabs.length;
    } else { // 'prev'
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }

    const nextTabId = tabs[nextIndex].id;
    setActiveTabId(nextTabId);
  }, [activeTabId, tabs]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModifier = isMac ? event.metaKey : event.ctrlKey;

      if (isModifier) {
        switch (event.key.toLowerCase()) {
          case 't':
            event.preventDefault();
            handleNewTab();
            break;
          case 'w':
            if (activeTabId) {
              event.preventDefault();
              handleCloseTab(activeTabId);
            }
            break;
          case 'tab':
            if (tabs.length > 1) {
              event.preventDefault();
              handleSwitchTab(event.shiftKey ? 'prev' : 'next');
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNewTab, handleCloseTab, handleSwitchTab, activeTabId, tabs]);

  // --- Edit History Functions ---
  const handleStartEdit = (item: HistoryItem) => {
    setEditingHistoryItemId(item.id);
    setEditedQueryText(item.query);
  };

  const handleCancelEdit = () => {
    setEditingHistoryItemId(null);
    setEditedQueryText('');
  };

  const handleSaveEdit = async () => {
    if (!editingHistoryItemId || !activeTabId || !activeTab) return;

    const itemIndex = activeTab.history.findIndex(h => h.id === editingHistoryItemId);
    if (itemIndex === -1) return;

    setIsLoading(true);
    setError(null);

    // Truncate history to the point before the edit
    const truncatedHistory = activeTab.history.slice(0, itemIndex);
    const newQuery = editedQueryText;

    try {
      const result = await sendMessage(newQuery, activeTab.searchFocus, truncatedHistory);
      
      const popularity = {
        shares: Math.floor(Math.random() * 9950) + 50,
        bookmarks: Math.floor(Math.random() * 1990) + 10,
      };
      
      const newItem: HistoryItem = {
        id: new Date().toISOString() + Math.random(),
        query: newQuery,
        answer: result.answer,
        sources: result.sources,
        popularity,
        followupQuestions: result.followupQuestions,
      };

      setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === activeTabId) {
          // Replace the old history branch with the new one
          const newHistory = [...truncatedHistory, newItem];
          return {
            ...tab,
            history: newHistory,
            // If it's the first item, update the tab title
            title: itemIndex === 0 ? newQuery : tab.title,
          };
        }
        return tab;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      handleCancelEdit(); // Reset editing state
    }
  };
  
  const bgColor = mode === 'incognito' ? 'bg-[#202124]' : 'bg-transparent';
  const logoInnerColor = mode === 'incognito' ? '#202124' : '#1a1a1a';

  if (isCheckingAuth) {
    return <SplashScreen />;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className={`relative min-h-screen w-full flex overflow-hidden transition-colors duration-300 ${bgColor}`}>
      <UnifiedSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        tabs={tabs}
        activeTabId={activeTabId}
        onNewTab={handleNewTab}
        onCloseTab={handleCloseTab}
        onSwitchTab={(id) => {
          setActiveTabId(id);
          setIsSidebarOpen(false);
        }}
        onRenameTab={handleRenameTab}
        onReorderTabs={handleReorderTabs}
        activeHistory={activeTab?.history || []}
        onHistoryItemClick={(index) => {
            if (itemRefs.current[index]) {
              itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            setIsSidebarOpen(false);
        }}
        bookmarks={bookmarks}
        folders={folders}
        onAddFolder={handleAddFolder}
        onDeleteFolder={handleDeleteFolder}
        onMoveBookmark={handleMoveBookmarkToFolder}
        onDeleteBookmark={handleDeleteBookmark}
        mode={mode}
        onToggleIncognito={handleToggleIncognito}
        onClearHistory={handleClearHistory}
        session={session}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center h-20">
          {hasSearched && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors animate-fade-in"
              aria-label="Open sidebar"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          )}
        </header>

        <main ref={scrollContainerRef} className="flex-grow w-full overflow-y-auto px-4 sm:px-6 pt-20 pb-40">
            {!hasSearched ? (
                 <div className="h-full flex flex-col items-center justify-center">
                    <div className="text-center text-gray-400 flex flex-col items-center gap-8 w-full px-4 animate-fade-in">
                        <PlexiLogo className="w-24 h-24" innerColor={logoInnerColor} />
                        <p className="text-lg">What's on your mind? Let Plexi browse for you.</p>
                        {activeTab?.isLoading && <LoadingIndicator />}
                    </div>
                 </div>
            ) : (
                <div className="space-y-8 max-w-3xl mx-auto">
                    {activeTab?.history.map((item, index) => (
                        <div key={item.id} ref={el => { itemRefs.current[index] = el; }} className="animate-fade-in-up scroll-mt-8">
                            <div className="mb-4">
                                {editingHistoryItemId === item.id ? (
                                    <div className="p-4 bg-gray-900/80 border border-purple-600 rounded-xl">
                                        <textarea
                                            value={editedQueryText}
                                            onChange={(e) => setEditedQueryText(e.target.value)}
                                            className="w-full bg-transparent text-lg text-white outline-none resize-none"
                                            rows={2}
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button onClick={handleCancelEdit} className="px-3 py-1 text-sm rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
                                            <button onClick={handleSaveEdit} className="px-3 py-1 text-sm rounded-md text-white bg-purple-600 hover:bg-purple-700">Save & Rerun</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group relative p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                                        <p className="text-lg text-gray-200 font-semibold break-words">{item.query}</p>
                                        <button 
                                            onClick={() => handleStartEdit(item)}
                                            className="absolute top-2 right-2 p-1.5 rounded-full text-gray-400 bg-gray-800/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                            aria-label="Edit query"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <AnswerCard
                                answer={item.answer}
                                sources={item.sources}
                                popularity={item.popularity}
                                query={item.query}
                                isBookmarked={bookmarkedIds.has(item.id)}
                                onToggleBookmark={() => handleToggleBookmark(item)}
                                followupQuestions={item.followupQuestions}
                                onFollowupClick={handleSearch}
                            />
                        </div>
                    ))}
                </div>
            )}
             {activeTab?.isLoading && hasSearched && <div className="mt-8 max-w-3xl mx-auto"><LoadingIndicator /></div>}
             {error && <div className="mt-8 text-center text-red-400 bg-red-900/20 p-4 rounded-lg max-w-3xl mx-auto">{error}</div>}
        </main>
        
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex justify-center pointer-events-none">
            <div className="w-full max-w-3xl mx-auto pointer-events-auto flex flex-col items-center gap-2">
                <SearchBar
                    query={query}
                    setQuery={setQuery}
                    onSearch={() => handleSearch()}
                    isLoading={activeTab?.isLoading ?? false}
                    searchFocus={activeTab?.searchFocus ?? 'all'}
                    setSearchFocus={setSearchFocus}
                    hasSearched={hasSearched}
                />
                <footer className="flex-shrink-0 text-center text-gray-600 text-xs">
                    Powered by Gemini AI. This is a conceptual UI.
                </footer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;