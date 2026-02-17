
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppScreen, Printer, Project, PHOTO_LABELS, PhotoSetItem, UserPreferences, MicrosoftUser, ViewMode } from './types';
import { MOCK_PRINTERS, MOCK_PROJECTS } from './constants';
import { storageService } from './services/storageService';
import { oneDriveService } from './services/oneDriveService';
import { microsoftAuthService } from './services/microsoftAuthService';
import { readBarcode } from './services/barcodeService';
import eruda from 'eruda';

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
            const newSettings = { ...prev, cloudProvider: 'onedrive', autoUpload: true };
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
      }
    };

    window.addEventListener('message', handleAuthMessage);
    console.log('📡 [handleLogin] Message listener registered, waiting for callback...');
  }, [exchangeAuthCode]);



  const handleLogout = useCallback(() => {
    setUser(null);
    storageService.saveUser(null);
    microsoftAuthService.logout();
    oneDriveService.setToken("");
    setSettings(prev => ({ ...prev, cloudProvider: 'none' }));
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
      const normalizedSettings = savedSettings?.cloudProvider === 'drive'
        ? { ...savedSettings, cloudProvider: 'onedrive' }
        : savedSettings;
      
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
      if (normalizedSettings) setSettings(normalizedSettings);

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

  // Real Sync Cycle to OneDrive with improved token handling
  const performSyncCycle = useCallback(async () => {
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
          const refreshSuccess = await microsoftAuthService.refreshAccessToken(MICROSOFT_CLIENT_ID);
          
          if (refreshSuccess && microsoftAuthService.accessToken) {
            console.log('✅ [Sync] Token refreshed successfully');
            oneDriveService.setToken(microsoftAuthService.accessToken);
          } else {
            throw new Error('Token expired and refresh failed. Please login again.');
          }
        }
      } catch (tokenCheckError) {
        console.error('❌ [Sync] Token check failed:', tokenCheckError);
        // 继续尝试同步，可能API仍然可用
      }

      // ==================== OneDrive 同步流程 ====================
      // 1. 确保根文件夹"Dematic/FieldPhotos"存在
      const drivePath = settings.drivePath || '/Dematic/FieldPhotos/';
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
      const projectPath = `${settings.drivePath}${projectName}`;
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
      } else {
        // No changes but we need to clear the syncing flag
        setPrinters(prev => prev.map(p => p.id === targetPrinter.id ? { ...p, isSyncing: false } : p));
        if (selectedPrinter?.id === targetPrinter.id) setSelectedPrinter(prev => prev ? { ...prev, isSyncing: false } : null);
      }

    } catch (error: any) {
      console.error("❌ [Sync] Cycle Error:", error?.message || error);
      
      // 如果是登陆过期，提示用户重新登陆
      if (error?.message?.includes('Token') || error?.message?.includes('401')) {
        displayToast('❌ 登陆已过期，请重新登陆');
        handleLogout();
      } else {
        displayToast(`❌ 同步失败: ${error?.message || '未知错误'}`);
      }
      
      // Reset syncing flag on error
      setPrinters(prev => prev.map(p => p.id === targetPrinter.id ? { ...p, isSyncing: false } : p));
      if (selectedPrinter?.id === targetPrinter.id) setSelectedPrinter(prev => prev ? { ...prev, isSyncing: false } : null);
    }
  }, [settings.autoUpload, user, printers, projects, selectedPrinter, settings.useSubfoldersBySN, settings.cloudProvider, settings.drivePath, displayToast]);

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
      const timeout = setTimeout(() => {
        console.warn('⏱️ [analyzeWithBarcode] Timeout after 30 seconds');
        reject(new Error('Barcode recognition timeout'));
      }, 30000);

      (async () => {
        try {
          console.log('📊 [analyzeWithBarcode] 开始...输入长度:', base64Image.length);
          console.log('📊 [analyzeWithBarcode] Base64前100字符:', base64Image.substring(0, 100));
          
          // 直接使用 ZXing 多区域识别
          console.log('🔍 [analyzeWithBarcode] 使用 ZXing 多区域识别...');
          const legacyResults = await readBarcode(base64Image);
          console.log('📊 [analyzeWithBarcode] ZXing返回:', legacyResults.length, '个结果');
          console.log('📊 [analyzeWithBarcode] ZXing结果详情:', JSON.stringify(legacyResults, null, 2));
          
          const barcodeResults = legacyResults.map(r => ({
            type: r.type as any,
            value: r.value,
            format: r.format,
            confidence: 0.9,
            localized: false,
          }));
      
          if (barcodeResults.length === 0) {
            console.warn('⚠️ [analyzeWithBarcode] 未检测到条码');
            displayToast('💡 Cannot detect barcode. Please: get closer, improve lighting, hold steady, try different angle.', 5000);
          } else {
            console.log('✅ [analyzeWithBarcode] 成功检测到', barcodeResults.length, '个条码');
          }
          
          let serialNumber = '';
          let partNumber = '';

      const parsePayload = (payload: string, barcodeInfo?: any) => {
        console.log('📊 [parsePayload] 输入:', payload);
        console.log('📊 [parsePayload] 条码信息:', barcodeInfo);
        const parts = payload
          .toUpperCase()
          .split(/[\n|;]+/)
          .map(p => p.trim())
          .filter(Boolean);

        console.log('📊 [parsePayload] 分割后:', parts.length, '部分', parts);

        parts.forEach((part, idx) => {
          console.log(`📊 [parsePayload] 处理部分 ${idx}:`, part);
          const compact = part.replace(/\s+/g, '');
          const cleaned = compact.replace(/[^A-Z0-9-_]/g, '');
          console.log(`📊 [parsePayload] 清理后:`, cleaned);

          // 优先识别部件号（Part Number）- ZT4开头
          if (!partNumber) {
            const partMatch = cleaned.match(/ZT4\d{3,6}[-_]?[A-Z0-9]{5,}/i);
            if (partMatch) {
              let normalized = partMatch[0].replace(/_/g, '-');
              if (!normalized.includes('-') && normalized.length > 9) {
                const match = normalized.match(/^(ZT4\d{3,6})([A-Z0-9]+)$/);
                if (match) {
                  normalized = `${match[1]}-${match[2]}`;
                }
              }
              partNumber = normalized;
              console.log('✅ [parsePayload] 识别为部件号:', partNumber);
              return; // 发现PN后直接返回，避免继续识别为SN
            }
          }

          // 识别序列号（Serial Number）
          // 优先级1：带标签的序列号
          if (!serialNumber) {
            const labeledSerial = cleaned.match(/(?:SN|SERIAL|S-N|S_N)[:=\s]*([A-Z0-9]{8,})/i);
            if (labeledSerial) {
              serialNumber = labeledSerial[1];
              console.log('✅ [parsePayload] 识别为序列号（带标签）:', serialNumber);
              return; // 发现SN后直接返回
            }
          }

          // 优先级2：位置策略 - 使用条码所在区域判断
          // 底部区域更可能是PN（且以ZT4开头或长数字），顶部/上部更可能是SN
          const isBottomRegion = barcodeInfo?.regionIndex && barcodeInfo.regionIndex >= 4; // 底部80%以后
          const isTopRegion = barcodeInfo?.regionIndex && barcodeInfo.regionIndex <= 2; // 顶部40%以前
          
          if (isBottomRegion && cleaned.length > 8) {
            // 底部区域：优先当作PN
            if (!partNumber && cleaned.match(/^[A-Z0-9]{8,}/i)) {
              partNumber = cleaned;
              console.log('✅ [parsePayload] 识别为部件号（底部位置）:', partNumber);
              return;
            }
          }

          if (isTopRegion && !serialNumber && cleaned.length >= 8 && cleaned.length <= 20) {
            // 顶部区域：优先当作SN
            serialNumber = cleaned;
            console.log('✅ [parsePayload] 识别为序列号（顶部位置）:', serialNumber);
            return;
          }

          // 优先级3：Zebra 典型序列号格式（数字+字母+数字）
          if (!serialNumber) {
            const pattern1 = cleaned.match(/(?<![A-Z0-9])(\d{2,4}[A-Z]{2,4}\d{6,})(?![A-Z0-9])/i);
            if (pattern1 && pattern1[1].length >= 8 && pattern1[1].length <= 20 && !cleaned.startsWith('ZT4')) {
              serialNumber = pattern1[1];
              console.log('✅ [parsePayload] 识别为序列号（格式: 数字+字母+数字）:', serialNumber);
              return;
            }
          }
          
          // 优先级4：其他Zebra格式（字母开头）
          if (!serialNumber) {
            const pattern2 = cleaned.match(/(?<![A-Z0-9])([A-Z]{2,4}\d{6,}|[A-Z0-9]{2}[A-Z]\d{6,})(?![A-Z0-9])/i);
            if (pattern2 && pattern2[1].length >= 8 && pattern2[1].length <= 20 && !cleaned.startsWith('ZT4')) {
              serialNumber = pattern2[1];
              console.log('✅ [parsePayload] 识别为序列号（格式: 字母+数字）:', serialNumber);
              return;
            }
          }

          // 优先级5：纯数字序列号（10-15位）
          if (!serialNumber && cleaned.match(/^\d{10,15}$/)) {
            serialNumber = cleaned;
            console.log('✅ [parsePayload] 识别为序列号（纯数字）:', serialNumber);
            return;
          }

          // 优先级6：通用格式（避免误识别PN）
          if (!serialNumber && !partNumber && !cleaned.startsWith('ZT4')) {
            if (cleaned.length >= 8 && cleaned.length <= 20) {
              serialNumber = cleaned;
              console.log('✅ [parsePayload] 识别为序列号（通用格式）:', serialNumber);
              return;
            }
          }
        });
        
        console.log('📊 [parsePayload] 完成，最终: SN=', serialNumber, ', PN=', partNumber);
      };
      
      if (barcodeResults && barcodeResults.length > 0) {
        console.log(`✅ [analyzeWithBarcode] 找到 ${barcodeResults.length} 个条码:`, barcodeResults);
        
        // 解析条形码/QR码结果
        for (const result of barcodeResults) {
          if (!result.value) {
            console.log('⚠️ [analyzeWithBarcode] 跳过空值结果');
            continue;
          }
          const typeStr = result.type === 'qrcode' ? 'QR码' : '条形码';
          const confStr = (result as any).confidence ? ` (置信度: ${((result as any).confidence * 100).toFixed(0)}%)` : '';
          const locStr = (result as any).localized ? ' [已定位]' : '';
          const regionStr = (result as any).region ? ` [区域: ${(result as any).region}]` : '';
          console.log(`[analyzeWithBarcode] ${typeStr}内容:`, result.value, `${result.format || ''}${confStr}${locStr}${regionStr}`);
          parsePayload(result.value, result);
        }
      } else {
        console.log('❌ [analyzeWithBarcode] 未找到条码结果');
      }
      
      console.log('📊 [analyzeWithBarcode] 最终返回:', { serialNumber, partNumber });
      clearTimeout(timeout);
      resolve({ serialNumber, partNumber });
        } catch (error) {
          console.error('❌ [analyzeWithBarcode] 条形码识别失败');
          console.error('Error object:', error);
          console.error('Error message:', (error as any)?.message);
          console.error('Error stack:', (error as any)?.stack);
          console.error('Error name:', (error as any)?.name);
          clearTimeout(timeout);
          reject(error);
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
    const completePhotos: PhotoSetItem[] = PHOTO_LABELS.map((label, i) => {
      const existing = finalPhotos.find(p => p.label === label);
      return existing || { url: '', label, filename: `${data.serialNumber}_${i + 1}.jpg`, isSynced: false };
    });

    const newPrinter: Printer = { 
      id: selectedPrinter?.id || `local-${Date.now()}`, 
      projectId: activeProjectId || 'proj-1', 
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
    
    setSelectedPrinter(newPrinter);
    setSessionIndex(0);
    setSessionPhotos([]);
    setSessionData(null);
    setBaseSerialNumber('');
    setIsSingleRetake(false);
    setCurrentScreen(AppScreen.DETAILS);
  }, [selectedPrinter, activeProjectId]);

  const processConfirmation = useCallback((img: string, data: { serialNumber: string; partNumber?: string }) => {
    // 从sessionStorage中读取拍摄时的旋转角度
    const lastRotationStr = sessionStorage.getItem('lastCaptureRotation');
    const rotation = lastRotationStr ? parseInt(lastRotationStr, 10) : 0;
    
    const newPhoto: PhotoSetItem = { 
      url: img, 
      label: PHOTO_LABELS[sessionIndex], 
      filename: `${data.serialNumber}_${sessionIndex + 1}.jpg`, 
      isSynced: false,
      rotation // 保存拍摄时的旋转角度
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
    <div className="app-container w-full h-full bg-transparent overflow-hidden flex flex-col">
      <div key={currentScreen} className="w-full h-full screen-enter flex flex-col overflow-hidden">
        {currentScreen === AppScreen.SPLASH && <SplashScreen />}
        {currentScreen === AppScreen.PROJECT_LIST && <ProjectListScreen projects={projects} printers={printers} onSelectProject={(id) => { setActiveProjectId(id); setCurrentScreen(AppScreen.GALLERY); }} onCreateProject={(name) => setProjects([{ id: `p-${Date.now()}`, name, printerIds: [], createdAt: new Date().toISOString() }, ...projects])} onRenameProject={(id, newName) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p))} onDeleteProject={(id) => { setProjects(prev => prev.filter(p => p.id !== id)); setPrinters(prev => prev.filter(p => p.projectId !== id)); }} onOpenSettings={() => setCurrentScreen(AppScreen.SETTINGS)} user={user} onLogin={handleLogin} onLogout={handleLogout} />}
        {currentScreen === AppScreen.GALLERY && <GalleryScreen user={user} activeProject={activeProject} onLogin={handleLogin} onLogout={handleLogout} printers={activePrinters} onSearch={() => setCurrentScreen(AppScreen.SEARCH)} onAdd={() => { setSessionIndex(0); setSessionPhotos([]); setSessionData(null); setIsSingleRetake(false); setSelectedPrinter(null); setCurrentScreen(AppScreen.CAMERA); }} onSelectPrinter={(p) => { setSelectedPrinter(p); setCurrentScreen(AppScreen.DETAILS); }} onPreviewImage={(url) => { setPreviewPhotos([{url, label: 'Preview', filename: 'p.jpg'}]); setPreviewIndex(0); setLastScreen(AppScreen.GALLERY); setCurrentScreen(AppScreen.PREVIEW); }} onOpenSettings={() => setCurrentScreen(AppScreen.SETTINGS)} onManualSync={performSyncCycle} onBackToProjects={() => setCurrentScreen(AppScreen.PROJECT_LIST)} />}
        {currentScreen === AppScreen.CAMERA && <CameraScreen sessionIndex={sessionIndex} isSingleRetake={isSingleRetake} initialFlash={settings.defaultFlash} onClose={() => { if (sessionPhotos.length > 0 && sessionData) finalizeSession(sessionPhotos, sessionData); else { setCurrentScreen(isSingleRetake ? lastScreen : AppScreen.GALLERY); setIsSingleRetake(false); } }} onCapture={handleCapture} />}
        {currentScreen === AppScreen.REVIEW && <ReviewScreen imageUrl={capturedImage!} data={sessionData!} isAnalyzing={isAnalyzing} sessionIndex={sessionIndex} isSingleRetake={isSingleRetake} photoRotation={parseInt(sessionStorage.getItem('lastCaptureRotation') || '0', 10)} onRetake={() => setCurrentScreen(AppScreen.CAMERA)} onUpdateData={(newData) => { setSessionData(newData); if (sessionIndex === 0 && !isSingleRetake) { setBaseSerialNumber(newData.serialNumber); setBasePartNumber(newData.partNumber || ''); } }} onConfirm={() => processConfirmation(capturedImage!, sessionData || { serialNumber: 'Manual_SN', partNumber: '' })} onBack={handleReviewBack} />}
        {currentScreen === AppScreen.DETAILS && <DetailsScreen printer={selectedPrinter!} viewMode={detailsViewMode} setViewMode={setDetailsViewMode} onBack={() => setCurrentScreen(AppScreen.GALLERY)} onAddPhoto={(idx) => { setSessionIndex(idx); setIsSingleRetake(true); setSessionData({ serialNumber: selectedPrinter!.serialNumber, partNumber: selectedPrinter!.partNumber }); setLastScreen(AppScreen.DETAILS); setCurrentScreen(AppScreen.CAMERA); }} onPreviewImage={(photos, index) => { setPreviewPhotos(photos); setPreviewIndex(index); setLastScreen(AppScreen.DETAILS); setCurrentScreen(AppScreen.PREVIEW); }} onManualSync={performSyncCycle} onUpdatePrinter={updatePrinter} onAllPhotosComplete={() => { setSessionIndex(0); setSessionPhotos([]); setSessionData(null); setBaseSerialNumber(''); }} isSyncing={selectedPrinter?.isSyncing} user={user} onLogin={handleLogin} onLogout={handleLogout} />}
        {currentScreen === AppScreen.PREVIEW && <ImagePreviewScreen photos={previewPhotos} initialIndex={previewIndex} onBack={() => setCurrentScreen(lastScreen)} onRetake={(idx) => { setSessionIndex(idx); setIsSingleRetake(true); if (selectedPrinter) setSessionData({ serialNumber: selectedPrinter.serialNumber, partNumber: selectedPrinter.partNumber }); setCurrentScreen(AppScreen.CAMERA); }} onReplace={(idx, b64) => { if (!selectedPrinter) return; const currentPhotos = selectedPrinter.photos || []; const updatedPhotos = [...currentPhotos]; updatedPhotos[idx] = { ...updatedPhotos[idx], url: b64, isSynced: false }; const updatedPrinter = { ...selectedPrinter, photos: updatedPhotos, imageUrl: idx === 0 ? b64 : selectedPrinter.imageUrl, syncedCount: updatedPhotos.filter(p => p.isSynced).length }; setPrinters(prev => prev.map(p => p.id === selectedPrinter.id ? updatedPrinter : p)); setSelectedPrinter(updatedPrinter); setPreviewPhotos(updatedPhotos); }} />}
        {currentScreen === AppScreen.SETTINGS && <SettingsScreen settings={settings} onUpdate={setSettings} activeProject={activeProject} user={user} onBack={() => setCurrentScreen(activeProjectId ? AppScreen.GALLERY : AppScreen.PROJECT_LIST)} />}
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
