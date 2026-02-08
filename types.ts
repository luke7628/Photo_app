
export interface PhotoSetItem {
  url: string;
  label: string;
  filename: string;
  isSynced?: boolean;
  driveFileId?: string; // 云盘文件ID，用于扩展
  localPath?: string; // 本地路径，用于扩展
}

export interface UserPreferences {
  defaultFlash: 'on' | 'off' | 'auto';
  skipReview: boolean;
  autoUpload: boolean;
  drivePath: string;
  useSubfoldersBySN: boolean;
  imageQuality: 'original' | 'compressed';
  cloudProvider?: 'none' | 'drive' | 'onedrive'; // 云盘供应商
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
  driveFolderId?: string; // 云盘文件夹ID
  localPath?: string; // 本地路径
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
  driveFolderId?: string; // 云盘根文件夹ID
  localPath?: string; // 本地路径
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
