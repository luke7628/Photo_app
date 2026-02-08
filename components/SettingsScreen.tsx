
import React, { useState, useEffect } from 'react';
import { UserPreferences, Project } from '../types';

interface SettingsScreenProps {
  settings: UserPreferences;
  onUpdate: (settings: UserPreferences) => void;
  activeProject?: Project;
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onUpdate, activeProject, onBack }) => {
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);
  const [showRebootOverlay, setShowRebootOverlay] = useState(false);

  const updateField = (field: keyof UserPreferences, value: any) => {
    onUpdate({ ...settings, [field]: value });
  };

  const handleReload = () => {
    setIsReloading(true);
    let progress = 0;
    const interval = setInterval(() => {
      // 模拟下载不稳定的进度感
      const increment = Math.random() * 15;
      progress += increment;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // 第一阶段：完成下载
        setReloadProgress(100);
        
        // 第二阶段：安装并重启
        setTimeout(() => {
          setShowRebootOverlay(true);
          setTimeout(() => {
            // 真实刷新页面
            window.location.reload();
          }, 1500);
        }, 800);
      } else {
        setReloadProgress(progress);
      }
    }, 200);
  };

  const projectName = activeProject?.name || 'My_Project';
  const displayPath = `Google Drive${settings.drivePath}${projectName}/${settings.useSubfoldersBySN ? 'SN_123456/' : ''}`;

  return (
    <div className="flex flex-col h-full w-full bg-[#f6f8f6] relative">
      {/* 全屏重启遮罩 - 增强真实感 */}
      {showRebootOverlay && (
        <div className="fixed inset-0 z-[1000] bg-background-dark flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative mb-8">
            <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
            <span className="material-symbols-outlined text-6xl text-primary font-extralight animate-spin [animation-duration:3s]">
              sync
            </span>
          </div>
          <h2 className="text-white text-xl font-black uppercase tracking-[0.3em] animate-pulse">Rebooting</h2>
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest mt-4">Installing System Update v1.5.1</p>
        </div>
      )}

      <header className="pt-14 pb-6 px-6 bg-white border-b border-gray-100 z-10 rounded-b-[2rem] shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="size-11 flex items-center justify-center rounded-2xl bg-slate-50 text-gray-700 hover:bg-primary/10 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">App Settings</h1>
            <p className="text-[10px] font-bold text-sage uppercase tracking-[0.2em] mt-1.5">Field Tech Suite v1.5.0</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar space-y-8">
        {/* Camera Section */}
        <section>
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">photo_camera</span>
            Camera Defaults
          </h2>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-900">Flash Mode</p>
                <p className="text-[10px] font-bold text-gray-400">Default flash state</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['off', 'auto', 'on'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => updateField('defaultFlash', mode)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${settings.defaultFlash === mode ? 'bg-white text-sage shadow-sm' : 'text-gray-400'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-900">Instant Advance</p>
                <p className="text-[10px] font-bold text-gray-400">Skip the review screen</p>
              </div>
              <button 
                onClick={() => updateField('skipReview', !settings.skipReview)}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${settings.skipReview ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`size-6 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.skipReview ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Cloud Sync Section */}
        <section>
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">cloud_sync</span>
            Storage Logic
          </h2>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-900">Auto Upload</p>
                <p className="text-[10px] font-bold text-gray-400">Sync captures instantly</p>
              </div>
              <button 
                onClick={() => updateField('autoUpload', !settings.autoUpload)}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${settings.autoUpload ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`size-6 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.autoUpload ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-900">SN Subfolders</p>
                <p className="text-[10px] font-bold text-gray-400">Organize by Serial Number</p>
              </div>
              <button 
                onClick={() => updateField('useSubfoldersBySN', !settings.useSubfoldersBySN)}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${settings.useSubfoldersBySN ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`size-6 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.useSubfoldersBySN ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Path</p>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-gray-100">
                  <span className="material-symbols-outlined text-gray-400">folder_open</span>
                  <input 
                    type="text" 
                    value={settings.drivePath}
                    onChange={(e) => updateField('drivePath', e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-700 p-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Storage Map</p>
                <div className="bg-background-dark p-4 rounded-2xl border border-white/5 overflow-hidden">
                   <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-primary text-sm mt-0.5">account_tree</span>
                      <p className="text-[11px] font-mono text-primary/80 break-all leading-relaxed tracking-tighter">
                        {displayPath}
                      </p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System & Reload Section */}
        <section>
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">system_update</span>
            Maintenance
          </h2>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-900">Reload Application</p>
                <p className="text-[10px] font-bold text-gray-400 leading-tight">Fetch latest build from cloud.<br/>Persists login and settings.</p>
              </div>
              <button 
                onClick={handleReload}
                disabled={isReloading}
                className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${isReloading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-background-dark text-primary hover:bg-black shadow-lg shadow-black/10'}`}
              >
                {isReloading ? 'Updating...' : 'Reload App'}
              </button>
            </div>
            {isReloading && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-[9px] font-black text-primary uppercase tracking-widest">
                  <span>{reloadProgress < 100 ? 'Downloading Packages' : 'Restarting Engine'}</span>
                  <span>{Math.round(reloadProgress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${reloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="p-6 bg-white border-t border-gray-50 flex flex-col items-center">
        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.3em] mb-2">Connected to dematic-hub-north</p>
        <div className="flex gap-2">
          <div className="size-1.5 rounded-full bg-primary animate-pulse"></div>
          <div className="size-1.5 rounded-full bg-primary opacity-40"></div>
          <div className="size-1.5 rounded-full bg-primary opacity-20"></div>
        </div>
      </footer>
    </div>
  );
};

export default SettingsScreen;
