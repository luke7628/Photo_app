
import React, { useState } from 'react';
import { Printer, PHOTO_LABELS, PhotoSetItem, GoogleUser, ViewMode } from '../types';

interface DetailsScreenProps {
  printer: Printer;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onBack: () => void;
  onAddPhoto: (index: number) => void;
  onPreviewImage: (photos: PhotoSetItem[], index: number) => void;
  onManualSync: () => void;
  onAllPhotosComplete?: () => void; // 12张照片全部完成时的回调
  onUpdatePrinter?: (printerId: string, updates: Partial<Printer>) => void; // 更新printer信息
  isSyncing?: boolean;
  user: GoogleUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

const SyncIndicator: React.FC<{ isSynced?: boolean, size?: 'sm' | 'md' }> = ({ isSynced, size = 'sm' }) => (
  <div className={`absolute top-2 left-2 flex items-center justify-center rounded-full backdrop-blur-md shadow-sm border ${
    isSynced 
    ? 'bg-green-100/80 border-green-200 text-green-600' 
    : 'bg-red-100/80 border-red-200 text-red-500'
  } ${size === 'sm' ? 'size-5' : 'size-7'}`}>
    <span className="material-symbols-outlined text-[14px] font-black">
      {isSynced ? 'check' : 'close'}
    </span>
  </div>
);

const DetailsScreen: React.FC<DetailsScreenProps> = ({ 
  printer, 
  viewMode,
  setViewMode,
  onBack, 
  onAddPhoto, 
  onPreviewImage,
  onManualSync,
  onAllPhotosComplete,
  onUpdatePrinter,
  isSyncing,
  user,
  onLogin,
  onLogout
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSerial, setEditSerial] = useState('');
  const [editModel, setEditModel] = useState('');

  // Use printer's actual photos, filling with labels
  const photos: PhotoSetItem[] = printer.photos || Array.from({ length: 12 }, (_, i) => ({
    url: '',
    label: PHOTO_LABELS[i],
    filename: `${printer.model}_${printer.serialNumber}_${i + 1}.jpg`,
    isSynced: false
  }));

  const renderContent = () => {
    switch (viewMode) {
      case ViewMode.LIST:
        return (
          <div className="flex flex-col pb-32">
            {photos.map((photo, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 py-2 px-1.5 border-b border-gray-50 active:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => photo.url ? onPreviewImage(photos, index) : onAddPhoto(index)}
              >
                <div className={`size-10 rounded-lg overflow-hidden shrink-0 border relative flex items-center justify-center ${photo.url ? 'border-gray-100 shadow-sm' : 'border-dashed border-gray-200 bg-gray-50 text-gray-400'}`}>
                  {photo.url ? (
                    <>
                      <img src={photo.url} className="size-full object-cover" alt={photo.label} />
                      <div className={`absolute top-0.5 left-0.5 size-3.5 rounded-full border border-white flex items-center justify-center ${photo.isSynced ? 'bg-green-500' : 'bg-red-500'}`}>
                        <span className="material-symbols-outlined text-[9px] text-white font-black">{photo.isSynced ? 'check' : 'close'}</span>
                      </div>
                    </>
                  ) : (
                    <span className="material-symbols-outlined text-xl">add</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold tracking-tight ${photo.url ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {photo.label}
                  </p>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter leading-none mt-0.5">
                    {photo.filename}
                  </p>
                </div>
                <span className="material-symbols-outlined text-gray-300 text-[18px]">
                  {photo.url ? 'chevron_right' : 'arrow_forward'}
                </span>
              </div>
            ))}
          </div>
        );
      case ViewMode.LARGE:
        return (
          <div className="flex flex-col gap-5 pb-40 px-2">
            {photos.map((photo, index) => (
              <div key={index} className="flex flex-col gap-2 group cursor-pointer" onClick={() => photo.url ? onPreviewImage(photos, index) : onAddPhoto(index)}>
                <div className={`relative aspect-video rounded-xl overflow-hidden flex items-center justify-center border-2 transition-all ${photo.url ? 'bg-slate-100 border-white shadow-md' : 'bg-gray-50 border-dashed border-gray-200'}`}>
                  {photo.url ? (
                    <>
                      <img src={photo.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={photo.label} />
                      <SyncIndicator isSynced={photo.isSynced} size="md" />
                      <div className="absolute top-2 right-2 bg-background-dark/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">{index + 1} / 12</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-300">
                      <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                      <p className="text-[9px] font-black uppercase tracking-widest">Capture {photo.label}</p>
                    </div>
                  )}
                </div>
                <div className="px-2 flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-black tracking-tight leading-none ${photo.url ? 'text-gray-900' : 'text-gray-400'}`}>{photo.label}</p>
                    <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-widest leading-none">
                      {photo.filename}
                    </p>
                  </div>
                  <button className="size-8 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors text-base">
                    <span className="material-symbols-outlined">{photo.url ? 'zoom_in' : 'camera'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      case ViewMode.GRID:
      default:
        return (
          <div className="grid grid-cols-3 gap-1.5 pb-32 px-2">
            {photos.map((photo, index) => (
              <button 
                key={index} 
                className="flex flex-col gap-1 group cursor-pointer active:scale-95 transition-transform"
                onClick={() => photo.url ? onPreviewImage(photos, index) : onAddPhoto(index)}
              >
                <div className={`relative aspect-square rounded-lg overflow-hidden flex items-center justify-center border transition-all ${photo.url ? 'bg-gray-100 border-gray-200 shadow-sm group-hover:shadow-md group-hover:scale-105' : 'bg-blue-50 border-2 border-dashed border-blue-300 hover:bg-blue-100'}`}>
                  {photo.url ? (
                    <>
                      <img src={photo.url} className="w-full h-full object-cover" alt={photo.label} />
                      <div className={`absolute top-1.5 left-1.5 flex items-center justify-center rounded-full size-5 border-2 border-white shadow-md ${
                        photo.isSynced 
                        ? 'bg-green-500' 
                        : 'bg-orange-500'
                      }`}>
                        <span className="material-symbols-outlined text-xs text-white font-bold">
                          {photo.isSynced ? 'check' : 'schedule'}
                        </span>
                      </div>
                      <div className="absolute top-1.5 right-1.5 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/20">
                        <p className="text-[8px] font-semibold text-white leading-none\">{index + 1}/12</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="material-symbols-outlined text-2xl text-blue-400">add_a_photo</span>
                      <p className="text-[8px] font-semibold text-blue-500 text-center px-0.5 leading-none">Tap</p>
                    </div>
                  )}
                </div>
                <div className="px-0.5">
                  <p className={`text-[10px] font-semibold truncate leading-none ${photo.url ? 'text-gray-900' : 'text-gray-500'}`}>
                    {photo.label}
                  </p>
                  {photo.url && <p className="text-[7px] text-gray-400 mt-0.5 truncate leading-none">{photo.filename}</p>}
                </div>
              </button>
            ))}
          </div>
        );
    }
  };

  const capturedCount = photos.filter(p => p.url).length;

  const handleOpenEdit = () => {
    setEditSerial(printer.serialNumber);
    setEditModel(printer.model);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editSerial.trim() || !editModel.trim()) {
      return;
    }
    onUpdatePrinter?.(printer.id, {
      serialNumber: editSerial.trim(),
      model: editModel.trim()
    });
    setShowEditModal(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden animate-in fade-in duration-300 relative">
      <header className="pt-14 pb-3 px-5 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button 
            onClick={onBack}
            className="size-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-700 hover:bg-primary/10 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          
          <div className="flex-1 flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sage text-[12px]">check_circle</span>
              <span className="text-[10px] font-bold text-sage">{capturedCount}/12 Steps Done</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="size-10 rounded-full border-2 border-primary/20 p-0.5 overflow-hidden active:scale-90 transition-transform"
                  >
                    <img src={user.photoUrl} className="size-full rounded-full object-cover" alt="User" />
                  </button>
                  {showUserMenu && (
                    <div className="absolute top-12 right-0 w-48 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-[11px] font-black text-gray-900 truncate leading-none mb-1">{user.name}</p>
                        <p className="text-[9px] font-bold text-gray-400 truncate leading-none">{user.email}</p>
                      </div>
                      <button onClick={() => { onLogout(); setShowUserMenu(false); }} className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-red-50 text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  onClick={onManualSync}
                  className={`size-10 flex items-center justify-center rounded-xl transition-all ${isSyncing ? 'text-primary bg-background-dark/10' : 'bg-gray-50 text-gray-400 hover:text-sage'}`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isSyncing ? 'animate-[spin_3s_linear_infinite]' : ''}`}>
                    sync
                  </span>
                </button>
              </>
            ) : (
              <button 
                onClick={onLogin}
                className="h-10 px-3 bg-slate-100 rounded-xl flex items-center gap-2 text-slate-700 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Prominent Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-3 border-2 border-blue-200 shadow-sm relative">
          <button
            onClick={handleOpenEdit}
            className="absolute top-2 right-2 size-7 rounded-lg bg-white border border-blue-300 flex items-center justify-center hover:bg-blue-50 transition-all active:scale-95"
            title="Edit Serial Number & Model"
          >
            <span className="material-symbols-outlined text-blue-500 text-sm">edit</span>
          </button>
          
          <div className="flex items-start gap-4 pr-9">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Serial Number</div>
              <div className="text-base font-black text-gray-900 tracking-tight uppercase break-all">
                {printer.serialNumber}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Model Type</div>
              <div className="text-base font-black text-gray-700 tracking-wide uppercase whitespace-nowrap">
                {printer.model}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar bg-white">
        <div className="sticky top-0 bg-white z-10 px-5 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-6 bg-sage/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-sage text-[14px]">photo_library</span>
              </div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Components</h2>
            </div>
            
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button 
                onClick={() => setViewMode(ViewMode.LIST)}
                className={`px-2 py-1 rounded-md flex items-center justify-center transition-all ${viewMode === ViewMode.LIST ? 'bg-white text-sage shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.GRID)}
                className={`px-2 py-1 rounded-md flex items-center justify-center transition-all ${viewMode === ViewMode.GRID ? 'bg-white text-sage shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.LARGE)}
                className={`px-2 py-1 rounded-md flex items-center justify-center transition-all ${viewMode === ViewMode.LARGE ? 'bg-white text-sage shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <span className="material-symbols-outlined text-[16px]">view_agenda</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">

        {renderContent()}
      </main>

      {capturedCount < 12 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <button 
            onClick={() => {
              const nextIdx = photos.findIndex(p => !p.url);
              onAddPhoto(nextIdx !== -1 ? nextIdx : 0);
            }}
            className="bg-primary hover:scale-105 active:scale-95 text-background-dark px-8 py-4 rounded-full flex items-center gap-3 shadow-xl transition-all"
          >
            <span className="material-symbols-outlined text-xl font-bold">add_a_photo</span>
            <span className="font-black text-xs tracking-widest uppercase">Resume Capture</span>
          </button>
        </div>
      )}

      {capturedCount === 12 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <button 
            onClick={() => {
              onAllPhotosComplete?.();
              onBack();
            }}
            className="bg-green-500 hover:scale-105 active:scale-95 text-white px-12 py-4 rounded-full flex items-center gap-3 shadow-xl transition-all"
          >
            <span className="material-symbols-outlined text-xl font-bold">check_circle</span>
            <span className="font-black text-xs tracking-widest uppercase">Complete</span>
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Edit Information</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="size-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="material-symbols-outlined text-gray-400">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value.toUpperCase())}
                  className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-black text-gray-900 uppercase focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="Enter serial number"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Model Type
                </label>
                <input
                  type="text"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value.toUpperCase())}
                  className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-black text-gray-900 uppercase focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="Enter model type"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 h-12 bg-gray-200 text-gray-700 rounded-xl font-black text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 h-12 bg-blue-500 text-white rounded-xl font-black text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!editSerial.trim() || !editModel.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailsScreen;
