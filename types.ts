export type AppMode = 'normal' | 'incognito';

export type SearchFocus = 'all' | 'academic' | 'writing' | 'youtube' | 'reddit';

export interface Source {
  uri: string;
  title: string;
}

export interface Popularity {
  shares: number;
  bookmarks: number;
}

export interface HistoryItem {
  id: string;
  query: string;
  answer: string;
  sources: Source[];
  popularity: Popularity;
  followupQuestions?: string[];
}

export interface TabSession {
  id: string;
  title:string;
  history: HistoryItem[];
  isLoading?: boolean;
  searchFocus: SearchFocus;
}

// --- Bookmarking Types ---

export interface Bookmark {
  id: string;
  history_item: HistoryItem;
  created_at: string;
  folder_id: string | null;
}

export interface Folder {
  id: string;
  name: string;
  created_at: string;
}