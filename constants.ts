
import { Printer, Project, PhotoSetItem } from './types';

const PHOTO_LABELS = [
  "Serial Number",
  "Front View",
  "Side View",
  "Roller Path",
  "Platen View",
  "Laser Head",
  "Post Service",
  "Internal Log",
  "Ribbon Path",
  "Top Cover",
  "Control Panel",
  "Overall View"
];

const generateMockPhotos = (serialNumber: string, model: string): PhotoSetItem[] => {
  return Array.from({ length: 12 }, (_, i) => ({
    url: `https://picsum.photos/seed/${serialNumber}-${i}/800/600`,
    label: PHOTO_LABELS[i],
    filename: `${model}_${serialNumber}_${i + 1}.jpg`,
    isSynced: true
  }));
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-test',
    name: 'ABCD',
    description: 'Test Project',
    printerIds: ['test-1', 'test-2'],
    createdAt: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/seed/test/400/300'
  },
  {
    id: 'proj-1',
    name: 'Amazon WRDC-1',
    description: 'Warehouse Relocation Phase 1',
    printerIds: ['1', '2', '3'],
    createdAt: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/seed/proj1/400/300'
  },
  {
    id: 'proj-2',
    name: 'FedEx Hub 2025',
    description: 'Main Sortation Line Upgrade',
    printerIds: ['4', '5'],
    createdAt: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/seed/proj2/400/300'
  }
];

export const MOCK_PRINTERS: Printer[] = [
  {
    id: 'test-1',
    projectId: 'proj-test',
    serialNumber: 'TEST123456',
    model: 'ZT411',
    site: 'Test Site',
    imageUrl: 'https://picsum.photos/seed/test1/200/200',
    photos: generateMockPhotos('TEST123456', 'ZT411'),
    syncedCount: 12
  },
  {
    id: 'test-2',
    projectId: 'proj-test',
    serialNumber: 'TEST789012',
    model: 'ZT421',
    site: 'Test Site',
    imageUrl: 'https://picsum.photos/seed/test2/200/200',
    photos: generateMockPhotos('TEST789012', 'ZT421'),
    syncedCount: 12
  },
  {
    id: '1',
    projectId: 'proj-1',
    serialNumber: 's123456789',
    model: 'ZT411',
    site: 'WRDC',
    imageUrl: 'https://picsum.photos/seed/p1/200/200',
    syncedCount: 12
  },
  {
    id: '2',
    projectId: 'proj-1',
    serialNumber: 's234567890',
    model: 'ZT421',
    site: 'ORD1',
    imageUrl: 'https://picsum.photos/seed/p2/200/200',
    syncedCount: 0
  },
  {
    id: '3',
    projectId: 'proj-1',
    serialNumber: 's345678901',
    model: 'ZT411',
    site: 'PHX2',
    imageUrl: 'https://picsum.photos/seed/p3/200/200',
    syncedCount: 12
  },
  {
    id: '4',
    projectId: 'proj-2',
    serialNumber: 's456789012',
    model: 'ZT421',
    site: 'ATL5',
    imageUrl: 'https://picsum.photos/seed/p4/200/200',
    syncedCount: 5
  },
  {
    id: '5',
    projectId: 'proj-2',
    serialNumber: 's567890123',
    model: 'ZT411',
    site: 'DFW7',
    imageUrl: 'https://picsum.photos/seed/p5/200/200',
    syncedCount: 12
  },
  {
    id: '6',
    projectId: 'proj-2',
    serialNumber: 's678901234',
    model: 'ZT411',
    site: 'LAX1',
    imageUrl: 'https://picsum.photos/seed/p6/200/200',
    syncedCount: 0
  }
];
