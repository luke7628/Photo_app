
export interface PhotoSetItem {
  url: string;
  label: string;
  filename: string;
  isSynced?: boolean;
}

export interface UserPreferences {
  defaultFlash: 'on' | 'off' | 'auto';
  skipReview: boolean;
  autoUpload: boolean;
  drivePath: string;
  useSubfoldersBySN: boolean;
  imageQuality: 'original' | 'compressed';
}

export interface GoogleUser {
  name: string;
  email: string;
  photoUrl: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  printerIds: string[];
  createdAt: string;
  imageUrl?: string;
}

export interface Printer {
  id: string;
  projectId: string; // Associated project ID
  serialNumber: string;
  model: 'ZT411' | 'ZT421';
  site: string;
  imageUrl: string;
  photos?: PhotoSetItem[];
  lastSync?: string;
  syncedCount: number;
  isSyncing?: boolean;
}

export enum AppScreen {
  SPLASH = 'SPLASH',
  PROJECT_LIST = 'PROJECT_LIST',
  GALLERY = 'GALLERY',
  SEARCH = 'SEARCH',
  CAMERA = 'CAMERA',
  REVIEW = 'REVIEW',
  DETAILS = 'DETAILS',
  PREVIEW = 'PREVIEW',
  SETTINGS = 'SETTINGS'
}

export enum ViewMode {
  LIST = 'LIST',
  GRID = 'GRID',
  LARGE = 'LARGE'
}

export const PHOTO_LABELS = [
  "Serial Number",
  "Front View",
  "Side View",
  "Roller Path",
  "Platen View",
  "Laser Head",
  "Post Service",
  "Internal Log",
  "Ribbon Path",
  "Sensor Align",
  "Rear Ports",
  "QC Verify"
];
