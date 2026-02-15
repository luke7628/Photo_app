
import React, { useState, useMemo, memo, useEffect } from 'react';
import { Printer, MicrosoftUser, Project } from '../types';

interface GalleryScreenProps {
  user: MicrosoftUser | null;
  activeProject?: Project;
  onLogin: () => void;
  onLogout: () => void;
  printers: Printer[];
  onSearch: () => void;
  onAdd: () => void;
  onSelectPrinter: (printer: Printer) => void;
  onPreviewImage: (url: string) => void;
  onOpenSettings: () => void;
  onManualSync: () => void;
  onBackToProjects: () => void;
}

const PrinterItem = memo(({ 
  printer, 
  onSelect,
  isLandscape,
  index
}: { 
  printer: Printer; 
  onSelect: (p: Printer) => void;
  isLandscape: boolean;
  index: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const photoCount = printer.photos?.filter(p => p.url).length || 0;
  const isCompleted = photoCount === 12 || (printer.syncedCount === 12 && (!printer.photos || printer.photos.length === 0));

  return (
    <button 
      onClick={() => onSelect(printer)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animation: `slideUp 0.3s ease-out ${index * 30}ms both`
      }}
      className={`w-full text-left group flex items-center bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all ${isLandscape ? 'p-2 gap-3' : 'p-3 gap-3.5'}`}
    >
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      <div className={`rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 shadow-sm transition-all ${isHovered ? 'shadow-md' : ''} ${isLandscape ? 'size-10' : 'size-14'}`}>
        <img src={printer.imageUrl} className="size-full object-cover" alt={printer.serialNumber} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-semibold tracking-tight text-gray-900 truncate ${isLandscape ? 'text-xs' : 'text-sm'}`}>{printer.serialNumber}</p>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-all ${
            isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {isCompleted ? '✓ Done' : 'In Progress'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg transition-colors`}>{printer.partNumber || printer.model}</span>
          {!isLandscape && <span className={`text-[10px] font-medium text-gray-500 truncate opacity-60`}>{printer.site}</span>}
        </div>
      </div>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        printer.syncedCount === 12 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
      }`}>
        <span className="material-symbols-outlined text-base font-black">
          {printer.syncedCount === 12 ? 'cloud_done' : 'cloud_upload'}
        </span>
        <span className="text-xs font-semibold tabular-nums">{printer.syncedCount}/12</span>
      </div>
    </button>
  );
});

const GalleryScreen: React.FC<GalleryScreenProps> = ({ 
  user, activeProject, onLogin, onLogout, printers, onSearch, onAdd, onSelectPrinter, onPreviewImage, onOpenSettings, onManualSync, onBackToProjects
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ZT411' | 'ZT421'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 计算实际存在的打印机型号
  const availableModels = useMemo(() => {
    const models = new Set<string>(printers.map(p => p.model));
    return Array.from(models).sort() as ('ZT411' | 'ZT421')[];
  }, [printers]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [uiRotation, setUiRotation] = useState(0);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const { gamma } = e;
      if (gamma === null) return;
      if (Math.abs(gamma) > 40) setUiRotation(gamma > 0 ? -90 : 90);
      else setUiRotation(0);
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const isLandscape = uiRotation !== 0;
  const filteredPrinters = useMemo(() => {
    let result = filter === 'ALL' ? printers : printers.filter(p => p.model === filter);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.serialNumber.toLowerCase().includes(term) || 
        p.model.toLowerCase().includes(term) ||
        (p.partNumber || '').toLowerCase().includes(term) ||
        p.site.toLowerCase().includes(term)
      );
    }
    return result;
  }, [printers, filter, searchTerm]);

  const rotationStyle = { transform: `rotate(${uiRotation}deg)`, transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative transition-all duration-300">
      {/* Header */}
      <header className={`pt-4 px-4 bg-white border-b border-gray-200 z-30 transition-all ${isLandscape ? 'pb-2' : 'pb-4'}`}>
        {/* Top row: Back button + Title + User + Settings */}
        <div className={`flex items-center gap-3 transition-all ${isLandscape ? 'mb-2 pt-2' : 'mb-3 pt-4'}`}>
          <button 
            onClick={onBackToProjects}
            style={rotationStyle}
            className={`${isLandscape ? 'size-9' : 'size-11'} flex items-center justify-center rounded-xl bg-gray-100 text-gray-700 active:scale-95 transition-all hover:bg-gray-200 flex-shrink-0`}
          >
            <span className={`material-symbols-outlined ${isLandscape ? 'text-base' : 'text-xl'}`}>arrow_back_ios_new</span>
          </button>
          
          <h1 className={`font-bold text-gray-900 tracking-tight flex-1 min-w-0 ${isLandscape ? 'text-lg' : 'text-2xl'}`}>
            {activeProject?.name || 'Project Hub'}
          </h1>
          
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)} 
                  style={rotationStyle} 
                  className={`${isLandscape ? 'size-9' : 'size-11'} rounded-full border-2 border-blue-400 p-0.5 overflow-hidden active:scale-90 transition-all hover:border-blue-500`}
                >
                  <img src={user.photoUrl} className="size-full rounded-full object-cover" alt="User" />
                </button>
                {showUserMenu && (
                  <div className="absolute top-12 right-0 w-44 bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-600">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={onLogin} 
                style={rotationStyle} 
                className="h-9 px-4 bg-blue-500 text-white rounded-lg flex items-center gap-2 text-xs font-semibold hover:bg-blue-600 transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">cloud</span>
                <span>Microsoft</span>
              </button>
            )}
            <button 
              onClick={onOpenSettings} 
              style={rotationStyle} 
              className={`${isLandscape ? 'size-9' : 'size-11'} flex items-center justify-center bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition-colors`}
            >
              <span className={`material-symbols-outlined ${isLandscape ? 'text-base' : 'text-xl'}`}>settings</span>
            </button>
          </div>
        </div>

        {/* Asset count */}
        {!isLandscape && (
          <p className="text-xs font-medium text-gray-500 mb-3">
            {filteredPrinters.length} {filteredPrinters.length === 1 ? 'Asset' : 'Assets'}{searchTerm ? ' found' : ' Total'}
          </p>
        )}

        {/* Search bar (portrait only) */}
        {!isLandscape && (
          <div className="mb-3">
            <div className="w-full flex items-center rounded-xl bg-gray-100 border border-transparent gap-3 h-11 px-4">
              <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by SN, part number or site"
                className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="flex-shrink-0 size-5 rounded-full hover:bg-gray-300 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-xs text-gray-500">close</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search bar (landscape mode) */}
        {isLandscape && (
          <div className="mb-2 flex items-center gap-3">
            <div className="flex-1 flex items-center rounded-xl bg-gray-100 border border-transparent gap-3 h-9 px-3">
              <span className="material-symbols-outlined text-gray-400 text-base">search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent outline-none text-xs font-medium text-gray-700 placeholder:text-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="flex-shrink-0 size-4 rounded-full hover:bg-gray-300 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[10px] text-gray-500">close</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter buttons */}
        <div className={`flex gap-2 overflow-x-auto no-scrollbar pt-3 transition-all ${isLandscape ? 'mt-1 pb-1' : 'mt-3 pb-1'}`}>
          {(['ALL'] as const).concat(availableModels).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`flex items-center px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                filter === f ? 'bg-blue-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Printer list */}
      <main className={`flex-1 overflow-y-auto px-5 no-scrollbar transition-all ${isLandscape ? 'pt-3' : 'pt-5'}`}>
        <div className={`grid gap-3 transition-all ${isLandscape ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredPrinters.map((printer, idx) => (
            <PrinterItem key={printer.id} printer={printer} onSelect={onSelectPrinter} isLandscape={isLandscape} index={idx} />
          ))}
        </div>
        {filteredPrinters.length === 0 && (
          <div className="py-24 text-center opacity-30">
            <span className="material-symbols-outlined text-6xl text-gray-400">inventory_2</span>
            <p className="text-sm font-medium text-gray-600 mt-3">No printers found</p>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className={`fixed left-1/2 -translate-x-1/2 z-40 pointer-events-auto transition-all ${isLandscape ? 'bottom-4' : 'bottom-8'}`}>
        <button 
          onClick={onAdd}
          style={rotationStyle}
          className={`bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center shadow-lg hover:shadow-xl transition-all active:scale-95 ${isLandscape ? 'px-6 py-3 gap-2' : 'px-10 py-5 gap-3'}`}
        >
          <span className={`material-symbols-outlined font-semibold ${isLandscape ? 'text-base' : 'text-2xl'}`}>photo_camera</span>
          <span className={`font-semibold tracking-tight ${isLandscape ? 'text-xs' : 'text-base'}`}>Capture</span>
        </button>
      </div>
    </div>
  );
};

export default GalleryScreen;
