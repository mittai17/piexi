import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { sendMessage, generateSessionSummary, generateTabTitle } from './services/geminiService';
import { HistoryItem, TabSession, AppMode, Bookmark, Folder, SearchFocus, Source, Extension, ExtensionID } from './types';
import { SearchBar } from './components/SearchBar';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AnswerCard } from './components/AnswerCard';
import { UnifiedSidebar } from './components/UnifiedSidebar';
import { PlexiLogo } from './components/PlexiLogo';
import { MenuIcon } from './components/MenuIcon';
import { LoginPage } from './LoginPage';
import { SplashScreen } from './SplashScreen';
import { auth } from './services/supabaseClient'; // Imports Firebase client (previously Supabase)
import type { User } from 'firebase/auth';
import * as dataService from './services/dataService';
import { EditIcon } from './components/EditIcon';
import { BrowserView } from './components/BrowserView';
import { ExtensionStore } from './components/ExtensionStore';
import { ArrowLeftIcon } from './components/ArrowLeftIcon';
import { ArrowRightIcon } from './components/ArrowRightIcon';
import { RefreshIcon } from './components/RefreshIcon';
import { SummarizeIcon } from './components/SummarizeIcon';
import { TabSpinner } from './components/TabSpinner';


const URL_REGEX = /^(https|http):\/\/[^\s/$.?#].[^\s]*$|^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(:\d{1,5})?(\/.*)?$/;


// --- Available Extensions Definition ---
const availableExtensions: Extension[] = [
    {
        id: 'night-shift',
        name: 'Night Shift',
        description: 'Invert page colors for a dark mode experience on any website. Great for late-night browsing.',
        version: '1.0.0',
    },
    {
        id: 'ai-summarizer',
        name: 'AI Page Summarizer',
        description: 'Use AI to generate a concise summary of the current webpage. Perfect for long articles.',
        version: '1.0.0',
    }
];

export const createNewTab = (): TabSession => ({
  id: `tab_${Date.now()}_${Math.random()}`,
  title: 'New Tab',
  history: [],
  isLoading: false,
  searchFocus: 'all',
  view: 'search',
  currentUrl: null,
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

  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showLoginPage, setShowLoginPage] = useState(false);

  const [omniboxValue, setOmniboxValue] = useState('');
  const [editingHistoryItemId, setEditingHistoryItemId] = useState<string | null>(null);
  const [editedQueryText, setEditedQueryText] = useState('');
  const [generatingTitleTabId, setGeneratingTitleTabId] = useState<string | null>(null);
  const [prefetchedUrls, setPrefetchedUrls] = useState<Set<string>>(new Set());

  // --- Extension State ---
  const [installedExtensions, setInstalledExtensions] = useState<ExtensionID[]>([]);
  const [enabledExtensions, setEnabledExtensions] = useState<ExtensionID[]>([]);
  const [showExtensionStore, setShowExtensionStore] = useState(false);
  
  // --- Browser State ---
  const browserViewRef = useRef<{ goBack: () => void; goForward: () => void; reload: () => void; summarize: () => void; }>(null);
  const [browserState, setBrowserState] = useState({ canGoBack: false, canGoForward: false, isLoading: false });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const normalSessionRef = useRef<{ tabs: TabSession[], activeTabId: string | null }>({ tabs: [], activeTabId: null });
  const initialSearchHandled = useRef(false);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const hasSearched = activeTab ? activeTab.history.length > 0 : false;
  const bookmarkedIds = useMemo(() => new Set(bookmarks.map(b => b.history_item.id)), [bookmarks]);

  useEffect(() => {
    // Load tabs and extensions from local storage
    if (typeof window !== 'undefined') {
      try {
        const savedTabs = localStorage.getItem('plexi_tabs');
        const savedActiveTabId = localStorage.getItem('plexi_active_tab_id');
        if (savedTabs) {
          let parsedTabs = JSON.parse(savedTabs) as TabSession[];
          // Migration for older versions that don't have view/currentUrl
          parsedTabs = parsedTabs.map(t => ({
            ...t,
            view: t.view || 'search',
            currentUrl: t.currentUrl || null
          }));

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

        const savedInstalled = localStorage.getItem('plexi_installed_extensions');
        const savedEnabled = localStorage.getItem('plexi_enabled_extensions');
        if (savedInstalled) setInstalledExtensions(JSON.parse(savedInstalled));
        if (savedEnabled) setEnabledExtensions(JSON.parse(savedEnabled));

      } catch (e) {
        console.error("Failed to load state from localStorage", e);
        const newTab = createNewTab();
        setTabs([newTab]);
        setActiveTabId(newTab.id);
      }
    }
    
    // Subscribe to Firebase auth changes
    const unsubscribe = auth.onAuthStateChanged(user => {
        setUser(user);
        setIsCheckingAuth(false);
    });

    return () => unsubscribe();

  }, []);

  useEffect(() => {
     // Load bookmarks and folders from Firestore, but only if logged in
    const fetchData = async () => {
      if (!user) {
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
  }, [user]);

  useEffect(() => {
    // Save state to local storage
    if (mode === 'normal' && typeof window !== 'undefined') {
      if(tabs.length > 0) {
        localStorage.setItem('plexi_tabs', JSON.stringify(tabs));
        if (activeTabId) {
          localStorage.setItem('plexi_active_tab_id', activeTabId);
        }
      }
      localStorage.setItem('plexi_installed_extensions', JSON.stringify(installedExtensions));
      localStorage.setItem('plexi_enabled_extensions', JSON.stringify(enabledExtensions));
    }
  }, [tabs, activeTabId, mode, installedExtensions, enabledExtensions]);

  // Close login modal automatically on successful sign-in
  useEffect(() => {
    if (user) {
      setShowLoginPage(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab?.view === 'browse') {
        setOmniboxValue(activeTab.currentUrl || '');
    } else if (activeTab?.view === 'search' && !activeTab.isLoading) {
        const lastQuery = activeTab.history[activeTab.history.length - 1]?.query || '';
        setOmniboxValue(lastQuery);
    }
  }, [activeTab]);

  useEffect(() => {
    // Effect to manage <link rel="prefetch"> tags in the document head
    const head = document.head;
    const existingPrefetchLinks = Array.from(head.querySelectorAll('link[rel="prefetch"][data-prefetched-by="plexi"]'));
    const existingUrls = new Set(existingPrefetchLinks.map(link => link.getAttribute('href')));

    prefetchedUrls.forEach(url => {
      if (url && !existingUrls.has(url)) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'document';
        link.setAttribute('data-prefetched-by', 'plexi'); // For identification
        head.appendChild(link);
      }
    });
  }, [prefetchedUrls]);
  
  const setIsLoading = (isLoading: boolean) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isLoading } : t));
  }

  const setSearchFocus = (focus: SearchFocus) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, searchFocus: focus } : t));
  };


  useEffect(() => {
    if (activeTab?.view === 'search' && (activeTab?.isLoading || activeTab?.history.some(h => !h.sources?.length))) {
       setTimeout(() => {
           scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
       }, 100);
    }
  }, [tabs, activeTab?.isLoading, activeTab?.history, activeTab?.view]);
  
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
    const currentQuery = explicitQuery ?? omniboxValue;
    if (!currentQuery.trim() || !activeTabId) return;

    const isUrl = URL_REGEX.test(currentQuery);
    if (isUrl) {
      const newUrl = currentQuery.startsWith('http') ? currentQuery : `https://${currentQuery}`;
      setTabs(prev => prev.map(t => t.id === activeTabId ? {
          ...t,
          view: 'browse',
          currentUrl: newUrl,
      } : t));
      return;
    }
    
    // Proceed with AI search if it's not a URL
    if (!activeTab) return;

    setIsLoading(true);
    setError(null);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, view: 'search' } : t));

    const currentFocus = activeTab.searchFocus;
    const currentHistory = activeTab.history;
    if (!explicitQuery) {
        // We don't clear the omnibox anymore, it reflects the query
    }

    const prompt = currentQuery;
    const newItemId = new Date().toISOString() + Math.random();
    const placeholderItem: HistoryItem = {
      id: newItemId,
      query: currentQuery,
      answer: '',
      sources: [],
      popularity: { shares: 0, bookmarks: 0 },
      followupQuestions: [],
    };

    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.id === activeTabId) {
        const isFirstSearch = tab.history.length === 0;
        return {
          ...tab,
          title: isFirstSearch ? currentQuery : tab.title,
          history: [...tab.history, placeholderItem],
        };
      }
      return tab;
    }));

    try {
      await sendMessage(prompt, currentFocus, currentHistory, {
        onChunk: ({ text }) => {
          setTabs(prevTabs => prevTabs.map(tab => {
            if (tab.id === activeTabId) {
              return {
                ...tab,
                history: tab.history.map(item =>
                  item.id === newItemId ? { ...item, answer: item.answer + text } : item
                ),
              };
            }
            return tab;
          }));
        },
        onMetadata: ({ sources, followupQuestions, finalAnswer }) => {
          let finalSources: Source[] = sources;
          const popularity = {
            shares: Math.floor(Math.random() * 9950) + 50,
            bookmarks: Math.floor(Math.random() * 1990) + 10,
          };
          setTabs(prevTabs => prevTabs.map(tab => {
            if (tab.id === activeTabId) {
              return {
                ...tab,
                history: tab.history.map(item =>
                  item.id === newItemId
                    ? { ...item, answer: finalAnswer, sources: finalSources, followupQuestions, popularity }
                    : item
                ),
              };
            }
            return tab;
          }));
        },
        onError: ({ message }) => {
          setError(message);
          setTabs(prevTabs => prevTabs.map(tab => {
            if (tab.id === activeTabId) {
              return { ...tab, history: tab.history.filter(item => item.id !== newItemId) };
            }
            return tab;
          }));
        },
        onEnd: () => {
          setIsLoading(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
      setTabs(prevTabs => prevTabs.map(tab => {
        if (tab.id === activeTabId) {
          return { ...tab, history: tab.history.filter(item => item.id !== newItemId) };
        }
        return tab;
      }));
    }
  }, [omniboxValue, activeTab, activeTabId]);
  
  useEffect(() => {
    if (activeTabId && !initialSearchHandled.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const queryFromUrl = urlParams.get('q');
      
      if (queryFromUrl) {
        initialSearchHandled.current = true;
        setOmniboxValue(queryFromUrl);
        handleSearch(queryFromUrl);
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
    if (!newTitle || newTitle === 'about:blank') return;
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
      tab.id === activeTabId ? { ...tab, history: [], title: 'New Tab', searchFocus: 'all', view: 'search', currentUrl: null } : tab
    ));
    setError(null);
  };
  
  const handleToggleBookmark = async (historyItem: HistoryItem) => {
    if (!user) {
        setShowLoginPage(true);
        return;
    }
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
    } else {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    setActiveTabId(tabs[nextIndex].id);
  }, [activeTabId, tabs]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModifier = isMac ? event.metaKey : event.ctrlKey;
      if (isModifier) {
        switch (event.key.toLowerCase()) {
          case 't': event.preventDefault(); handleNewTab(); break;
          case 'w': if (activeTabId) { event.preventDefault(); handleCloseTab(activeTabId); } break;
          case 'tab': if (tabs.length > 1) { event.preventDefault(); handleSwitchTab(event.shiftKey ? 'prev' : 'next'); } break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewTab, handleCloseTab, handleSwitchTab, activeTabId, tabs]);

  const handleGenerateTabTitle = useCallback(async (tabId: string) => {
    const tabToRename = tabs.find(t => t.id === tabId);
    if (!tabToRename || tabToRename.history.length === 0) return;

    setGeneratingTitleTabId(tabId);
    setError(null);
    try {
      const newTitle = await generateTabTitle(tabToRename.history);
      handleRenameTab(tabId, newTitle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate AI title.");
    } finally {
      setGeneratingTitleTabId(null);
    }
  }, [tabs, handleRenameTab]);

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
    const originalHistory = activeTab.history;
    setIsLoading(true);
    setError(null);
    setEditingHistoryItemId(null);
    setEditedQueryText('');
    const truncatedHistory = activeTab.history.slice(0, itemIndex);
    const newQuery = editedQueryText;
    const newItemId = new Date().toISOString() + Math.random();
    const placeholderItem: HistoryItem = {
      id: newItemId,
      query: newQuery,
      answer: '',
      sources: [],
      popularity: { shares: 0, bookmarks: 0 },
      followupQuestions: [],
    };
    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.id === activeTabId) {
        const newHistory = [...truncatedHistory, placeholderItem];
        return { ...tab, history: newHistory, title: itemIndex === 0 ? newQuery : tab.title };
      }
      return tab;
    }));
    try {
      await sendMessage(newQuery, activeTab.searchFocus, truncatedHistory, {
        onChunk: ({ text }) => setTabs(p => p.map(t => t.id===activeTabId ? {...t, history: t.history.map(i => i.id===newItemId ? {...i, answer: i.answer+text}:i)} : t)),
        onMetadata: ({ sources, followupQuestions, finalAnswer }) => {
          const popularity = { shares: Math.floor(Math.random()*9950)+50, bookmarks: Math.floor(Math.random()*1990)+10 };
          setTabs(p => p.map(t => t.id===activeTabId ? {...t, history: t.history.map(i=> i.id===newItemId ? {...i, answer: finalAnswer, sources, followupQuestions, popularity}:i)}:t));
        },
        onError: ({ message }) => { setError(message); setTabs(p => p.map(t=>t.id===activeTabId ? {...t, history: originalHistory}:t)); },
        onEnd: () => setIsLoading(false),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
      setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, history: originalHistory } : tab));
    }
  };
  
  const handleSourceClick = (source: Source) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? {
      ...t,
      view: 'browse',
      currentUrl: source.uri,
      title: source.title || new URL(source.uri).hostname,
    } : t));
  };

  const handlePrefetchSource = (source: Source) => {
    if (source?.uri) {
      setPrefetchedUrls(prev => new Set(prev).add(source.uri));
    }
  };
  
  // --- Browser Action Handlers ---
  const handleBrowserNavigate = (newUrl: string) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, currentUrl: newUrl } : t));
  };
  
  const setView = (view: 'search' | 'browse') => {
      if (!activeTabId) return;
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, view } : t));
  };

  // --- Extension Handlers ---
  const handleInstallExtension = (extensionId: ExtensionID) => {
    if (!installedExtensions.includes(extensionId)) {
      const newInstalled = [...installedExtensions, extensionId];
      const newEnabled = [...enabledExtensions, extensionId];
      setInstalledExtensions(newInstalled);
      setEnabledExtensions(newEnabled);
    }
    setShowExtensionStore(false);
  };
  
  const handleToggleExtension = (extensionId: ExtensionID, isEnabled: boolean) => {
    if (isEnabled) setEnabledExtensions(prev => [...prev, extensionId]);
    else setEnabledExtensions(prev => prev.filter(id => id !== extensionId));
  };

  const bgColor = mode === 'incognito' ? 'bg-[#202124]' : 'bg-transparent';
  const logoInnerColor = mode === 'incognito' ? '#202124' : '#1a1a1a';

  if (isCheckingAuth) {
    return <SplashScreen />;
  }

  const isSummarizerEnabled = enabledExtensions.includes('ai-summarizer');

  return (
    <>
      <div className={`relative min-h-screen w-full flex overflow-hidden transition-colors duration-300 ${bgColor}`}>
        <UnifiedSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          tabs={tabs}
          activeTabId={activeTabId}
          onNewTab={handleNewTab}
          onCloseTab={handleCloseTab}
          onSwitchTab={(id) => { setActiveTabId(id); setIsSidebarOpen(false); }}
          onRenameTab={handleRenameTab}
          onReorderTabs={handleReorderTabs}
          generatingTitleTabId={generatingTitleTabId}
          onGenerateTabTitle={handleGenerateTabTitle}
          activeHistory={activeTab?.history || []}
          onHistoryItemClick={(index) => {
            if (activeTabId) setTabs(p => p.map(t => t.id === activeTabId ? {...t, view: 'search'} : t));
            setTimeout(() => {
                if (itemRefs.current[index]) {
                  itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
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
          user={user}
          onShowLogin={() => setShowLoginPage(true)}
          availableExtensions={availableExtensions}
          installedExtensions={installedExtensions}
          enabledExtensions={enabledExtensions}
          onToggleExtension={handleToggleExtension}
          onShowExtensionStore={() => setShowExtensionStore(true)}
        />
        
        <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="flex-shrink-0 p-2 border-b border-gray-700/50 flex items-center gap-1 sm:gap-2 z-10 bg-gray-900/60 backdrop-blur-md">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
              aria-label="Open sidebar"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setView('search')} className="p-1.5 rounded-full hover:bg-gray-700/50" title="Go to AI Search view">
                <PlexiLogo className="w-6 h-6" innerColor={logoInnerColor} />
            </button>
            <button onClick={() => browserViewRef.current?.goBack()} disabled={!browserState.canGoBack} className="p-2 rounded-full text-gray-400 hover:bg-gray-700/50 disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Go back">
                <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <button onClick={() => browserViewRef.current?.goForward()} disabled={!browserState.canGoForward} className="p-2 rounded-full text-gray-400 hover:bg-gray-700/50 disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Go forward">
                <ArrowRightIcon className="w-5 h-5" />
            </button>
            <button onClick={() => browserViewRef.current?.reload()} className="p-2 rounded-full text-gray-400 hover:bg-gray-700/50" aria-label="Reload page">
                <RefreshIcon className="w-5 h-5" />
            </button>

            <div className="flex-grow">
               <SearchBar
                  query={omniboxValue}
                  setQuery={setOmniboxValue}
                  onSearch={() => handleSearch()}
                  isLoading={activeTab?.isLoading ?? false}
                  searchFocus={activeTab?.searchFocus ?? 'all'}
                  setSearchFocus={setSearchFocus}
                  hasSearched={hasSearched}
              />
            </div>
            
             {isSummarizerEnabled && activeTab?.view === 'browse' && (
                <button onClick={() => browserViewRef.current?.summarize()} disabled={browserState.isLoading} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:text-purple-400 disabled:cursor-wait" aria-label="Summarize page">
                    {browserState.isLoading ? <TabSpinner /> : <SummarizeIcon className="w-5 h-5" />}
                </button>
             )}
          </header>

          <main ref={scrollContainerRef} className="flex-grow w-full relative bg-gray-800">
              {activeTab?.view === 'browse' && activeTab.currentUrl ? (
                 <BrowserView
                    ref={browserViewRef}
                    key={activeTab.id}
                    url={activeTab.currentUrl}
                    onNavigate={handleBrowserNavigate}
                    onTitleChange={(newTitle) => handleRenameTab(activeTab.id, newTitle)}
                    onHistoryChange={setBrowserState}
                    availableExtensions={availableExtensions}
                    enabledExtensions={enabledExtensions}
                 />
              ) : (
                <div className="h-full overflow-y-auto px-4 sm:px-6 pt-6 pb-20">
                  {!hasSearched ? (
                      <div className="h-full flex flex-col items-center justify-center -mt-14">
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
                                              <textarea value={editedQueryText} onChange={(e) => setEditedQueryText(e.target.value)} className="w-full bg-transparent text-lg text-white outline-none resize-none" rows={2} autoFocus />
                                              <div className="flex justify-end gap-2 mt-2">
                                                  <button onClick={handleCancelEdit} className="px-3 py-1 text-sm rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
                                                  <button onClick={handleSaveEdit} className="px-3 py-1 text-sm rounded-md text-white bg-purple-600 hover:bg-purple-700">Save & Rerun</button>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="group relative p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                                              <p className="text-lg text-gray-200 font-semibold break-words">{item.query}</p>
                                              <button onClick={() => handleStartEdit(item)} className="absolute top-2 right-2 p-1.5 rounded-full text-gray-400 bg-gray-800/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" aria-label="Edit query">
                                                  <EditIcon className="w-4 h-4" />
                                              </button>
                                          </div>
                                      )}
                                  </div>
                                  <AnswerCard
                                      answer={item.answer} sources={item.sources} popularity={item.popularity} query={item.query}
                                      isBookmarked={bookmarkedIds.has(item.id)} onToggleBookmark={() => handleToggleBookmark(item)}
                                      followupQuestions={item.followupQuestions} onFollowupClick={(q) => { setOmniboxValue(q); handleSearch(q); }} onSourceClick={handleSourceClick}
                                      onPrefetchSource={handlePrefetchSource}
                                  />
                              </div>
                          ))}
                      </div>
                  )}
                  {activeTab?.isLoading && hasSearched && <div className="mt-8 max-w-3xl mx-auto"><LoadingIndicator /></div>}
                  {error && <div className="mt-8 text-center text-red-400 bg-red-900/20 p-4 rounded-lg max-w-3xl mx-auto">{error}</div>}
                </div>
              )}
          </main>
        </div>
      </div>
      {showLoginPage && <LoginPage onClose={() => setShowLoginPage(false)} />}
      <ExtensionStore 
        isOpen={showExtensionStore}
        onClose={() => setShowExtensionStore(false)}
        extensions={availableExtensions}
        installedIds={installedExtensions}
        onInstall={handleInstallExtension}
      />
    </>
  );
};

export default App;