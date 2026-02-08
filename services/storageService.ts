
import { Project, Printer, GoogleUser, UserPreferences } from '../types';

const DB_NAME = 'DematicPhotoDB';
const STORE_NAME = 'printers';
const DB_VERSION = 1;

const KEYS = {
  PROJECTS: 'dematic_projects',
  USER: 'dematic_user',
  SETTINGS: 'dematic_settings'
};

// IndexedDB Helper
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const storageService = {
  // Sync Small Configs (Local Storage is fine here)
  saveProjects: (projects: Project[]) => localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects)),
  loadProjects: (): Project[] | null => {
    const data = localStorage.getItem(KEYS.PROJECTS);
    return data ? JSON.parse(data) : null;
  },

  saveUser: (user: GoogleUser | null) => {
    if (user) localStorage.setItem(KEYS.USER, JSON.stringify(user));
    else localStorage.removeItem(KEYS.USER);
  },
  loadUser: (): GoogleUser | null => {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  saveSettings: (settings: UserPreferences) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings)),
  loadSettings: (): UserPreferences | null => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  },

  // Heavy Data (IndexedDB)
  savePrinters: async (printers: Printer[]) => {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Clear old data and save current state
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        printers.forEach(printer => store.add(printer));
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  },

  loadPrinters: async (): Promise<Printer[] | null> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.length > 0 ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  }
};
