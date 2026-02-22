
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppScreen, Printer, Project, PHOTO_LABELS, PhotoSetItem, UserPreferences, MicrosoftUser, ViewMode } from './types';
import { MOCK_PRINTERS, MOCK_PROJECTS } from './constants';
import { storageService } from './services/storageService';
import { oneDriveService } from './services/oneDriveService';
import { microsoftAuthService } from './services/microsoftAuthService';
import { readBarcode } from './services/barcodeService';
import { runRecognitionArbitration } from './services/recognitionPipeline';
import eruda from 'eruda';
import { hapticService } from './src/services/hapticService';

// 初始化移动端调试工具（开发环境）
if (typeof window !== 'undefined') {
  if (import.meta.env.DEV || window.location.hostname === 'luke7628.github.io') {
    eruda.init();
    console.log('🔧 [Eruda] 移动端调试工具已启动');
  }
}
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
// MICROSOFT OneDrive SETUP (RECOMMENDED):
// Configure these in .env.local (Vite env vars).
// Do NOT hardcode secrets in source.
// Environment variables injected via GitHub Actions for production deployment
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || "";
// For personal Microsoft accounts only, use "consumers"
// For organizations only, use "organizations"
// For both, use "common"
const MICROSOFT_TENANT_ID = import.meta.env.VITE_MICROSOFT_TENANT_ID || "common";
const MICROSOFT_REDIRECT_URI = import.meta.env.VITE_MICROSOFT_REDIRECT_URI ||
  `${window.location.origin}${import.meta.env.BASE_URL}auth-callback.html`;
const MICROSOFT_PKCE_VERIFIER_KEY = 'microsoft_code_verifier';
const MICROSOFT_AUTH_CODE_KEY = 'microsoft_auth_code';

const normalizeCloudProvider = (provider?: string): UserPreferences['cloudProvider'] => {
  if (provider === 'onedrive' || provider === 'none') return provider;
  if (provider === 'drive') return 'onedrive';
  return undefined;
};


const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.SPLASH);
  const [lastScreen, setLastScreen] = useState<AppScreen>(AppScreen.GALLERY);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [detailsViewMode, setDetailsViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [user, setUser] = useState<MicrosoftUser | null>(null);
  const [isMicrosoftReady, setIsMicrosoftReady] = useState(false);
  const [settings, setSettings] = useState<UserPreferences>({
    defaultFlash: 'auto',
    skipReview: false,
    autoUpload: false,  // Disabled by default for personal accounts without SPO license
    drivePath: '/Dematic/FieldPhotos/',
    useSubfoldersBySN: true,
    imageQuality: 'original',
    cloudProvider: 'onedrive'
  });

  const [sessionIndex, setSessionIndex] = useState<number>(0);
  const [sessionPhotos, setSessionPhotos] = useState<PhotoSetItem[]>([]);
  const [sessionData, setSessionData] = useState<{ serialNumber: string; partNumber?: string } | null>(null);
  const [baseSerialNumber, setBaseSerialNumber] = useState<string>('');
  const [basePartNumber, setBasePartNumber] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSingleRetake, setIsSingleRetake] = useState<boolean>(false);
  const [previewPhotos, setPreviewPhotos] = useState<PhotoSetItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);

  // Toast notification helper
  const displayToast = useCallback((message: string, duration = 3000) => {
    console.log('📢 Toast:', message);
    setToastMessage(message);
    setShowToast(true);
    const timer = setTimeout(() => setShowToast(false), duration);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Microsoft Auth
  useEffect(() => {
    const initMicrosoft = async () => {
      const hasCachedToken = await microsoftAuthService.initMicrosoft();
      if (hasCachedToken) {
        setIsMicrosoftReady(true);
        try {
          const userInfo = await microsoftAuthService.getUserInfo();
          if (userInfo) {
            setUser(userInfo as any);
            storageService.saveUser(userInfo as any);
            oneDriveService.setToken(microsoftAuthService.accessToken!);
            setSettings(prev => ({ ...prev, cloudProvider: 'onedrive', autoUpload: true }));
          } else {
            // 用户信息获取失败，可能Token已过期，尝试刷新
            console.warn('⚠️ [initMicrosoft] User info fetch failed, attempting token refresh...');
            const refreshed = await microsoftAuthService.refreshAccessToken(MICROSOFT_CLIENT_ID);
            if (refreshed) {
              const retryInfo = await microsoftAuthService.getUserInfo();
              if (retryInfo) {
                setUser(retryInfo);
                storageService.saveUser(retryInfo);
                oneDriveService.setToken(microsoftAuthService.accessToken!);
                setSettings(prev => ({ ...prev, cloudProvider: 'onedrive', autoUpload: true }));
              }
            }
          }
        } catch (e) {
          console.error("Microsoft Init Error:", e);
        }
      }
      // 总是标记为准备好（即使没有缓存 token，用户可以手动登录）
      setIsMicrosoftReady(true);
    };

    initMicrosoft();
  }, []);

  const exchangeAuthCode = useCallback(async (code: string) => {
    console.log('🔐 [exchangeAuthCode] Starting token exchange...');
    
    const codeVerifier = sessionStorage.getItem(MICROSOFT_PKCE_VERIFIER_KEY);
    if (!codeVerifier) {
      console.error('❌ [exchangeAuthCode] Missing PKCE code verifier');
      return;
    }

    try {
      const success = await microsoftAuthService.exchangeCodeForToken(
        code,
        MICROSOFT_CLIENT_ID,
        MICROSOFT_REDIRECT_URI,
        codeVerifier,
        MICROSOFT_TENANT_ID
      );

      console.log('🔐 [exchangeAuthCode] Token exchange result:', success);

      if (success && microsoftAuthService.accessToken) {
        console.log('🔐 [exchangeAuthCode] Access token obtained, setting OneDrive token');
        oneDriveService.setToken(microsoftAuthService.accessToken);

        console.log('🔐 [exchangeAuthCode] Fetching user info...');
        const userInfo = await microsoftAuthService.getUserInfo();
        console.log('🔐 [exchangeAuthCode] User info result:', userInfo);

        if (userInfo) {
          console.log('✅ [exchangeAuthCode] Setting user state:', userInfo);
          setUser(userInfo as any);
          storageService.saveUser(userInfo as any);
          // 🎯 自动启用云同步
          setSettings(prev => {
            const newSettings: UserPreferences = { ...prev, cloudProvider: 'onedrive', autoUpload: true };
            storageService.saveSettings(newSettings);
            return newSettings;
          });
          displayToast(`✅ 已登陆 ${userInfo.email}，自动同步已启用`);
          console.log('✅ [exchangeAuthCode] User successfully logged in, auto-upload enabled');
        } else {
          console.warn('⚠️ [exchangeAuthCode] Failed to get user info');
          displayToast('⚠️ 登陆成功但无法获取用户信息');
        }
      } else {
        console.error('❌ [exchangeAuthCode] Token exchange failed or no access token');
        displayToast('❌ 登陆失败，请重试');
      }
    } catch (error) {
      console.error('❌ [exchangeAuthCode] Error:', error);
    }
  }, []);

  useEffect(() => {
    const storedCode = localStorage.getItem(MICROSOFT_AUTH_CODE_KEY);
    const timestamp = localStorage.getItem('microsoft_auth_timestamp');
    
    if (storedCode) {
      console.log('🔐 [App] Found stored auth code in localStorage');
      
      // Check if code is still valid (within 5 minutes)
      const isValid = !timestamp || (Date.now() - parseInt(timestamp)) < 5 * 60 * 1000;
      
      if (isValid) {
        console.log('✅ [App] Auth code is valid, exchanging...');
        localStorage.removeItem(MICROSOFT_AUTH_CODE_KEY);
        localStorage.removeItem('microsoft_auth_timestamp');
        exchangeAuthCode(storedCode);
      } else {
        console.warn('⚠️ [App] Auth code expired, removing...');
        localStorage.removeItem(MICROSOFT_AUTH_CODE_KEY);
        localStorage.removeItem('microsoft_auth_timestamp');
      }
    }
  }, [exchangeAuthCode]);

  const handleLogin = useCallback(async () => {
    console.log('🔑 [handleLogin] Starting login process...');
    
    if (!MICROSOFT_CLIENT_ID) {
      console.error('❌ [handleLogin] MICROSOFT_CLIENT_ID is not configured');
      // Show a user-friendly message in the UI instead of an alert
      const message = "Microsoft Login is not configured.\n\n" +
        "To enable Microsoft OneDrive integration:\n" +
        "1. Register an app in Azure AD\n" +
        "2. Set VITE_MICROSOFT_CLIENT_ID in .env.local\n" +
        "3. (Optional) Set VITE_MICROSOFT_TENANT_ID and VITE_MICROSOFT_REDIRECT_URI\n" +
        "4. Rebuild the application\n\n" +
        "The app will continue to work with local storage.";
      
      if (confirm(message + "\n\nWould you like to see the setup guide?")) {
        // In a real app, this could open documentation
        console.log("Setup guide: Check MICROSOFT_SETUP.md in the project root");
      }
      return;
    }

    console.log('🔑 [handleLogin] Creating PKCE pair...');
    const { verifier, challenge } = await microsoftAuthService.createPkcePair();
    sessionStorage.setItem(MICROSOFT_PKCE_VERIFIER_KEY, verifier);
    localStorage.removeItem(MICROSOFT_AUTH_CODE_KEY);
    console.log('🔑 [handleLogin] PKCE pair created, generating login URL...');
    
    // Generate login URL and redirect
    const loginUrl = microsoftAuthService.getLoginUrl(
      MICROSOFT_CLIENT_ID,
      MICROSOFT_REDIRECT_URI,
      MICROSOFT_TENANT_ID,
      challenge
    );
    console.log('🔑 [handleLogin] Opening auth window...');
    
    // 在新窗口打开登录页面（也可以直接重定向）
    // window.location.href = loginUrl;
    
    // 或者在新窗口打开，保持当前应用继续运行
    const authWindow = window.open(loginUrl, 'microsoft_auth', 'width=500,height=600');
    if (!authWindow) {
      console.log('🔑 [handleLogin] Pop-up blocked, redirecting directly');
      window.location.href = loginUrl;
      return;
    }
    
    // Bug Fix: 清理旧的监听器防止堆积
    if ((window as any).__authMessageHandler) {
      window.removeEventListener('message', (window as any).__authMessageHandler);
    }

    // 监听来自回调页面的消息
    const handleAuthMessage = async (event: MessageEvent) => {
      console.log('📨 [handleAuthMessage] Received message:', event.data);
      
      if (event.origin !== window.location.origin) {
        console.warn('⚠️ [handleAuthMessage] Origin mismatch:', event.origin, '!==', window.location.origin);
        return;
      }
      
      if (event.data.type === 'microsoft_auth_success') {
        console.log('✅ [handleAuthMessage] Auth success received with code');
        const { code } = event.data;
        await exchangeAuthCode(code);

        if (authWindow) authWindow.close();
        window.removeEventListener('message', handleAuthMessage);
        delete (window as any).__authMessageHandler;
      }
    };

    // Bug Fix: 存储引用以便后续清理
    (window as any).__authMessageHandler = handleAuthMessage;
    window.addEventListener('message', handleAuthMessage);
    console.log('📡 [handleLogin] Message listener registered, waiting for callback...');
  }, [exchangeAuthCode]);



  const handleLogout = useCallback(() => {
    setUser(null);
    storageService.saveUser(null);
    microsoftAuthService.logout();
    oneDriveService.setToken("");
    setSettings(prev => ({ ...prev, cloudProvider: 'none' }));
    // Bug Fix: 清理消息监听器防止内存泄漏
    if ((window as any).__authMessageHandler) {
      window.removeEventListener('message', (window as any).__authMessageHandler);
      delete (window as any).__authMessageHandler;
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
  }, []); // Bug Fix: 移除selectedPrinter依赖，避免不必要的重新创建

  useEffect(() => {
    let mounted = true; // Bug Fix: 追踪组件挂载状态
    
    const initAppData = async () => {
      const savedProjects = storageService.loadProjects();
      const savedPrinters = await storageService.loadPrinters(); // Async IDB
      const savedUser = storageService.loadUser();
      const savedSettings = storageService.loadSettings() as (UserPreferences & { cloudProvider?: string }) | null;
      const normalizedSettings: UserPreferences | null = savedSettings
        ? {
            ...savedSettings,
            cloudProvider: normalizeCloudProvider(savedSettings.cloudProvider)
          }
        : null;
      
      // Bug Fix: 检查组件是否仍在挂载
      if (!mounted) return;
      
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
      
      // Bug Fix: 再次检查mounted
      if (!mounted) return;
      setProjects(finalProjects);
      setPrinters(finalPrinters);
      if (savedUser) setUser(savedUser);
      if (normalizedSettings) setSettings(normalizedSettings);

      const timer = setTimeout(() => {
        if (mounted) setCurrentScreen(AppScreen.PROJECT_LIST);
      }, 2500);
      
      return () => { clearTimeout(timer); };
    };

    initAppData();
    
    // Bug Fix: 正确的cleanup函数
    return () => {
      mounted = false;
    };
  }, []);

  // Persist Printers to IndexedDB whenever state changes
  useEffect(() => {
    if (printers.length > 0) {
      storageService.savePrinters(printers).catch((error) => {
        console.error('❌ [Storage] Failed to persist printers:', error);
        // Bug Fix: 提示用户存储失败
        displayToast('⚠️ 本地存储失败，数据可能未保存');
      });
    }
  }, [printers, displayToast]);

  // Persist other small configs
  useEffect(() => {
    storageService.saveProjects(projects);
  }, [projects]);
  
  useEffect(() => {
    storageService.saveSettings(settings);
  }, [settings]);

  // Bug Fix: 添加Token刷新状态标志，防止并发刷新
  const refreshingTokenRef = useRef<boolean>(false);
  
  // Real Sync Cycle to OneDrive with improved token handling
  const performSyncCycle = useCallback(async () => {
    // Bug Fix: 添加mounted标志防止组件卸载后调用setState
    let isMounted = true;
    
    // 需要：自动上传开启、用户已登录、有访问令牌
    const hasMicrosoftToken = oneDriveService.accessToken;
    
    if (!settings.autoUpload || settings.cloudProvider !== 'onedrive' || !user || !hasMicrosoftToken) {
      return;
    }
    
    // 查找有未同步照片且当前未同步的打印机
    const targetPrinter = printers.find(p => {
      const hasUnsynced = p.photos?.some(ph => ph.url && !ph.isSynced);
      return hasUnsynced && !p.isSyncing;
    });

    if (!targetPrinter) return;
    
    // 在 UI 中标记为正在同步
    console.log(`📤 [Sync] Starting sync for printer: ${targetPrinter.serialNumber}`);
    setPrinters(prev => prev.map(p => p.id === targetPrinter.id ? { ...p, isSyncing: true } : p));
    if (selectedPrinter?.id === targetPrinter.id) {
      setSelectedPrinter(prev => prev ? { ...prev, isSyncing: true } : null);
    }

    try {
      let targetFolderId: string | null = null;

      // ==================== Token 有效性检查 ====================
      // 在同步前检查Token是否过期，如果过期则尝试刷新
      try {
        // 通过调用Graph API来检查Token是否有效
        const testRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${microsoftAuthService.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (testRes.status === 401) {
          console.warn('⚠️ [Sync] Token expired, attempting refresh...');
          // Bug Fix: 防止并发Token刷新
          if (!refreshingTokenRef.current) {
            refreshingTokenRef.current = true;
            try {
              const refreshSuccess = await microsoftAuthService.refreshAccessToken(MICROSOFT_CLIENT_ID);
              
              if (refreshSuccess && microsoftAuthService.accessToken) {
                console.log('✅ [Sync] Token refreshed successfully');
                oneDriveService.setToken(microsoftAuthService.accessToken);
              } else {
                throw new Error('Token expired and refresh failed. Please login again.');
              }
            } finally {
              refreshingTokenRef.current = false;
            }
          } else {
            // Token正在被刷新，等待一下
            console.log('⏳ [Sync] Token refresh in progress, retrying later...');
            return;
          }
        }
      } catch (tokenCheckError) {
        console.error('❌ [Sync] Token check failed:', tokenCheckError);
        // 继续尝试同步，可能API仍然可用
      }

      // ==================== OneDrive 同步流程 ====================
      // 1. 确保根文件夹"Dematic/FieldPhotos"存在
      // Bug Fix: 规范化驱动器路径（移除尾部斜杠）
      let drivePath = settings.drivePath || '/Dematic/FieldPhotos';
      if (drivePath.endsWith('/')) {
        drivePath = drivePath.slice(0, -1);
      }
      console.log(`📂 [Sync] Checking root folder: ${drivePath}`);
      
      let rootFolderId = await oneDriveService.findFolder(drivePath);
      
      if (!rootFolderId) {
        console.log(`📂 [Sync] Root folder not found, creating...`);
        rootFolderId = await oneDriveService.ensureFolder(drivePath);
      }
      
      if (!rootFolderId) throw new Error("Could not create/find root folder in OneDrive");
      console.log(`✅ [Sync] Root folder ready: ${rootFolderId}`);

      // 2. 确保项目文件夹存在
      const project = projects.find(p => p.id === targetPrinter.projectId);
      const projectName = project ? project.name : 'Unassigned Project';
      const projectPath = `${drivePath}/${projectName}`;
      console.log(`📂 [Sync] Checking project folder: ${projectPath}`);
      
      let projectFolderId = await oneDriveService.findFolder(projectPath);
      
      if (!projectFolderId) {
        console.log(`📂 [Sync] Project folder not found, creating...`);
        projectFolderId = await oneDriveService.ensureFolder(projectPath);
      }
      
      if (!projectFolderId) throw new Error("Could not create/find project folder");
      console.log(`✅ [Sync] Project folder ready: ${projectFolderId}`);

      // 3. 如果启用了按序列号分文件夹
      if (settings.useSubfoldersBySN) {
        const snPath = `${projectPath}/${targetPrinter.serialNumber}`;
        console.log(`📂 [Sync] Checking SN subfolder: ${snPath}`);
        
        targetFolderId = await oneDriveService.findFolder(snPath);
        
        if (!targetFolderId) {
          console.log(`📂 [Sync] SN subfolder not found, creating...`);
          targetFolderId = await oneDriveService.ensureFolder(snPath);
        }
      } else {
        targetFolderId = projectFolderId;
      }

      if (!targetFolderId) throw new Error("Could not determine target folder");
      console.log(`✅ [Sync] Target folder ready: ${targetFolderId}`);

      // 4. 上传照片
      const photos = targetPrinter.photos || [];
      const updatedPhotos = [...photos];
      let hasChanges = false;
      let uploadedCount = 0;

      for (let i = 0; i < updatedPhotos.length; i++) {
        const photo = updatedPhotos[i];
        if (photo.url && !photo.isSynced) {
          try {
            console.log(`📸 [Sync] Uploading ${i + 1}/${photos.filter(p => !p.isSynced).length}: ${photo.filename}`);
            await oneDriveService.uploadImage(photo.url, photo.filename, targetFolderId);
            updatedPhotos[i] = { ...photo, isSynced: true };
            hasChanges = true;
            uploadedCount++;
            console.log(`✅ [Sync] Uploaded: ${photo.filename}`);
          } catch (uploadError: any) {
            // 如果是401错误，说明Token失效
            if (uploadError?.message?.includes('401')) {
              console.error(`❌ [Sync] Token expired during upload, aborting sync`);
              throw new Error('Token expired. Please login again.');
            }
            console.error(`❌ [Sync] Failed to upload ${photo.filename}:`, uploadError?.message || uploadError);
            // 继续上传下一张照片
          }
        }
      }

      // 5. 更新状态
      if (hasChanges) {
        console.log(`📤 [Sync] Completed: uploaded ${uploadedCount} photos`);
        if (isMounted) { // Bug Fix: 检查mounted状态
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
                // 如果当前选中的打印机是被同步的那个，更新它
                if (selectedPrinter?.id === p.id) setSelectedPrinter(updatedPrinter);
                return updatedPrinter;
              }
              return p;
            });
          });
          displayToast(`✅ 已同步 ${uploadedCount} 张照片到云空间`);
          hapticService.success();
        }
      } else {
        if (isMounted) { // Bug Fix: 检查mounted状态
          // No changes but we need to clear the syncing flag
          setPrinters(prev => prev.map(p => p.id === targetPrinter.id ? { ...p, isSyncing: false } : p));
          if (selectedPrinter?.id === targetPrinter.id) setSelectedPrinter(prev => prev ? { ...prev, isSyncing: false } : null);
        }
      }

    } catch (error: any) {
      console.error("❌ [Sync] Cycle Error:", error?.message || error);
      
      if (!isMounted) return; // Bug Fix: 检查mounted状态
      
      // 如果是登陆过期，提示用户重新登陆
      if (error?.message?.includes('Token') || error?.message?.includes('401')) {
        displayToast('❌ 登陆已过期，请重新登陆');
        hapticService.warning();
        handleLogout();
      } else {
        displayToast(`❌ 同步失败: ${error?.message || '未知错误'}`);
        hapticService.warning();
      }
      
      // Reset syncing flag on error
      setPrinters(prev => prev.map(p => p.id === targetPrinter.id ? { ...p, isSyncing: false } : p));
      if (selectedPrinter?.id === targetPrinter.id) setSelectedPrinter(prev => prev ? { ...prev, isSyncing: false } : null);
    }
    
    // Bug Fix: 标记异步操作完成
    isMounted = false;
  }, [settings.autoUpload, user, printers, projects, selectedPrinter, settings.useSubfoldersBySN, settings.cloudProvider, settings.drivePath, displayToast, handleLogout]);

  useEffect(() => {
    let interval: number;
    // Run sync cycle every 5 seconds if conditions met
    const hasMicrosoftToken = microsoftAuthService.accessToken;
    const hasValidToken = settings.cloudProvider === 'onedrive' && hasMicrosoftToken;
    
    if (settings.autoUpload && hasValidToken) {
      interval = window.setInterval(performSyncCycle, 5000); 
    }
    return () => clearInterval(interval);
  }, [settings.autoUpload, settings.cloudProvider, user, performSyncCycle]);

  const analyzeWithBarcode = async (base64Image: string): Promise<{ serialNumber: string; partNumber: string }> => {
    return new Promise<{ serialNumber: string; partNumber: string }>((resolve, reject) => {
      let isResolved = false; // Bug Fix: 防止多次调用resolve/reject
      
      const timeout = setTimeout(() => {
        console.warn('⏱️ [analyzeWithBarcode] Timeout after 30 seconds');
        if (!isResolved) {
          isResolved = true;
          reject(new Error('Barcode recognition timeout'));
        }
      }, 30000);

      (async () => {
        try {
          console.log('📊 [analyzeWithBarcode] 开始...输入长度:', base64Image.length);
          console.log('📊 [analyzeWithBarcode] Base64前100字符:', base64Image.substring(0, 100));

          console.log('🔍 [analyzeWithBarcode] 执行多引擎解码...');
          const rawResults = await readBarcode(base64Image);
          console.log('📊 [analyzeWithBarcode] 解码返回:', rawResults.length, '个候选');

          if (rawResults.length === 0) {
            console.warn('⚠️ [analyzeWithBarcode] 未检测到条码');
            displayToast('💡 Cannot detect barcode. Please: get closer, improve lighting, hold steady, try different angle.', 5000);
          }

          const candidates = rawResults.map(result => ({
            text: result.value,
            engine: (result.engine || 'quagga') as 'quagga' | 'native' | 'zxing' | 'jsqr',
            engineConfidence: result.engineConfidence ?? 0.7,
            format: result.format,
            region: result.region,
            regionIndex: result.regionIndex
          }));

          const serialDecision = runRecognitionArbitration(candidates, 'serial', 0.68);
          const partDecision = runRecognitionArbitration(candidates, 'part', 0.68);

          const partFallbackFromCandidates = (() => {
            const direct = rawResults
              .map(item => String(item.value || '').toUpperCase())
              .map(text => text.match(/ZT[0-9A-Z]{3,8}-[0-9A-Z]{4,20}/)?.[0] || '')
              .find(Boolean);
            if (direct) return direct;

            return rawResults
              .map(item => String(item.value || '').toUpperCase().replace(/[^A-Z0-9-]/g, ''))
              .map(text => text.match(/ZT[0-9A-Z]{3,8}-?[0-9A-Z]{4,20}/)?.[0] || '')
              .map(text => text.includes('-') ? text : text.replace(/^(ZT[0-9A-Z]{3,8})([0-9A-Z]{4,20})$/, '$1-$2'))
              .find(Boolean) || '';
          })();

          const serialNumber = serialDecision?.value ?? '';
          const partNumber = partDecision?.value ?? partFallbackFromCandidates;

          console.log('📊 [analyzeWithBarcode] Serial决策:', serialDecision);
          console.log('📊 [analyzeWithBarcode] Part决策:', partDecision);
          if (!partDecision && partFallbackFromCandidates) {
            console.log('📊 [analyzeWithBarcode] Part回退提取:', partFallbackFromCandidates);
          }
          console.log('📊 [analyzeWithBarcode] 最终返回:', { serialNumber, partNumber });

      clearTimeout(timeout);
      if (!isResolved) { // Bug Fix: 确保只resolve一次
        isResolved = true;
        resolve({ serialNumber, partNumber });
      }
        } catch (error) {
          console.error('❌ [analyzeWithBarcode] 条形码识别失败');
          console.error('Error object:', error);
          console.error('Error message:', (error as any)?.message);
          console.error('Error stack:', (error as any)?.stack);
          console.error('Error name:', (error as any)?.name);
          clearTimeout(timeout);
          if (!isResolved) { // Bug Fix: 确保只reject一次
            isResolved = true;
            reject(error);
          }
        }
      })();
    });
  };

  const handleCapture = (base64: string) => {
    console.log('📸 [handleCapture] 收到图像，长度:', base64.length);
    console.log('📸 [handleCapture] Base64前缀:', base64.substring(0, 50));
    console.log('📸 [handleCapture] sessionIndex:', sessionIndex, 'isSingleRetake:', isSingleRetake);
    console.log('📸 [handleCapture] settings.skipReview:', settings.skipReview);
    setCapturedImage(base64);
    
    if (settings.skipReview) {
      // Skip review screen if configured
      if (sessionIndex === 0 && !isSingleRetake) {
        console.log('📸 [handleCapture] skipReview=true，sessionIndex=0， 开始分析...');
        setIsAnalyzing(true);
        const cleanBase64 = base64.split(',')[1];
        console.log('📸 [handleCapture] 清理后Base64长度:', cleanBase64.length);
        analyzeWithBarcode(cleanBase64)
          .then(result => { 
            console.log('📸 [handleCapture] ✅ 分析成功，结果:', result);
            if (!result.serialNumber && !result.partNumber) {
              displayToast('💡 Could not read barcode. Enter SN/PN manually or retake the photo.', 4500);
            }
            setBaseSerialNumber(result.serialNumber);
            setBasePartNumber(result.partNumber || '');
            setSessionData({ serialNumber: result.serialNumber, partNumber: result.partNumber });
            // Auto-confirm after analysis
            setTimeout(() => {
              const newData = { serialNumber: result.serialNumber, partNumber: result.partNumber };
              console.log('📸 [handleCapture] 自动确认，数据:', newData);
              processConfirmation(base64, newData);
            }, 300);
          })
          .catch((error) => { 
            console.error('📸 [handleCapture] ❌ 分析失败');
            console.error('Error:', error);
            console.error('Error type:', typeof error);
            console.error('Error message:', error?.message);
            console.error('Error stack:', error?.stack);
            displayToast('❌ Barcode recognition failed. Please enter manually.', 4000);
            const fallbackData = { serialNumber: "", partNumber: "" };
            setBaseSerialNumber("");
            setBasePartNumber("");
            setSessionData(fallbackData);
            // Auto-confirm with fallback data
            setTimeout(() => {
              console.log('📸 [handleCapture] 使用默认数据确认');
              processConfirmation(base64, fallbackData);
            }, 300);
          })
          .finally(() => setIsAnalyzing(false));
      } else {
        console.log('📸 [handleCapture] skipReview=true，但不是第一张图或单次重拍');
        // For Step 2-12, use base serial with suffix
        const suffixedSerial = baseSerialNumber ? `${baseSerialNumber}_${sessionIndex + 1}` : `SERIAL_${sessionIndex + 1}`;
        const currentData = { serialNumber: suffixedSerial, partNumber: basePartNumber };
        setSessionData(currentData);
        setTimeout(() => {
          console.log('📸 [handleCapture] 确认后续图像');
          processConfirmation(base64, currentData);
        }, 100);
      }
    } else {
      // Show review screen if skipReview is false
      console.log('📸 [handleCapture] skipReview=false，显示审查屏幕');
      setCurrentScreen(AppScreen.REVIEW);
      if (sessionIndex === 0 && !isSingleRetake) {
        console.log('📸 [handleCapture] 首次拍摄，开始分析...');
        setIsAnalyzing(true);
        const cleanBase64 = base64.split(',')[1];
        analyzeWithBarcode(cleanBase64)
          .then(result => { 
            console.log('📸 [handleCapture] 分析成功，设置sessionData:', result);
            if (!result.serialNumber && !result.partNumber) {
              displayToast('💡 Could not read barcode. Enter SN/PN manually or retake the photo.', 4500);
            }
            setBaseSerialNumber(result.serialNumber);
            setBasePartNumber(result.partNumber || '');
            setSessionData({ serialNumber: result.serialNumber, partNumber: result.partNumber });
          })
          .catch((error) => { 
            console.error('📸 [handleCapture] 分析失败:', error);
            setBaseSerialNumber("");
            setBasePartNumber("");
            setSessionData({ serialNumber: "", partNumber: "" });
          })
          .finally(() => setIsAnalyzing(false));
      } else {
        // For Step 2-12, use base serial with suffix
        const suffixedSerial = baseSerialNumber ? `${baseSerialNumber}_${sessionIndex + 1}` : `SERIAL_${sessionIndex + 1}`;
        setSessionData({ serialNumber: suffixedSerial, partNumber: basePartNumber });
        setIsAnalyzing(false);
      }
    }
  };

  const handleReviewBack = () => {
    console.log('🔙 [handleReviewBack] 从ReviewScreen返回, sessionIndex:', sessionIndex, 'isSingleRetake:', isSingleRetake);
    
    // 清理捕获的图像
    setCapturedImage(null);
    
    // 如果是单次重拍，返回到上一个屏幕
    if (isSingleRetake) {
      console.log('🔙 [handleReviewBack] 单次重拍，返回到:', lastScreen);
      setCurrentScreen(lastScreen);
      setIsSingleRetake(false);
      return;
    }
    
    // 如果是第一张照片的新会话，清理session状态后返回Gallery
    if (sessionIndex === 0) {
      console.log('🔙 [handleReviewBack] 第一张照片，清理session状态并返回Gallery');
      setSessionIndex(0);
      setSessionPhotos([]);
      setSessionData(null);
      setBaseSerialNumber('');
      setBasePartNumber('');
      setIsAnalyzing(false);
      setCurrentScreen(AppScreen.GALLERY);
      return;
    }
    
    // 其他情况返回Gallery（理论上不应该到这里）
    console.log('🔙 [handleReviewBack] 默认返回Gallery');
    setCurrentScreen(AppScreen.GALLERY);
  };

  const finalizeSession = useCallback((finalPhotos: PhotoSetItem[], data: { serialNumber: string; partNumber?: string }) => {
    // Bug Fix: 验证 activeProjectId 的有效性
    const validProject = projects.find(p => p.id === activeProjectId);
    if (!validProject) {
      console.error('❌ [finalizeSession] Invalid project ID:', activeProjectId);
      displayToast('❌ 项目已被删除，请重新选择项目');
      setCurrentScreen(AppScreen.PROJECT_LIST);
      return;
    }
    
    // Bug Fix: 验证所有必要的照片数据都已准备好
    if (finalPhotos.length === 0) {
      console.error('❌ [finalizeSession] No photos to finalize');
      displayToast('❌ 没有拍摄任何照片，请重新开始');
      return;
    }
    
    const completePhotos: PhotoSetItem[] = PHOTO_LABELS.map((label, i) => {
      const existing = finalPhotos.find(p => p.label === label);
      return existing || { url: '', label, filename: `${data.serialNumber}_${i + 1}.jpg`, isSynced: false };
    });

    const newPrinter: Printer = { 
      id: selectedPrinter?.id || `local-${Date.now()}`, 
      projectId: activeProjectId, // 现在已验证有效
      serialNumber: data.serialNumber, 
      partNumber: data.partNumber || '',
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
    
    // Bug Fix: 验证状态更新后再导航，避免状态混乱
    setSelectedPrinter(newPrinter);
    setSessionIndex(0);
    setSessionPhotos([]);
    setSessionData(null);
    setBaseSerialNumber('');
    setBasePartNumber(''); // Bug Fix: 添加缺失的清理
    setIsSingleRetake(false);
    setLastScreen(AppScreen.GALLERY); // Bug Fix: 显式设置正确的返回屏幕
    setCurrentScreen(AppScreen.DETAILS);
  }, [selectedPrinter, activeProjectId, projects, displayToast]);

  const processConfirmation = useCallback((img: string, data: { serialNumber: string; partNumber?: string }) => {
    // Bug Fix: 验证序列号和部件号的有效性
    if (!data.serialNumber || data.serialNumber.trim().length === 0) {
      displayToast('❌ 序列号不能为空，请重新拍摄或手动输入');
      return;
    }
    
    // 清理并验证序列号 - 移除特殊字符但保留必要的格式
    const cleanedSn = data.serialNumber.replace(/[^\w\-]/g, '');
    if (cleanedSn.length === 0) {
      displayToast('❌ 序列号格式无效，请重新输入');
      return;
    }
    
    // 从sessionStorage中读取拍摄时的旋转角度
    let rotation = 0;
    try {
      const lastRotationStr = sessionStorage.getItem('lastCaptureRotation');
      if (lastRotationStr) {
        rotation = parseInt(lastRotationStr, 10);
        // Bug Fix: 立即清理，防止后续拍摄使用错误的旋转角度
        sessionStorage.removeItem('lastCaptureRotation');
      }
    } catch (error) {
      console.warn('⚠️ [processConfirmation] Failed to read rotation from sessionStorage:', error);
    }
    
    const newPhoto: PhotoSetItem = { 
      url: img, 
      label: PHOTO_LABELS[sessionIndex], 
      filename: `${cleanedSn}_${sessionIndex + 1}.jpg`, 
      isSynced: false,
      rotation
    };

    hapticService.success();

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
      finalizeSession(updatedSessionPhotos, { ...data, serialNumber: cleanedSn });
    }
  }, [isSingleRetake, selectedPrinter, sessionIndex, sessionPhotos, lastScreen, finalizeSession, displayToast]);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const activePrinters = useMemo(() => printers.filter(p => p.projectId === activeProjectId), [printers, activeProjectId]);
  const pendingSyncCount = useMemo(
    () => printers.reduce((count, printer) => count + (printer.photos?.filter(photo => photo.url && !photo.isSynced).length || 0), 0),
    [printers]
  );

  return (
    <div className="app-container w-full h-full bg-transparent overflow-hidden flex flex-col">
      <div key={currentScreen} className="w-full h-full screen-enter flex flex-col overflow-hidden">
        {currentScreen === AppScreen.SPLASH && <SplashScreen />}
        {currentScreen === AppScreen.PROJECT_LIST && <ProjectListScreen projects={projects} printers={printers} onSelectProject={(id) => { setActiveProjectId(id); setCurrentScreen(AppScreen.GALLERY); }} onCreateProject={(name) => setProjects([{ id: `p-${Date.now()}`, name, printerIds: [], createdAt: new Date().toISOString() }, ...projects])} onRenameProject={(id, newName) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p))} onDeleteProject={(id) => { setProjects(prev => prev.filter(p => p.id !== id)); setPrinters(prev => prev.filter(p => p.projectId !== id)); }} onOpenSettings={() => setCurrentScreen(AppScreen.SETTINGS)} user={user} pendingSyncCount={pendingSyncCount} />}
        {currentScreen === AppScreen.GALLERY && <GalleryScreen user={user} pendingSyncCount={pendingSyncCount} activeProject={activeProject} printers={activePrinters} onSearch={() => setCurrentScreen(AppScreen.SEARCH)} onAdd={() => { setSessionIndex(0); setSessionPhotos([]); setSessionData(null); setIsSingleRetake(false); setSelectedPrinter(null); setCurrentScreen(AppScreen.CAMERA); }} onSelectPrinter={(p) => { setSelectedPrinter(p); setCurrentScreen(AppScreen.DETAILS); }} onPreviewImage={(url) => { setPreviewPhotos([{url, label: 'Preview', filename: 'p.jpg'}]); setPreviewIndex(0); setLastScreen(AppScreen.GALLERY); setCurrentScreen(AppScreen.PREVIEW); }} onOpenSettings={() => setCurrentScreen(AppScreen.SETTINGS)} onManualSync={performSyncCycle} onBackToProjects={() => setCurrentScreen(AppScreen.PROJECT_LIST)} />}
        {currentScreen === AppScreen.CAMERA && <CameraScreen sessionIndex={sessionIndex} isSingleRetake={isSingleRetake} initialFlash={settings.defaultFlash} onClose={() => { if (sessionPhotos.length > 0 && sessionData) finalizeSession(sessionPhotos, sessionData); else { setCurrentScreen(isSingleRetake ? lastScreen : AppScreen.GALLERY); setIsSingleRetake(false); } }} onCapture={handleCapture} />}
        {currentScreen === AppScreen.REVIEW && <ReviewScreen imageUrl={capturedImage!} data={sessionData!} isAnalyzing={isAnalyzing} sessionIndex={sessionIndex} isSingleRetake={isSingleRetake} photoRotation={parseInt(sessionStorage.getItem('lastCaptureRotation') || '0', 10)} onRetake={() => setCurrentScreen(AppScreen.CAMERA)} onUpdateData={(newData) => { setSessionData(newData); if (sessionIndex === 0 && !isSingleRetake) { setBaseSerialNumber(newData.serialNumber); setBasePartNumber(newData.partNumber || ''); } }} onConfirm={() => processConfirmation(capturedImage!, sessionData || { serialNumber: 'Manual_SN', partNumber: '' })} onBack={handleReviewBack} />}
        {currentScreen === AppScreen.DETAILS && <DetailsScreen printer={selectedPrinter!} viewMode={detailsViewMode} setViewMode={setDetailsViewMode} onBack={() => setCurrentScreen(AppScreen.GALLERY)} onAddPhoto={(idx) => { setSessionIndex(idx); setIsSingleRetake(true); setSessionData({ serialNumber: selectedPrinter!.serialNumber, partNumber: selectedPrinter!.partNumber }); setLastScreen(AppScreen.DETAILS); setCurrentScreen(AppScreen.CAMERA); }} onPreviewImage={(photos, index) => { setPreviewPhotos(photos); setPreviewIndex(index); setLastScreen(AppScreen.DETAILS); setCurrentScreen(AppScreen.PREVIEW); }} onManualSync={performSyncCycle} onUpdatePrinter={updatePrinter} onAllPhotosComplete={() => { setSessionIndex(0); setSessionPhotos([]); setSessionData(null); setBaseSerialNumber(''); }} isSyncing={selectedPrinter?.isSyncing} user={user} pendingSyncCount={pendingSyncCount} onOpenSettings={() => setCurrentScreen(AppScreen.SETTINGS)} />}
        {currentScreen === AppScreen.PREVIEW && <ImagePreviewScreen photos={previewPhotos} initialIndex={previewIndex} onBack={() => setCurrentScreen(lastScreen)} onRetake={(idx) => { setSessionIndex(idx); setIsSingleRetake(true); if (selectedPrinter) setSessionData({ serialNumber: selectedPrinter.serialNumber, partNumber: selectedPrinter.partNumber }); setCurrentScreen(AppScreen.CAMERA); }} onReplace={(idx, b64) => { if (!selectedPrinter) return; const currentPhotos = selectedPrinter.photos || []; const updatedPhotos = [...currentPhotos]; updatedPhotos[idx] = { ...updatedPhotos[idx], url: b64, isSynced: false, rotation: 0 }; const updatedPrinter = { ...selectedPrinter, photos: updatedPhotos, imageUrl: idx === 0 ? b64 : selectedPrinter.imageUrl, syncedCount: updatedPhotos.filter(p => p.isSynced).length }; setPrinters(prev => prev.map(p => p.id === selectedPrinter.id ? updatedPrinter : p)); setSelectedPrinter(updatedPrinter); setPreviewPhotos(updatedPhotos); }} />}
        {currentScreen === AppScreen.SETTINGS && <SettingsScreen settings={settings} onUpdate={setSettings} activeProject={activeProject} user={user} pendingSyncCount={pendingSyncCount} onLogin={handleLogin} onLogout={handleLogout} onBack={() => setCurrentScreen(activeProjectId ? AppScreen.GALLERY : AppScreen.PROJECT_LIST)} />}
        {currentScreen === AppScreen.SEARCH && <SearchScreen printers={printers} onBack={() => setCurrentScreen(AppScreen.GALLERY)} onPreviewImage={(url) => { setPreviewPhotos([{url, label: 'Search', filename: 's.jpg'}]); setPreviewIndex(0); setLastScreen(AppScreen.SEARCH); setCurrentScreen(AppScreen.PREVIEW); }} />}
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-in fade-in zoom-in-95 duration-300 pointer-events-none">
          <div className="bg-white/98 backdrop-blur-xl text-gray-900 px-8 py-6 rounded-3xl shadow-2xl border-2 border-gray-300 flex items-center gap-4 max-w-md min-w-[300px] animate-out fade-out zoom-out-95 duration-300" style={{animation: 'none'}}>
            <span className="material-symbols-outlined text-blue-600 text-3xl animate-bounce">info</span>
            <p className="text-base font-semibold leading-relaxed text-gray-900">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
