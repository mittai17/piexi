import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Extension, ExtensionID } from '../types';
import { summarizePageContent } from '../services/geminiService';
import { TabSpinner } from './TabSpinner';
import { SummarizeIcon } from './SummarizeIcon';

interface BrowserViewProps {
  url: string;
  onNavigate: (newUrl: string) => void;
  onTitleChange: (newTitle: string) => void;
  onHistoryChange: (state: { canGoBack: boolean; canGoForward: boolean; isLoading: boolean }) => void;
  availableExtensions: Extension[];
  enabledExtensions: ExtensionID[];
}

export const BrowserView = forwardRef<
    { goBack: () => void; goForward: () => void; reload: () => void, summarize: () => void },
    BrowserViewProps
>(({ url, onNavigate, onTitleChange, onHistoryChange, enabledExtensions }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const historyRef = useRef<{ stack: string[], position: number }>({ stack: [url], position: 0 });

  // State for summarizer extension
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const isNightShiftEnabled = enabledExtensions.includes('night-shift');

  const updateParentHistoryState = (isLoading = false) => {
      onHistoryChange({
          canGoBack: historyRef.current.position > 0,
          canGoForward: historyRef.current.position < historyRef.current.stack.length - 1,
          isLoading: isLoading || isSummarizing
      });
  };

  useEffect(() => {
    // This effect handles when the URL prop changes (e.g., from omnibox or new tab)
    if (url !== historyRef.current.stack[historyRef.current.position]) {
      historyRef.current = { stack: [url], position: 0 };
      if(iframeRef.current) {
         iframeRef.current.src = url;
      }
      updateParentHistoryState(true);
    }
  }, [url]);

  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (historyRef.current.position > 0) {
        historyRef.current.position--;
        const navUrl = historyRef.current.stack[historyRef.current.position];
        if (iframeRef.current) iframeRef.current.src = navUrl;
        onNavigate(navUrl);
        updateParentHistoryState(true);
      }
    },
    goForward: () => {
      if (historyRef.current.position < historyRef.current.stack.length - 1) {
        historyRef.current.position++;
        const navUrl = historyRef.current.stack[historyRef.current.position];
        if (iframeRef.current) iframeRef.current.src = navUrl;
        onNavigate(navUrl);
        updateParentHistoryState(true);
      }
    },
    reload: () => {
      if (iframeRef.current) {
        updateParentHistoryState(true);
        iframeRef.current.src = iframeRef.current.src;
      }
    },
    summarize: () => {
        handleSummarize();
    }
  }));

  const handleLoad = () => {
    updateParentHistoryState(false);
    try {
      if (iframeRef.current) {
        const frameWindow = iframeRef.current.contentWindow;
        if (frameWindow) {
          const newUrl = frameWindow.location.href;
          const newTitle = iframeRef.current.contentDocument?.title || new URL(newUrl).hostname;

          onTitleChange(newTitle);

          // Update internal history if URL changed from within the iframe
          if (newUrl !== historyRef.current.stack[historyRef.current.position]) {
              // Truncate future history if we've gone back and then navigated
              const newStack = historyRef.current.stack.slice(0, historyRef.current.position + 1);
              newStack.push(newUrl);
              historyRef.current = { stack: newStack, position: newStack.length - 1 };
              onNavigate(newUrl);
          }
          updateParentHistoryState();
        }
      }
    } catch (e) {
      console.warn("Cross-origin frame error on load, cannot access details.", e);
      // In case of cross-origin, we can't get URL or title. The omnibox will still show the last known URL.
    }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    updateParentHistoryState();
    setSummaryError(null);
    setSummaryResult(null);
    try {
        const summary = await summarizePageContent(url);
        setSummaryResult(summary);
    } catch(e) {
        setSummaryError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
        setIsSummarizing(false);
        updateParentHistoryState();
    }
  };

  return (
    <div className="w-full h-full relative bg-gray-900">
        <iframe
          ref={iframeRef}
          src={url}
          onLoad={handleLoad}
          onError={() => updateParentHistoryState(false)}
          className={`w-full h-full border-none bg-white ${isNightShiftEnabled ? 'invert' : ''}`}
          title="In-app browser"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        ></iframe>
        {(summaryResult || summaryError) && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in z-10" onClick={() => { setSummaryError(null); setSummaryResult(null); }}>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
                        <SummarizeIcon className="w-5 h-5" />
                        AI Summary
                    </h3>
                    {summaryResult && <p className="text-gray-300 whitespace-pre-wrap">{summaryResult}</p>}
                    {summaryError && <p className="text-red-400">{summaryError}</p>}
                    <button onClick={() => { setSummaryError(null); setSummaryResult(null); }} className="mt-6 w-full p-2 bg-gray-700 rounded-md hover:bg-gray-600 font-semibold">Close</button>
                </div>
            </div>
        )}
    </div>
  );
});