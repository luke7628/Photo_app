
import React, { useState, useEffect } from 'react';
import { UserPreferences, Project, MicrosoftUser } from '../types';

interface SettingsScreenProps {
  settings: UserPreferences;
  onUpdate: (settings: UserPreferences) => void;
  activeProject?: Project;
  user: MicrosoftUser | null;
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onUpdate, activeProject, user, onBack }) => {
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);
  const [showRebootOverlay, setShowRebootOverlay] = useState(false);

  const updateField = (field: keyof UserPreferences, value: any) => {
    onUpdate({ ...settings, [field]: value });
  };

  // Auto-update cloudProvider based on login status
  useEffect(() => {
    if (user) {
      // Logged in with Microsoft -> set to OneDrive
      if (settings.cloudProvider !== 'onedrive') {
        updateField('cloudProvider', 'onedrive');
      }
    } else {
      // Not logged in -> set to none
      if (settings.cloudProvider !== 'none') {
        updateField('cloudProvider', 'none');
      }
    }
  }, [user]);

  const handleReload = async () => {
    setIsReloading(true);
    let progress = 0;
    const interval = setInterval(() => {
      // Simulate download progress with variation
      const increment = Math.random() * 15;
      progress += increment;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Phase 1: Complete download
        setReloadProgress(100);
        
        // Phase 2: Install and restart
        setTimeout(() => {
          setShowRebootOverlay(true);
          setTimeout(async () => {
            // Perform platform-optimized reload
            await reloadApp();
          }, 1500);
        }, 800);
      } else {
        setReloadProgress(progress);
      }
    }, 200);
  };

  /**
   * Clear caches and reload the web application
   */
  const reloadApp = async () => {
    try {
      // Clear all Cache API caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✓ Cache cleared:', cacheNames.length, 'caches');
      }

      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        console.log('✓ Service workers unregistered:', registrations.length);
      }

      // Force reload bypassing cache
      window.location.reload();
    } catch (error) {
      console.error('Failed to reload app:', error);
      // Fallback: simple reload
      window.location.reload();
    }
  };


  const projectName = activeProject?.name || 'My_Project';
  const cloudServiceName = settings.cloudProvider === 'onedrive' ? 'OneDrive' : 'Local Storage';
  const displayPath = `${cloudServiceName}${settings.drivePath}${projectName}/${settings.useSubfoldersBySN ? 'SN_123456/' : ''}`;

  return (
    <div className="screen-container">
      {isReloading && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 shadow-2xl w-full mx-4 max-w-sm">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute -inset-6 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
                <span className="material-symbols-outlined text-5xl text-blue-500 relative" style={{animation: 'spin 2s linear infinite'}}>
                  cloud_download
                </span>
              </div>
            </div>
            <h2 className="text-center text-lg font-bold text-gray-900 mb-2">Updating...</h2>
            <p className="text-center text-sm text-gray-600 mb-6">Installing latest version</p>
            
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-semibold text-gray-600">
                <span>Progress</span>
                <span>{Math.round(reloadProgress)}%</span>
              </div>
              <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 rounded-full shadow-lg"
                  style={{ width: `${reloadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reboot Overlay */}
      {showRebootOverlay && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center animate-fadeIn">
          <div className="relative mb-8">
            <div className="absolute -inset-8 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
            <span className="material-symbols-outlined text-5xl sm:text-6xl text-blue-500 animate-spin">
              sync
            </span>
          </div>
          <h2 className="text-white text-lg sm:text-2xl font-bold">Updating...</h2>
          <p className="text-blue-400 text-xs sm:text-sm mt-4">Installing latest version</p>
        </div>
      )}

      {/* Header with safe-area padding */}
      <header className="screen-header px-4 sm:px-6 py-4 sm:py-5 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors active:scale-90"
            title="Back"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Settings</h1>
            <p className="text-xs text-gray-500 mt-0.5">App Configuration</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main 
        className="screen-content px-4 sm:px-6 py-4 sm:py-6 no-scrollbar space-y-4 sm:space-y-6"
      >
        {/* Camera Section */}
        <section>
          <h2 className="text-xs sm:text-sm font-bold text-gray-600 mb-3 flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-base text-gray-400">photo_camera</span>
            Camera
          </h2>
          <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Flash Mode</p>
                <p className="text-xs text-gray-500 mt-0.5">Default flash setting</p>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg ml-4 gap-1">
                {(['off', 'auto', 'on'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => updateField('defaultFlash', mode)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                      settings.defaultFlash === mode 
                        ? 'bg-white text-blue-500 shadow-md shadow-blue-200 border border-blue-100' 
                        : 'text-gray-500 hover:text-gray-700 active:bg-gray-200'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px bg-gray-100"></div>
            <div className="flex items-center justify-between group">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Skip Review</p>
                <p className="text-xs text-gray-500 mt-0.5">Auto-advance after capture</p>
              </div>
              <button 
                onClick={() => updateField('skipReview', !settings.skipReview)}
                className={`w-12 h-7 sm:w-14 sm:h-8 flex-shrink-0 rounded-full p-1 transition-all duration-300 ml-4 flex items-center ${
                  settings.skipReview 
                    ? 'bg-blue-500 shadow-md shadow-blue-200' 
                    : 'bg-gray-300 shadow-sm'
                } active:scale-95`}
              >
                <div className={`w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                  settings.skipReview ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Cloud Sync Section */}
        <section>
          <h2 className="text-xs sm:text-sm font-bold text-gray-600 mb-3 flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-base text-gray-400">cloud_sync</span>
            Cloud Storage
          </h2>
          <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Cloud Provider</p>
                <p className="text-xs text-gray-500 mt-0.5">{user ? 'Auto-set based on login' : 'Login to enable cloud sync'}</p>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg ml-4">
                <div className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${settings.cloudProvider === 'none' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-500'}`}>
                  None
                </div>
                <div className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${settings.cloudProvider === 'onedrive' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-500'}`}>
                  OneDrive
                </div>
              </div>
            </div>
            <div className="h-px bg-gray-100"></div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Auto Upload</p>
                <p className="text-xs text-gray-500 mt-0.5">Sync photos to cloud</p>
              </div>
              <button 
                onClick={() => updateField('autoUpload', !settings.autoUpload)}
                className={`w-12 h-7 sm:w-14 sm:h-8 flex-shrink-0 rounded-full p-1 transition-colors ml-4 ${settings.autoUpload ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-md transition-transform ${settings.autoUpload ? 'translate-x-5 sm:translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="h-px bg-gray-100"></div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Organize by Serial</p>
                <p className="text-xs text-gray-500 mt-0.5">Create folders per device</p>
              </div>
              <button 
                onClick={() => updateField('useSubfoldersBySN', !settings.useSubfoldersBySN)}
                className={`w-12 h-7 sm:w-14 sm:h-8 flex-shrink-0 rounded-full p-1 transition-all duration-300 ml-4 flex items-center ${
                  settings.useSubfoldersBySN 
                    ? 'bg-blue-500 shadow-md shadow-blue-200' 
                    : 'bg-gray-300 shadow-sm'
                } active:scale-95`}
              >
                <div className={`w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                  settings.useSubfoldersBySN ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="h-px bg-gray-100 mt-4"></div>
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-gray-600">Storage Path</label>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200">
                <span className="material-symbols-outlined text-sm text-gray-400 flex-shrink-0">folder</span>
                <input 
                  type="text" 
                  value={settings.drivePath}
                  onChange={(e) => updateField('drivePath', e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-medium text-gray-700 p-0 min-w-0"
                  placeholder="/Drive/Path/"
                />
              </div>
              
              <div className="bg-gray-900 text-gray-300 p-3 rounded-lg border border-gray-700 text-xs font-mono overflow-x-auto">
                <div className="whitespace-nowrap text-xs">{displayPath}</div>
              </div>
            </div>
          </div>
        </section>

        {/* System Section */}
        <section>
          <h2 className="text-xs sm:text-sm font-bold text-gray-600 mb-3 flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-base text-gray-400">settings_suggest</span>
            System
          </h2>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-md border border-gray-700 hover:shadow-lg hover:border-gray-600 transition-all duration-200">
            <div className="flex items-center justify-between group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Refresh App</p>
                <p className="text-xs text-gray-400 mt-0.5">Reload from cloud</p>
              </div>
              <button 
                onClick={handleReload}
                disabled={isReloading}
                className={`flex-shrink-0 ml-4 px-3 sm:px-5 py-2.5 rounded-lg text-white text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                  isReloading
                    ? 'bg-blue-500/50'
                    : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
                }`}
              >
                {isReloading ? 'Updating...' : 'Refresh'}
              </button>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
};

export default SettingsScreen;
