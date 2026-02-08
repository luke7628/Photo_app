
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppScreen, Printer, Project, PHOTO_LABELS, PhotoSetItem, UserPreferences, GoogleUser, ViewMode } from './types';
import { MOCK_PRINTERS, MOCK_PROJECTS } from './constants';
import { storageService } from './services/storageService';
import { googleDriveService } from './services/googleDriveService';
import { analyzePrinterPhoto } from './geminiService';
import SplashScreen from './components/SplashScreen';
import GalleryScreen from './components/GalleryScreen';
import SearchScreen from './components/SearchScreen';
import CameraScreen from './components/CameraScreen';
import ReviewScreen from './components/ReviewScreen';
import DetailsScreen from './components/DetailsScreen';
import ImagePreviewScreen from './components/ImagePreviewScreen';
import SettingsScreen from './components/SettingsScreen';
import ProjectListScreen from './components/ProjectListScreen';

// !!! IMPORTANT CONFIGURATION !!!
// 1. Go to Google Cloud Console (https://console.cloud.google.com)
// 2. Create a project or select existing one
// 3. Enable "Google Drive API" in "APIs & Services" -> "Library"
// 4. Go to "Credentials", create "OAuth client ID" (Web application)
// 5. Add "http://localhost:3000" (or your domain) to "Authorized JavaScript origins"
// 6. Paste the Client ID below:
const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com"; 

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.SPLASH);
  const [lastScreen, setLastScreen] = useState<AppScreen>(AppScreen.GALLERY);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [detailsViewMode, setDetailsViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [settings, setSettings] = useState<UserPreferences>({
    defaultFlash: 'auto',
    skipReview: false,
    autoUpload: true,
    drivePath: '/Dematic/FieldPhotos/',
    useSubfoldersBySN: true,
    imageQuality: 'original'
  });

  const [sessionIndex, setSessionIndex] = useState<number>(0);
  const [sessionPhotos, setSessionPhotos] = useState<PhotoSetItem[]>([]);
  const [sessionData, setSessionData] = useState<{ serialNumber: string; model: string } | null>(null);
  const [baseSerialNumber, setBaseSerialNumber] = useState<string>('');
  const [baseModel, setBaseModel] = useState<string>('ZT411');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSingleRetake, setIsSingleRetake] = useState<boolean>(false);
  const [previewPhotos, setPreviewPhotos] = useState<PhotoSetItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Initialize Google OAuth2 Token Client safely
  useEffect(() => {
    const initGoogle = () => {
      if ((window as any).google && (window as any).google.accounts) {
        setIsGoogleReady(true);
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: async (tokenResponse: any) => {
              if (tokenResponse && tokenResponse.access_token) {
                googleDriveService.setToken(tokenResponse.access_token);
                
                // Fetch User Profile
                try {
                  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                  });
                  if (!res.ok) throw new Error('Failed to fetch profile');
                  const profile = await res.json();
                  const googleUser: GoogleUser = { 
                    name: profile.name, 
                    email: profile.email, 
                    photoUrl: profile.picture 
                  };
                  setUser(googleUser);
                  storageService.saveUser(googleUser);
                } catch (e) {
                  console.error("Profile Fetch Error", e);
                }
              }
            },
          });
          setTokenClient(client);
        } catch (err) {
          console.error("Google Auth Init Error:", err);
        }
      } else {
        // Retry if script not loaded yet
        setTimeout(initGoogle, 500);
      }
    };

    initGoogle();
  }, []);

  const handleLogin = useCallback(() => {
    if (GOOGLE_CLIENT_ID.includes("YOUR_CLIENT_ID")) {
      alert("Please configure the GOOGLE_CLIENT_ID in App.tsx to enable real login.");
      return;
    }
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      console.warn("Google Token Client not ready. Check internet connection or API config.");
    }
  }, [tokenClient]);

  const handleLogout = useCallback(() => {
    setUser(null);
    storageService.saveUser(null);
    googleDriveService.setToken("");
    if ((window as any).google && googleDriveService.accessToken) {
      (window as any).google.accounts.oauth2.revoke(googleDriveService.accessToken, () => {});
    }
  }, []);

  const updatePrinter = useCallback((printerId: string, updates: Partial<Printer>) => {
    setPrinters(prev => {
      const updated = prev.map(p => p.id === printerId ? { ...p, ...updates } : p);
      storageService.savePrinters(updated);
      return updated;
    });
    // Update selectedPrinter if it's the one being updated
    if (selectedPrinter?.id === printerId) {
      setSelectedPrinter(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedPrinter]);

  useEffect(() => {
    const initAppData = async () => {
      const savedProjects = storageService.loadProjects();
      const savedPrinters = await storageService.loadPrinters(); // Async IDB
      const savedUser = storageService.loadUser();
      const savedSettings = storageService.loadSettings();
      
      // 合并MOCK数据，确保测试项目存在
      let finalProjects = savedProjects || [];
      let finalPrinters = savedPrinters || [];
      
      // 如果没有测试项目，添加它
      const hasTestProject = finalProjects.some(p => p.id === 'proj-test');
      if (!hasTestProject) {
        const testProject = MOCK_PROJECTS.find(p => p.id === 'proj-test');
        const testPrinters = MOCK_PRINTERS.filter(p => p.projectId === 'proj-test');
        if (testProject) {
          finalProjects = [testProject, ...finalProjects];
          finalPrinters = [...testPrinters, ...finalPrinters];
          storageService.saveProjects(finalProjects);
          storageService.savePrinters(finalPrinters);
        }
      }
      
      // 如果完全没有数据，使用MOCK数据
      if (finalProjects.length === 0) finalProjects = MOCK_PROJECTS;
      if (finalPrinters.length === 0) finalPrinters = MOCK_PRINTERS;
      
      setProjects(finalProjects);
      setPrinters(finalPrinters);
      if (savedUser) setUser(savedUser);
      if (savedSettings) setSettings(savedSettings);

      const timer = setTimeout(() => setCurrentScreen(AppScreen.PROJECT_LIST), 2500);
      return () => { clearTimeout(timer); };
    };

    initAppData();
  }, []);

  // Persist Printers to IndexedDB whenever state changes
  useEffect(() => {
    if (printers.length > 0) {
      storageService.savePrinters(printers).catch(console.error);
    }
  }, [printers]);

  // Persist other small configs
  useEffect(() => { storageService.saveProjects(projects); }, [projects]);
  useEffect(() => { storageService.saveSettings(settings); }, [settings]);

  // Real Sync Cycle to Google Drive
  const performSyncCycle = useCallback(async () => {
    // Requirements: AutoUpload ON, User Logged In, Access Token Available
    if (!settings.autoUpload || !user || !googleDriveService.accessToken) return;
    
    // Find a printer that has unsynced photos and is not currently syncing
    const targetPrinter = printers.find(p => {
      const hasUnsynced = p.photos?.some(ph => ph.url && !ph.isSynced);
      return hasUnsynced && !p.isSyncing;
    });

    if (!targetPrinter) return;
    
    // Mark as syncing in UI
    setPrinters(prev => prev.map(p => p.id === targetPrinter.id ? { ...p, isSyncing: true } : p));
    if (selectedPrinter?.id === targetPrinter.id) {
      setSelectedPrinter(prev => prev ? { ...prev, isSyncing: true } : null);
    }

    try {
      // 1. Ensure Root Folder "Dematic Field Photos"
      const rootFolderId = await googleDriveService.ensureFolder('Dematic Field Photos');
      if (!rootFolderId) throw new Error("Could not create/find root folder");

      // 2. Ensure Project Folder
      const project = projects.find(p => p.id === targetPrinter.projectId);
      const projectName = project ? project.name : 'Unassigned Project';
      const projectFolderId = await googleDriveService.ensureFolder(projectName, rootFolderId);
      if (!projectFolderId) throw new Error("Could not create/find project folder");

      // 3. Ensure Serial Number Folder (if enabled)
      let targetFolderId = projectFolderId;
      if (settings.useSubfoldersBySN) {
        targetFolderId = await googleDriveService.ensureFolder(targetPrinter.serialNumber, projectFolderId);
      }

      if (!targetFolderId) throw new Error("Could not create/find target folder");

      // 4. Upload Photos
      const photos = targetPrinter.photos || [];
      const updatedPhotos = [...photos];
      let hasChanges = false;

      for (let i = 0; i < updatedPhotos.length; i++) {
        const photo = updatedPhotos[i];
        if (photo.url && !photo.isSynced) {
          try {
            await googleDriveService.uploadImage(photo.url, photo.filename, targetFolderId);
            updatedPhotos[i] = { ...photo, isSynced: true };
            hasChanges = true;
          } catch (uploadError) {
             console.error(`Failed to upload ${photo.filename}`, uploadError);
             // Continue to next photo
          }
        }
      }

      // 5. Update State
      if (hasChanges) {
        setPrinters(currentPrinters => {
          return currentPrinters.map(p => {
            if (p.id === targetPrinter.id) {
              const newSyncedCount = updatedPhotos.filter(ph => ph.isSynced).length;
              const updatedPrinter = {
                ...p,
                photos: updatedPhotos,
                syncedCount: newSyncedCount,
                isSyncing: false,
                lastSync: new Date().toISOString()
              };
              // Update selected printer if it's the one being synced
              if (selectedPrinter?.id === p.id) setSelectedPrinter(updatedPrinter);
              return updatedPrinter;
            }
            return p;
          });
        });
      } else {
        // No changes but we need to clear the syncing flag
        setPrinters(prev => prev.map(p => p.id === targetPrinter.id ? { ...p, isSyncing: false } : p));
        if (selectedPrinter?.id === targetPrinter.id) setSelectedPrinter(prev => prev ? { ...prev, isSyncing: false } : null);
      }

    } catch (error) {
      console.error("Sync Cycle Error:", error);
      // Reset syncing flag on error
      setPrinters(prev => prev.map(p => p.id === targetPrinter.id ? { ...p, isSyncing: false } : p));
      if (selectedPrinter?.id === targetPrinter.id) setSelectedPrinter(prev => prev ? { ...prev, isSyncing: false } : null);
    }
  }, [settings.autoUpload, user, printers, projects, selectedPrinter, settings.useSubfoldersBySN]);

  useEffect(() => {
    let interval: number;
    // Run sync cycle every 5 seconds if conditions met
    if (settings.autoUpload && user && googleDriveService.accessToken) {
      interval = window.setInterval(performSyncCycle, 5000); 
    }
    return () => clearInterval(interval);
  }, [settings.autoUpload, user, performSyncCycle]);

  const handleCapture = (base64: string) => {
    setCapturedImage(base64);
    
    if (settings.skipReview) {
      // Skip review screen if configured
      if (sessionIndex === 0 && !isSingleRetake) {
        setIsAnalyzing(true);
        const cleanBase64 = base64.split(',')[1];
        analyzePrinterPhoto(cleanBase64)
          .then(result => { 
            setBaseSerialNumber(result.serialNumber);
            setBaseModel(result.model);
            setSessionData({ serialNumber: result.serialNumber, model: result.model });
            // Auto-confirm after analysis
            setTimeout(() => {
              const newData = { serialNumber: result.serialNumber, model: result.model };
              processConfirmation(base64, newData);
            }, 300);
          })
          .catch(() => { 
            const fallbackData = { serialNumber: "", model: "ZT411" };
            setBaseSerialNumber("");
            setBaseModel("ZT411");
            setSessionData(fallbackData);
            // Auto-confirm with fallback data
            setTimeout(() => {
              processConfirmation(base64, fallbackData);
            }, 300);
          })
          .finally(() => setIsAnalyzing(false));
      } else {
        // For Step 2-12, use base serial with suffix
        const suffixedSerial = baseSerialNumber ? `${baseSerialNumber}_${sessionIndex + 1}` : `SERIAL_${sessionIndex + 1}`;
        const currentData = { serialNumber: suffixedSerial, model: baseModel };
        setSessionData(currentData);
        setTimeout(() => {
          processConfirmation(base64, currentData);
        }, 100);
      }
    } else {
      // Show review screen if skipReview is false
      setCurrentScreen(AppScreen.REVIEW);
      if (sessionIndex === 0 && !isSingleRetake) {
        setIsAnalyzing(true);
        const cleanBase64 = base64.split(',')[1];
        analyzePrinterPhoto(cleanBase64)
          .then(result => { 
            setBaseSerialNumber(result.serialNumber);
            setBaseModel(result.model);
            setSessionData({ serialNumber: result.serialNumber, model: result.model });
          })
          .catch(() => { 
            setBaseSerialNumber("");
            setBaseModel("ZT411");
            setSessionData({ serialNumber: "", model: "ZT411" });
          })
          .finally(() => setIsAnalyzing(false));
      } else {
        // For Step 2-12, use base serial with suffix
        const suffixedSerial = baseSerialNumber ? `${baseSerialNumber}_${sessionIndex + 1}` : `SERIAL_${sessionIndex + 1}`;
        setSessionData({ serialNumber: suffixedSerial, model: baseModel });
        setIsAnalyzing(false);
      }
    }
  };

  const finalizeSession = useCallback((finalPhotos: PhotoSetItem[], data: { serialNumber: string; model: string }) => {
    const completePhotos: PhotoSetItem[] = PHOTO_LABELS.map((label, i) => {
      const existing = finalPhotos.find(p => p.label === label);
      return existing || { url: '', label, filename: `${data.model}_${data.serialNumber}_${i + 1}.jpg`, isSynced: false };
    });

    const newPrinter: Printer = { 
      id: selectedPrinter?.id || `local-${Date.now()}`, 
      projectId: activeProjectId || 'proj-1', 
      serialNumber: data.serialNumber, 
      model: data.model as any, 
      site: 'Site Alpha', 
      imageUrl: completePhotos.find(p => p.url)?.url || '', 
      photos: completePhotos, 
      syncedCount: completePhotos.filter(p => p.isSynced).length 
    };

    setPrinters(prev => {
      if (selectedPrinter) {
        return prev.map(p => p.id === selectedPrinter.id ? newPrinter : p);
      } else {
        return [newPrinter, ...prev];
      }
    });
    
    setSelectedPrinter(newPrinter);
    setSessionIndex(0);
    setSessionPhotos([]);
    setSessionData(null);
    setBaseSerialNumber('');
    setBaseModel('ZT411');
    setIsSingleRetake(false);
    setCurrentScreen(AppScreen.DETAILS);
  }, [selectedPrinter, activeProjectId]);

  const processConfirmation = useCallback((img: string, data: { serialNumber: string; model: string }) => {
    const newPhoto: PhotoSetItem = { 
      url: img, 
      label: PHOTO_LABELS[sessionIndex], 
      filename: `${data.model}_${data.serialNumber}_${sessionIndex + 1}.jpg`, 
      isSynced: false 
    };

    if (isSingleRetake && selectedPrinter) {
      const currentPhotos = selectedPrinter.photos || [];
      const updatedPhotos = [...currentPhotos];
      updatedPhotos[sessionIndex] = newPhoto;
      const updatedPrinter = { ...selectedPrinter, photos: updatedPhotos, imageUrl: sessionIndex === 0 ? img : selectedPrinter.imageUrl, syncedCount: updatedPhotos.filter(p => p.isSynced).length };
      setPrinters(prev => prev.map(p => p.id === selectedPrinter.id ? updatedPrinter : p));
      setSelectedPrinter(updatedPrinter);
      setCurrentScreen(lastScreen);
      setIsSingleRetake(false);
      return;
    }

    const updatedSessionPhotos = [...sessionPhotos, newPhoto];
    setSessionPhotos(updatedSessionPhotos);

    if (sessionIndex < 11) {
      setSessionIndex(prev => prev + 1);
      setCurrentScreen(AppScreen.CAMERA);
    } else {
      finalizeSession(updatedSessionPhotos, data);
    }
  }, [isSingleRetake, selectedPrinter, sessionIndex, sessionPhotos, lastScreen, finalizeSession]);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const activePrinters = useMemo(() => printers.filter(p => p.projectId === activeProjectId), [printers, activeProjectId]);

  return (
    <div className="fixed inset-0 bg-white overflow-hidden flex flex-col">
      <div key={currentScreen} className="w-full h-full screen-enter flex flex-col overflow-hidden">
        {currentScreen === AppScreen.SPLASH && <SplashScreen />}
        {currentScreen === AppScreen.PROJECT_LIST && <ProjectListScreen projects={projects} printers={printers} onSelectProject={(id) => { setActiveProjectId(id); setCurrentScreen(AppScreen.GALLERY); }} onCreateProject={(name) => setProjects([{ id: `p-${Date.now()}`, name, printerIds: [], createdAt: new Date().toISOString() }, ...projects])} onRenameProject={(id, newName) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p))} onDeleteProject={(id) => { setProjects(prev => prev.filter(p => p.id !== id)); setPrinters(prev => prev.filter(p => p.projectId !== id)); }} onOpenSettings={() => setCurrentScreen(AppScreen.SETTINGS)} user={user} onLogin={handleLogin} onLogout={handleLogout} />}
        {currentScreen === AppScreen.GALLERY && <GalleryScreen user={user} activeProject={activeProject} onLogin={handleLogin} onLogout={handleLogout} printers={activePrinters} onSearch={() => setCurrentScreen(AppScreen.SEARCH)} onAdd={() => { setSessionIndex(0); setSessionPhotos([]); setSessionData(null); setIsSingleRetake(false); setSelectedPrinter(null); setCurrentScreen(AppScreen.CAMERA); }} onSelectPrinter={(p) => { setSelectedPrinter(p); setCurrentScreen(AppScreen.DETAILS); }} onPreviewImage={(url) => { setPreviewPhotos([{url, label: 'Preview', filename: 'p.jpg'}]); setPreviewIndex(0); setLastScreen(AppScreen.GALLERY); setCurrentScreen(AppScreen.PREVIEW); }} onOpenSettings={() => setCurrentScreen(AppScreen.SETTINGS)} onManualSync={performSyncCycle} onBackToProjects={() => setCurrentScreen(AppScreen.PROJECT_LIST)} />}
        {currentScreen === AppScreen.CAMERA && <CameraScreen sessionIndex={sessionIndex} isSingleRetake={isSingleRetake} initialFlash={settings.defaultFlash} onClose={() => { if (sessionPhotos.length > 0 && sessionData) finalizeSession(sessionPhotos, sessionData); else { setCurrentScreen(isSingleRetake ? lastScreen : AppScreen.GALLERY); setIsSingleRetake(false); } }} onCapture={handleCapture} />}
        {currentScreen === AppScreen.REVIEW && <ReviewScreen imageUrl={capturedImage!} data={sessionData!} isAnalyzing={isAnalyzing} sessionIndex={sessionIndex} isSingleRetake={isSingleRetake} onRetake={() => setCurrentScreen(AppScreen.CAMERA)} onUpdateData={(newData) => { setSessionData(newData); if (sessionIndex === 0 && !isSingleRetake) { setBaseSerialNumber(newData.serialNumber); setBaseModel(newData.model); } }} onConfirm={() => processConfirmation(capturedImage!, sessionData || { serialNumber: 'Manual_SN', model: 'ZT411' })} />}
        {currentScreen === AppScreen.DETAILS && <DetailsScreen printer={selectedPrinter!} viewMode={detailsViewMode} setViewMode={setDetailsViewMode} onBack={() => setCurrentScreen(AppScreen.GALLERY)} onAddPhoto={(idx) => { setSessionIndex(idx); setIsSingleRetake(true); setSessionData({ serialNumber: selectedPrinter!.serialNumber, model: selectedPrinter!.model }); setLastScreen(AppScreen.DETAILS); setCurrentScreen(AppScreen.CAMERA); }} onPreviewImage={(photos, index) => { setPreviewPhotos(photos); setPreviewIndex(index); setLastScreen(AppScreen.DETAILS); setCurrentScreen(AppScreen.PREVIEW); }} onManualSync={performSyncCycle} onUpdatePrinter={updatePrinter} onAllPhotosComplete={() => { setSessionIndex(0); setSessionPhotos([]); setSessionData(null); setBaseSerialNumber(''); setBaseModel('ZT411'); }} isSyncing={selectedPrinter?.isSyncing} user={user} onLogin={handleLogin} onLogout={handleLogout} />}
        {currentScreen === AppScreen.PREVIEW && <ImagePreviewScreen photos={previewPhotos} initialIndex={previewIndex} onBack={() => setCurrentScreen(lastScreen)} onRetake={(idx) => { setSessionIndex(idx); setIsSingleRetake(true); if (selectedPrinter) setSessionData({ serialNumber: selectedPrinter.serialNumber, model: selectedPrinter.model }); setCurrentScreen(AppScreen.CAMERA); }} onReplace={(idx, b64) => { if (!selectedPrinter) return; const currentPhotos = selectedPrinter.photos || []; const updatedPhotos = [...currentPhotos]; updatedPhotos[idx] = { ...updatedPhotos[idx], url: b64, isSynced: false }; const updatedPrinter = { ...selectedPrinter, photos: updatedPhotos, imageUrl: idx === 0 ? b64 : selectedPrinter.imageUrl, syncedCount: updatedPhotos.filter(p => p.isSynced).length }; setPrinters(prev => prev.map(p => p.id === selectedPrinter.id ? updatedPrinter : p)); setSelectedPrinter(updatedPrinter); setPreviewPhotos(updatedPhotos); }} />}
        {currentScreen === AppScreen.SETTINGS && <SettingsScreen settings={settings} onUpdate={setSettings} activeProject={activeProject} onBack={() => setCurrentScreen(activeProjectId ? AppScreen.GALLERY : AppScreen.PROJECT_LIST)} />}
        {currentScreen === AppScreen.SEARCH && <SearchScreen printers={printers} onBack={() => setCurrentScreen(AppScreen.GALLERY)} onPreviewImage={(url) => { setPreviewPhotos([{url, label: 'Search', filename: 's.jpg'}]); setPreviewIndex(0); setLastScreen(AppScreen.SEARCH); setCurrentScreen(AppScreen.PREVIEW); }} />}
      </div>
    </div>
  );
};

export default App;
