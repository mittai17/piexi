import { auth, db } from './supabaseClient'; // Imports Firebase client (previously Supabase)
import { Bookmark, Folder, HistoryItem } from '../types';
import { 
    collection, 
    query, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    updateDoc, 
    doc, 
    serverTimestamp, 
    orderBy 
} from 'firebase/firestore';

const throwFirestoreError = (error: any, context: string) => {
    console.error(`Firestore error in ${context}:`, error);
    throw new Error(`Failed to ${context}. Please check your connection or try again.`);
}

const checkFirebaseConfig = () => {
    if (!auth || !db) {
        throw new Error(`This feature requires a Firebase configuration. Please check your setup.`);
    }
};

const getUserId = (): string => {
    checkFirebaseConfig();
    const user = auth.currentUser;
    if (!user) {
        throw new Error("User must be logged in to perform this action.");
    }
    return user.uid;
};

/**
 * Fetches all folders and bookmarks for the currently authenticated user.
 */
export const fetchData = async (): Promise<{ bookmarks: Bookmark[], folders: Folder[] }> => {
    if (!auth?.currentUser) {
        return { bookmarks: [], folders: [] };
    }
    const userId = getUserId();

    const foldersRef = collection(db, 'users', userId, 'folders');
    const bookmarksRef = collection(db, 'users', userId, 'bookmarks');

    const foldersQuery = query(foldersRef, orderBy('created_at', 'desc'));
    const bookmarksQuery = query(bookmarksRef, orderBy('created_at', 'desc'));

    try {
        const [foldersSnapshot, bookmarksSnapshot] = await Promise.all([
            getDocs(foldersQuery),
            getDocs(bookmarksQuery)
        ]);

        const folders = foldersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                created_at: data.created_at?.toDate().toISOString() || new Date().toISOString()
            } as Folder
        });
        const bookmarks = bookmarksSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                history_item: data.history_item,
                folder_id: data.folder_id,
                created_at: data.created_at?.toDate().toISOString() || new Date().toISOString()
            } as Bookmark
        });

        return { folders, bookmarks };
    } catch(error) {
        throwFirestoreError(error, 'fetch data');
        return { bookmarks: [], folders: [] }; // Should not be reached
    }
};

/**
 * Adds a new folder.
 */
export const addFolder = async (name: string): Promise<Folder> => {
    const userId = getUserId();
    const foldersRef = collection(db, 'users', userId, 'folders');
    try {
        const newFolderData = { name, created_at: serverTimestamp() };
        const docRef = await addDoc(foldersRef, newFolderData);
        return { id: docRef.id, name, created_at: new Date().toISOString() };
    } catch (error) {
        throwFirestoreError(error, 'add folder');
        throw error; // re-throw
    }
};

/**
 * Deletes a folder.
 */
export const deleteFolder = async (folderId: string): Promise<void> => {
    const userId = getUserId();
    const folderDocRef = doc(db, 'users', userId, 'folders', folderId);
    try {
        await deleteDoc(folderDocRef);
    } catch (error) {
        throwFirestoreError(error, 'delete folder');
    }
};

/**
 * Adds a new bookmark.
 */
export const addBookmark = async (historyItem: HistoryItem, folderId: string | null): Promise<Bookmark> => {
    const userId = getUserId();
    const bookmarksRef = collection(db, 'users', userId, 'bookmarks');
    try {
        const newBookmarkData = { 
            history_item: historyItem, 
            folder_id: folderId,
            created_at: serverTimestamp()
        };
        const docRef = await addDoc(bookmarksRef, newBookmarkData);
        return {
            id: docRef.id,
            history_item: historyItem,
            folder_id: folderId,
            created_at: new Date().toISOString()
        };
    } catch (error) {
        throwFirestoreError(error, 'add bookmark');
        throw error; // re-throw
    }
};

/**
 * Deletes a bookmark.
 */
export const deleteBookmark = async (bookmarkId: string): Promise<void> => {
    const userId = getUserId();
    const bookmarkDocRef = doc(db, 'users', userId, 'bookmarks', bookmarkId);
    try {
        await deleteDoc(bookmarkDocRef);
    } catch (error) {
        throwFirestoreError(error, 'delete bookmark');
    }
};

/**
 * Moves a bookmark to a different folder (or un-categorizes it).
 */
export const moveBookmarkToFolder = async (bookmarkId: string, folderId: string | null): Promise<void> => {
    const userId = getUserId();
    const bookmarkDocRef = doc(db, 'users', userId, 'bookmarks', bookmarkId);
    try {
        await updateDoc(bookmarkDocRef, { folder_id: folderId });
    } catch (error) {
        throwFirestoreError(error, 'move bookmark');
    }
};