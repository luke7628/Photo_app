
import React, { useState, useMemo, memo, useEffect } from 'react';
import { Printer, GoogleUser, Project } from '../types';

interface GalleryScreenProps {
  user: GoogleUser | null;
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
  isLandscape
}: { 
  printer: Printer; 
  onSelect: (p: Printer) => void;
  isLandscape: boolean;
}) => {
  // Determine if the printer photo set is complete (12 photos)
  // We use existing photos array or fallback to syncedCount for legacy/mock data that lacks the array
  const photoCount = printer.photos?.filter(p => p.url).length || 0;
  const isCompleted = photoCount === 12 || (printer.syncedCount === 12 && (!printer.photos || printer.photos.length === 0));

  return (
    <button 
      onClick={() => onSelect(printer)}
      className={`w-full text-left group flex items-center bg-white rounded-xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all ${isLandscape ? 'p-2 gap-3' : 'p-3 gap-3.5'}`}
    >
      <div className={`rounded-lg bg-cream flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 shadow-inner ${isLandscape ? 'size-10' : 'size-14'}`}>
        <img src={printer.imageUrl} className="size-full object-cover" alt={printer.serialNumber} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-black tracking-tight text-slate-800 truncate uppercase ${isLandscape ? 'text-[12px]' : 'text-[14px]'}`}>{printer.serialNumber}</p>
          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
            isCompleted ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-400'
          }`}>
            {isCompleted ? 'Completed' : 'Incomplete'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-widest">{printer.model}</span>
          {!isLandscape && <span className="text-[8px] font-black text-sage uppercase tracking-wider truncate opacity-50">{printer.site}</span>}
        </div>
      </div>
      <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors shrink-0 ${
        printer.syncedCount === 12 ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-400'
      }`}>
        <span className="material-symbols-outlined text-[14px] font-black">
          {printer.syncedCount === 12 ? 'cloud_done' : 'cloud_upload'}
        </span>
        <span className="text-[10px] font-black tabular-nums">{printer.syncedCount}/12</span>
      </div>
    </button>
  );
});

const GalleryScreen: React.FC<GalleryScreenProps> = ({ 
  user, activeProject, onLogin, onLogout, printers, onSearch, onAdd, onSelectPrinter, onPreviewImage, onOpenSettings, onManualSync, onBackToProjects
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ZT411' | 'ZT421'>('ALL');
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
    return filter === 'ALL' ? printers : printers.filter(p => p.model === filter);
  }, [printers, filter]);

  const rotationStyle = { transform: `rotate(${uiRotation}deg)`, transition: 'transform 0.4s ease' };

  return (
    <div className="flex flex-col h-full bg-[#f6f8f6] relative overflow-hidden transition-all duration-300">
      <header className={`safe-pt px-5 bg-white shadow-sm z-30 rounded-b-2xl transition-all ${isLandscape ? 'pb-2' : 'pb-4'}`}>
        <div className={`flex items-center justify-between transition-all ${isLandscape ? 'mb-2 pt-2' : 'mb-4 pt-4'}`}>
          <button 
            onClick={onBackToProjects}
            style={rotationStyle}
            className={`${isLandscape ? 'size-9' : 'size-11'} flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 active:scale-95 transition-all shadow-sm border border-gray-100`}
          >
            <span className={`material-symbols-outlined font-black ${isLandscape ? 'text-[20px]' : 'text-[24px]'}`}>arrow_back_ios_new</span>
          </button>
          
          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} style={rotationStyle} className={`${isLandscape ? 'size-9' : 'size-11'} rounded-full border-2 border-primary/20 p-0.5 overflow-hidden active:scale-90 shadow-sm`}>
                  <img src={user.photoUrl} className="size-full rounded-full object-cover" alt="User" />
                </button>
                {showUserMenu && (
                  <div className="absolute top-12 right-0 w-44 bg-white shadow-2xl rounded-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in origin-top-right">
                    <button onClick={onLogout} className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-red-50 text-red-500">
                      <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={onLogin} style={rotationStyle} className="h-9 px-4 bg-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest">Sign In</button>
            )}
            <button onClick={onOpenSettings} style={rotationStyle} className={`${isLandscape ? 'size-9' : 'size-11'} flex items-center justify-center bg-slate-50 rounded-xl text-slate-500 border border-gray-100 shadow-sm`}>
              <span className={`material-symbols-outlined ${isLandscape ? 'text-[20px]' : 'text-2xl'}`}>settings</span>
            </button>
          </div>
        </div>

        <div className={`transition-all ${isLandscape ? 'flex items-center justify-between gap-5' : ''}`}>
          <div className="flex-1 min-w-0">
             <h2 className={`font-black text-slate-900 tracking-tight uppercase truncate ${isLandscape ? 'text-lg' : 'text-2xl'}`}>
              {activeProject?.name || 'Project Hub'}
            </h2>
            {!isLandscape && (
              <p className="text-[10px] font-black text-sage uppercase tracking-[0.2em] opacity-40 mt-1">
                {printers.length} {printers.length === 1 ? 'Asset' : 'Assets'} Total
              </p>
            )}
          </div>
          <div className={`${isLandscape ? 'w-56' : 'mt-4'}`}>
            <div 
              onClick={onSearch}
              className={`w-full flex items-center rounded-xl bg-gray-100 border border-transparent gap-2 text-gray-400 shadow-inner ${isLandscape ? 'h-9 px-3' : 'h-12 px-4'}`}
            >
              <span className={`material-symbols-outlined text-sage ${isLandscape ? 'text-[20px]' : 'text-[22px]'}`}>search</span>
              <span className={`${isLandscape ? 'text-[9px]' : 'text-xs'} font-black uppercase tracking-widest opacity-60`}>Search Assets</span>
            </div>
          </div>
        </div>

        <div className={`flex gap-1.5 overflow-x-auto no-scrollbar pt-3 transition-all ${isLandscape ? 'mt-1 pb-1' : 'mt-3 pb-1'}`}>
          {['ALL', 'ZT411', 'ZT421'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-sage text-white shadow-md' : 'bg-slate-50 text-gray-500 border border-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <main className={`flex-1 overflow-y-auto px-5 no-scrollbar transition-all ${isLandscape ? 'pt-3 pb-20' : 'pt-5 pb-32'}`}>
        <div className={`grid gap-2.5 transition-all ${isLandscape ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredPrinters.map((printer) => (
            <PrinterItem key={printer.id} printer={printer} onSelect={onSelectPrinter} isLandscape={isLandscape} />
          ))}
        </div>
        {filteredPrinters.length === 0 && (
          <div className="py-24 text-center opacity-10">
            <span className="material-symbols-outlined text-6xl">inventory_2</span>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] mt-3">Empty Queue</p>
          </div>
        )}
      </main>

      <div className={`absolute safe-pb left-1/2 -translate-x-1/2 z-20 transition-all ${isLandscape ? 'bottom-4' : 'bottom-8'}`}>
        <button 
          onClick={onAdd}
          style={rotationStyle}
          className={`bg-primary active:scale-95 text-background-dark rounded-full flex items-center shadow-2xl transition-all ${isLandscape ? 'px-6 py-3 gap-2' : 'px-10 py-5 gap-3.5'}`}
        >
          <span className={`material-symbols-outlined font-black ${isLandscape ? 'text-[20px]' : 'text-2xl'}`}>photo_camera</span>
          <span className={`font-black tracking-widest uppercase ${isLandscape ? 'text-[11px]' : 'text-sm'}`}>Capture</span>
        </button>
      </div>
    </div>
  );
};

export default GalleryScreen;
