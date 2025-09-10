import React, { useMemo, useState } from 'react';
import { Source, Popularity } from '../types';
import { SourceLink } from './SourceLink';
import { ShareIcon } from './ShareIcon';
import { BookmarkIcon } from './BookmarkIcon';
import { LightbulbIcon } from './LightbulbIcon';

interface AnswerCardProps {
  answer: string;
  sources: Source[];
  popularity: Popularity;
  query: string;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  followupQuestions?: string[];
  onFollowupClick: (query: string) => void;
}

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const parsedContent = useMemo(() => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    const renderWithBold = (lineText: string, key: string | number) => {
      const parts = lineText.split(/(\*\*.*?\*\*)/g);
      return (
        <React.Fragment key={key}>
          {parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </React.Fragment>
      );
    };

    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('# ')) {
            elements.push(<h2 key={`h-${i}`} className="text-2xl font-bold mb-4 mt-5">{renderWithBold(trimmedLine.substring(2), `h-text-${i}`)}</h2>);
            i++;
            continue;
        }

        if (trimmedLine.startsWith('## ')) {
            elements.push(<h3 key={`h-${i}`} className="text-xl font-semibold mb-3 mt-4">{renderWithBold(trimmedLine.substring(3), `h-text-${i}`)}</h3>);
            i++;
            continue;
        }
        
        // Unordered List
        if (trimmedLine.startsWith('* ')) {
            const listItems: React.ReactNode[] = [];
            while (i < lines.length && lines[i].trim().startsWith('* ')) {
                listItems.push(
                    <li key={`li-${i}`} className="mb-2">
                        {renderWithBold(lines[i].trim().substring(2), `li-text-${i}`)}
                    </li>
                );
                i++;
            }
            elements.push(<ul key={`ul-${i-1}`} className="list-disc list-outside pl-5 mb-4">{listItems}</ul>);
            continue;
        }

        // Ordered List
        if (/^\d+\.\s/.test(trimmedLine)) {
            const listItems: React.ReactNode[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
                listItems.push(
                    <li key={`li-${i}`} className="mb-2">
                        {renderWithBold(lines[i].trim().replace(/^\d+\.\s/, ''), `li-text-${i}`)}
                    </li>
                );
                i++;
            }
            elements.push(<ol key={`ol-${i-1}`} className="list-decimal list-outside pl-5 mb-4">{listItems}</ol>);
            continue;
        }

        if (trimmedLine !== '') {
            elements.push(<p key={`p-${i}`} className="mb-4">{renderWithBold(line, `p-text-${i}`)}</p>);
        }
        
        i++;
    }

    return elements;
  }, [text]);

  return <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-strong:text-white prose-headings:text-white">{parsedContent}</div>;
};


const formatCount = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};


export const AnswerCard: React.FC<AnswerCardProps> = ({ 
  answer, 
  sources, 
  popularity, 
  query, 
  isBookmarked,
  onToggleBookmark,
  followupQuestions,
  onFollowupClick,
}) => {
  const [shareFeedback, setShareFeedback] = useState('Share');

  const handleShare = async () => {
    const shareData = {
      title: `Plexi AI: Result for "${query}"`,
      text: answer,
      url: window.location.href, // You could enhance this to a unique URL per result
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (err) {
      console.log('Falling back to clipboard:', err);
      try {
        await navigator.clipboard.writeText(answer);
        setShareFeedback('Copied!');
        setTimeout(() => setShareFeedback('Share'), 2000);
      } catch (clipErr) {
        console.error('Failed to copy to clipboard', clipErr);
        setShareFeedback('Failed!');
        setTimeout(() => setShareFeedback('Share'), 2000);
      }
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden animate-fade-in-up shadow-2xl">
      <div className="p-6 md:p-8">
        <div className="text-gray-200 text-lg leading-relaxed">
          <SimpleMarkdown text={answer} />
        </div>

        <div className="mt-6 border-t border-gray-700/50 pt-6 flex items-center gap-6 text-gray-400 text-sm">
            <div className="flex items-center gap-2" title={`${popularity.bookmarks.toLocaleString()} Bookmarks`}>
                <BookmarkIcon className="w-5 h-5" />
                <span className="font-medium">{formatCount(popularity.bookmarks)}</span>
                <span className="text-gray-500">Bookmarks</span>
            </div>
            <div className="flex items-center gap-2" title={`${popularity.shares.toLocaleString()} Shares`}>
                <ShareIcon className="w-5 h-5" />
                <span className="font-medium">{formatCount(popularity.shares)}</span>
                <span className="text-gray-500">Shares</span>
            </div>
        </div>

        {sources.length > 0 && (
          <div className="pt-6 mt-6 border-t border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Sources</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleBookmark}
                        className={`p-2 rounded-full transition-colors ${isBookmarked ? 'text-purple-400 bg-purple-900/50' : 'text-gray-400 bg-gray-700/50 hover:bg-gray-700'}`}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    >
                       <BookmarkIcon className="w-4 h-4" filled={isBookmarked}/>
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-full text-gray-300 bg-gray-700/50 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                        <ShareIcon className="w-4 h-4" />
                        <span>{shareFeedback}</span>
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {sources.map((source, index) => (
                <SourceLink key={source.uri} source={source} rank={index + 1} />
              ))}
            </div>
          </div>
        )}
        
        {followupQuestions && followupQuestions.length > 0 && (
            <div className="pt-6 mt-6 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Related</h3>
                <div className="flex flex-col items-start gap-3">
                    {followupQuestions.map((question, index) => (
                        <button
                            key={index}
                            onClick={() => onFollowupClick(question)}
                            className="w-full text-left flex items-center gap-3 p-3 text-gray-300 bg-gray-700/30 rounded-lg hover:bg-gray-700/60 hover:text-white transition-colors duration-200 group"
                        >
                            <LightbulbIcon className="w-5 h-5 flex-shrink-0 text-purple-400/80 group-hover:text-purple-400 transition-colors" />
                            <span className="text-base">{question}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};