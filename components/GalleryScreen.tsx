
import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Printer, MicrosoftUser, Project } from '../types';
import { useDeviceOrientation } from '../src/hooks/useDeviceOrientation';
import { getRotationOnlyStyle, getResponsiveSize, getResponsiveValue } from '../src/services/styleService';

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
      className={`w-full text-left group flex items-center ios-card ios-card-pressable rounded-2xl animate-slideUpFast cursor-pointer ${isLandscape ? 'p-2 gap-3' : 'p-3 gap-3.5'}`}
      style={{
        animationDelay: `${index * 30}ms`
      }}
    >
      
      <div className={`rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 shadow-sm transition-all duration-200 group-hover:scale-105 group-active:scale-100 ${isHovered ? 'shadow-md' : ''} ${isLandscape ? 'size-10' : 'size-14'}`}>
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
          <span className={`text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg transition-colors`}>{printer.partNumber || 'N/A'}</span>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [uiRotation, setUiRotation] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 使用共享 Hook 监听设备方向（消除重复代码）
  const { rotation: uiRotationHook, isLandscape } = useDeviceOrientation();

  // 更新本地状态以保持向后兼容
  useEffect(() => {
    setUiRotation(uiRotationHook);
  }, [uiRotationHook]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const filteredPrinters = useMemo(() => {
    let result = printers;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.serialNumber.toLowerCase().includes(term) ||
        (p.partNumber || '').toLowerCase().includes(term) ||
        p.site.toLowerCase().includes(term)
      );
    }
    return result;
  }, [printers, searchTerm]);

  const rotationStyle = useMemo(
    () => getRotationOnlyStyle(uiRotation),
    [uiRotation]
  );

  return (
    <div className="screen-container transition-all duration-300">
      {/* Header with safe-area top padding */}
      <header className={`screen-header px-4 z-30 transition-all flex-shrink-0 ${isLandscape ? 'pb-2' : 'pb-4'}`}>
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
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)} 
                  style={rotationStyle} 
                  className={`${isLandscape ? 'size-9' : 'size-11'} rounded-full border-2 border-blue-300 bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold overflow-hidden active:scale-90 transition-all shadow-md hover:shadow-lg hover:border-blue-400`}
                >
                  {user.photoUrl ? (
                    <img 
                      src={user.photoUrl} 
                      className="size-full rounded-full object-cover" 
                      alt={user.name}
                      onError={(e) => {
                        // Hide broken image, show initials instead
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className={`${user.photoUrl ? 'absolute inset-0 flex items-center justify-center' : ''} text-sm`}>
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </button>
                {showUserMenu && (
                  <div className="absolute top-12 right-0 w-52 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => {
                        onManualSync();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center gap-2 text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-50"
                    >
                      <span className="material-symbols-outlined text-base">cloud_upload</span>
                      <span className="text-sm font-medium">Sync Now</span>
                    </button>
                    <button 
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={onLogin} 
                style={rotationStyle} 
                className="h-9 px-4 bg-blue-500 text-white rounded-xl flex items-center gap-2 text-xs font-semibold hover:bg-blue-600 transition-colors active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">cloud</span>
                <span>Microsoft</span>
              </button>
            )}
            <button 
              onClick={onOpenSettings} 
              style={rotationStyle} 
              className={`${isLandscape ? 'size-9' : 'size-11'} flex items-center justify-center bg-white/80 border border-gray-200 rounded-xl text-gray-700 hover:bg-white transition-all shadow-sm`}
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
            <div className="w-full flex items-center rounded-2xl bg-white/85 backdrop-blur-sm border border-gray-200 gap-3 h-11 px-4 shadow-sm">
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
                  className="flex-shrink-0 size-5 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
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
            <div className="flex-1 flex items-center rounded-xl bg-white/85 backdrop-blur-sm border border-gray-200 gap-3 h-9 px-3 shadow-sm">
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
                  className="flex-shrink-0 size-4 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[10px] text-gray-500">close</span>
                </button>
              )}
            </div>
          </div>
        )}

      </header>

      {/* Printer list */}
      <main 
        className={`screen-content px-5 no-scrollbar transition-all ${isLandscape ? 'landscape pt-3' : 'pt-5'}`}
      >
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
      <div 
        className={`floating-button ${isLandscape ? 'landscape' : ''} z-40 pointer-events-auto transition-all`}
      >
        <button 
          onClick={onAdd}
          style={rotationStyle}
          className={`bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white rounded-full flex items-center shadow-lg hover:shadow-xl transition-all active:scale-95 ${isLandscape ? 'px-6 py-3 gap-2' : 'px-10 py-5 gap-3'}`}
        >
          <span className={`material-symbols-outlined font-semibold ${isLandscape ? 'text-base' : 'text-2xl'}`}>photo_camera</span>
          <span className={`font-semibold tracking-tight ${isLandscape ? 'text-xs' : 'text-base'}`}>Capture</span>
        </button>
      </div>
    </div>
  );
};

export default GalleryScreen;
