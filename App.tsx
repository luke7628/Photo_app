
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppScreen, Printer, Project, PHOTO_LABELS, PhotoSetItem, UserPreferences, MicrosoftUser, ViewMode } from './types';
import { MOCK_PRINTERS, MOCK_PROJECTS } from './constants';
import { storageService } from './services/storageService';
import { oneDriveService } from './services/oneDriveService';
import { microsoftAuthService } from './services/microsoftAuthService';
import { readBarcode } from './services/barcodeService';
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
const MICROSOFT_TENANT_ID = import.meta.env.VITE_MICROSOFT_TENANT_ID || "consumers";
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
    autoUpload: true,
    drivePath: '/Dematic/FieldPhotos/',
    useSubfoldersBySN: true,
    imageQuality: 'original',
    cloudProvider: 'onedrive'
  });

  const [sessionIndex, setSessionIndex] = useState<number>(0);
  const [sessionPhotos, setSessionPhotos] = useState<PhotoSetItem[]>([]);
  const [sessionData, setSessionData] = useState<{ serialNumber: string; model: string; partNumber?: string } | null>(null);
  const [baseSerialNumber, setBaseSerialNumber] = useState<string>('');
  const [basePartNumber, setBasePartNumber] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSingleRetake, setIsSingleRetake] = useState<boolean>(false);
  const [previewPhotos, setPreviewPhotos] = useState<PhotoSetItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

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
            setSettings(prev => ({ ...prev, cloudProvider: 'onedrive' }));
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
          setSettings(prev => ({ ...prev, cloudProvider: 'onedrive' }));
          console.log('✅ [exchangeAuthCode] User successfully logged in');
        } else {
          console.warn('⚠️ [exchangeAuthCode] Failed to get user info');
        }
      } else {
        console.error('❌ [exchangeAuthCode] Token exchange failed or no access token');
      }
    } catch (error) {
      console.error('❌ [exchangeAuthCode] Error:', error);
    }
  }, []);

  useEffect(() => {
    const storedCode = localStorage.getItem(MICROSOFT_AUTH_CODE_KEY);
    if (storedCode) {
      localStorage.removeItem(MICROSOFT_AUTH_CODE_KEY);
      exchangeAuthCode(storedCode);
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

  // Real Sync Cycle to OneDrive
  const performSyncCycle = useCallback(async () => {
    // 需要：自动上传开启、用户已登录、有访问令牌
    const hasMicrosoftToken = oneDriveService.accessToken;
    
    if (!settings.autoUpload || settings.cloudProvider !== 'onedrive' || !user || !hasMicrosoftToken) return;
    
    // 查找有未同步照片且当前未同步的打印机
    const targetPrinter = printers.find(p => {
      const hasUnsynced = p.photos?.some(ph => ph.url && !ph.isSynced);
      return hasUnsynced && !p.isSyncing;
    });

    if (!targetPrinter) return;
    
    // 在 UI 中标记为正在同步
    setPrinters(prev => prev.map(p => p.id === targetPrinter.id ? { ...p, isSyncing: true } : p));
    if (selectedPrinter?.id === targetPrinter.id) {
      setSelectedPrinter(prev => prev ? { ...prev, isSyncing: true } : null);
    }

    try {
      let targetFolderId: string | null = null;

      // ==================== OneDrive 同步流程 ====================
      // 1. 确保根文件夹"Dematic/FieldPhotos"存在
      const drivePath = settings.drivePath || '/Dematic/FieldPhotos/';
      let rootFolderId = await oneDriveService.findFolder(drivePath);
      
      if (!rootFolderId) {
        rootFolderId = await oneDriveService.ensureFolder(drivePath);
      }
      
      if (!rootFolderId) throw new Error("Could not create/find root folder in OneDrive");

      // 2. 确保项目文件夹存在
      const project = projects.find(p => p.id === targetPrinter.projectId);
      const projectName = project ? project.name : 'Unassigned Project';
      const projectPath = `${settings.drivePath}${projectName}`;
      let projectFolderId = await oneDriveService.findFolder(projectPath);
      
      if (!projectFolderId) {
        projectFolderId = await oneDriveService.ensureFolder(projectPath);
      }
      
      if (!projectFolderId) throw new Error("Could not create/find project folder");

      // 3. 如果启用了按序列号分文件夹
      if (settings.useSubfoldersBySN) {
        const snPath = `${projectPath}/${targetPrinter.serialNumber}`;
        targetFolderId = await oneDriveService.findFolder(snPath);
        
        if (!targetFolderId) {
          targetFolderId = await oneDriveService.ensureFolder(snPath);
        }
      } else {
        targetFolderId = projectFolderId;
      }

      if (!targetFolderId) throw new Error("Could not determine target folder");

      // 4. 上传照片
      const photos = targetPrinter.photos || [];
      const updatedPhotos = [...photos];
      let hasChanges = false;

      for (let i = 0; i < updatedPhotos.length; i++) {
        const photo = updatedPhotos[i];
        if (photo.url && !photo.isSynced) {
          try {
            await oneDriveService.uploadImage(photo.url, photo.filename, targetFolderId);
            updatedPhotos[i] = { ...photo, isSynced: true };
            hasChanges = true;
          } catch (uploadError) {
             console.error(`Failed to upload ${photo.filename}`, uploadError);
             // 继续上传下一张照片
          }
        }
      }

      // 5. 更新状态
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
              // 如果当前选中的打印机是被同步的那个，更新它
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
    const hasMicrosoftToken = microsoftAuthService.accessToken;
    const hasValidToken = settings.cloudProvider === 'onedrive' && hasMicrosoftToken;
    
    if (settings.autoUpload && hasValidToken) {
      interval = window.setInterval(performSyncCycle, 5000); 
    }
    return () => clearInterval(interval);
  }, [settings.autoUpload, settings.cloudProvider, user, performSyncCycle]);

  /**
   * 简化的条形码识别
   * 只使用本地条形码/QR码读取，不依赖云端或OCR
   */
  const inferModelFromPartNumber = (partNumber: string): 'ZT411' | 'ZT421' => {
    const upper = partNumber.toUpperCase();
    if (upper.includes('ZT421')) return 'ZT421';
    return 'ZT411';
  };

  const analyzeWithBarcode = async (base64Image: string): Promise<{ serialNumber: string; model: string; partNumber: string }> => {
    try {
      console.log('📊 [analyzeWithBarcode] 开始...输入长度:', base64Image.length);
      const barcodeResults = await readBarcode(base64Image);
      console.log('📊 [analyzeWithBarcode] readBarcode 返回:', barcodeResults.length, '个结果');
      
      let serialNumber = '';
      let model = '';
      let partNumber = '';

      const parsePayload = (payload: string) => {
        console.log('📊 [parsePayload] 输入:', payload);
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

          if (!partNumber) {
            const partMatch = cleaned.match(/ZT4(11|21)\d{2,3}[-_]?[A-Z0-9]+/i);
            if (partMatch) {
              let normalized = partMatch[0].replace('_', '-');
              if (!normalized.includes('-') && normalized.length > 7) {
                normalized = `${normalized.slice(0, 7)}-${normalized.slice(7)}`;
              }
              partNumber = normalized;
              console.log('✅ [parsePayload] 识别为部件号:', partNumber);
            }
          }

          if (!serialNumber) {
            const labeledSerial = cleaned.match(/SN[:=]?([A-Z0-9-]{8,})/i);
            if (labeledSerial) {
              serialNumber = labeledSerial[1];
              console.log('✅ [parsePayload] 识别为序列号（带标签）:', serialNumber);
            }
          }

          if (!serialNumber) {
            const serialMatch = cleaned.match(/[A-Z0-9]{2}[A-Z]\d{9}/i) || cleaned.match(/\d{10,15}/);
            if (serialMatch) {
              serialNumber = serialMatch[0];
              console.log('✅ [parsePayload] 识别为序列号（正则）:', serialNumber);
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
          console.log('[analyzeWithBarcode] ' + (result.type === 'qrcode' ? 'QR码内容:' : '条形码内容:'), result.value);
          parsePayload(result.value);
        }
      } else {
        console.log('❌ [analyzeWithBarcode] 未找到条码结果');
      }
      
      if (!model && partNumber) {
        model = inferModelFromPartNumber(partNumber);
      }
      if (!model) model = 'ZT411';
      
      console.log('📊 [analyzeWithBarcode] 最终返回:', { serialNumber, model, partNumber });
      return { serialNumber, model, partNumber };
    } catch (error) {
      console.error('❌ [analyzeWithBarcode] 条形码识别失败:', error);
      throw new Error('Barcode recognition failed');
    }
  };

  const handleCapture = (base64: string) => {
    console.log('📸 [handleCapture] 收到图像，长度:', base64.length);
    setCapturedImage(base64);
    
    if (settings.skipReview) {
      // Skip review screen if configured
      if (sessionIndex === 0 && !isSingleRetake) {
        console.log('📸 [handleCapture] skipReview=true，sessionIndex=0， 开始分析...');
        setIsAnalyzing(true);
        const cleanBase64 = base64.split(',')[1];
        analyzeWithBarcode(cleanBase64)
          .then(result => { 
            console.log('📸 [handleCapture] 分析成功，结果:', result);
            setBaseSerialNumber(result.serialNumber);
            setBasePartNumber(result.partNumber || '');
            setSessionData({ serialNumber: result.serialNumber, model: result.model, partNumber: result.partNumber });
            // Auto-confirm after analysis
            setTimeout(() => {
              const newData = { serialNumber: result.serialNumber, model: result.model, partNumber: result.partNumber };
              console.log('📸 [handleCapture] 自动确认，数据:', newData);
              processConfirmation(base64, newData);
            }, 300);
          })
          .catch((error) => { 
            console.error('📸 [handleCapture] 分析失败:', error);
            const fallbackData = { serialNumber: "", model: "ZT411", partNumber: "" };
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
        const currentData = { serialNumber: suffixedSerial, model: inferModelFromPartNumber(basePartNumber || 'ZT411'), partNumber: basePartNumber };
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
            setBaseSerialNumber(result.serialNumber);
            setBasePartNumber(result.partNumber || '');
            setSessionData({ serialNumber: result.serialNumber, model: result.model, partNumber: result.partNumber });
          })
          .catch((error) => { 
            console.error('📸 [handleCapture] 分析失败:', error);
            setBaseSerialNumber("");
            setBasePartNumber("");
            setSessionData({ serialNumber: "", model: "ZT411", partNumber: "" });
          })
          .finally(() => setIsAnalyzing(false));
      } else {
        // For Step 2-12, use base serial with suffix
        const suffixedSerial = baseSerialNumber ? `${baseSerialNumber}_${sessionIndex + 1}` : `SERIAL_${sessionIndex + 1}`;
        setSessionData({ serialNumber: suffixedSerial, model: inferModelFromPartNumber(basePartNumber || 'ZT411'), partNumber: basePartNumber });
        setIsAnalyzing(false);
      }
    }
  };

  const finalizeSession = useCallback((finalPhotos: PhotoSetItem[], data: { serialNumber: string; model: string; partNumber?: string }) => {
    const completePhotos: PhotoSetItem[] = PHOTO_LABELS.map((label, i) => {
      const existing = finalPhotos.find(p => p.label === label);
      return existing || { url: '', label, filename: `${data.model}_${data.serialNumber}_${i + 1}.jpg`, isSynced: false };
    });

    const newPrinter: Printer = { 
      id: selectedPrinter?.id || `local-${Date.now()}`, 
      projectId: activeProjectId || 'proj-1', 
      serialNumber: data.serialNumber, 
      model: data.model as any, 
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

  const processConfirmation = useCallback((img: string, data: { serialNumber: string; model: string; partNumber?: string }) => {
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
    <div className="app-container w-full h-full bg-transparent overflow-hidden flex flex-col">
      <div key={currentScreen} className="w-full h-full screen-enter flex flex-col overflow-hidden">
        {currentScreen === AppScreen.SPLASH && <SplashScreen />}
        {currentScreen === AppScreen.PROJECT_LIST && <ProjectListScreen projects={projects} printers={printers} onSelectProject={(id) => { setActiveProjectId(id); setCurrentScreen(AppScreen.GALLERY); }} onCreateProject={(name) => setProjects([{ id: `p-${Date.now()}`, name, printerIds: [], createdAt: new Date().toISOString() }, ...projects])} onRenameProject={(id, newName) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p))} onDeleteProject={(id) => { setProjects(prev => prev.filter(p => p.id !== id)); setPrinters(prev => prev.filter(p => p.projectId !== id)); }} onOpenSettings={() => setCurrentScreen(AppScreen.SETTINGS)} user={user} onLogin={handleLogin} onLogout={handleLogout} />}
        {currentScreen === AppScreen.GALLERY && <GalleryScreen user={user} activeProject={activeProject} onLogin={handleLogin} onLogout={handleLogout} printers={activePrinters} onSearch={() => setCurrentScreen(AppScreen.SEARCH)} onAdd={() => { setSessionIndex(0); setSessionPhotos([]); setSessionData(null); setIsSingleRetake(false); setSelectedPrinter(null); setCurrentScreen(AppScreen.CAMERA); }} onSelectPrinter={(p) => { setSelectedPrinter(p); setCurrentScreen(AppScreen.DETAILS); }} onPreviewImage={(url) => { setPreviewPhotos([{url, label: 'Preview', filename: 'p.jpg'}]); setPreviewIndex(0); setLastScreen(AppScreen.GALLERY); setCurrentScreen(AppScreen.PREVIEW); }} onOpenSettings={() => setCurrentScreen(AppScreen.SETTINGS)} onManualSync={performSyncCycle} onBackToProjects={() => setCurrentScreen(AppScreen.PROJECT_LIST)} />}
        {currentScreen === AppScreen.CAMERA && <CameraScreen sessionIndex={sessionIndex} isSingleRetake={isSingleRetake} initialFlash={settings.defaultFlash} onClose={() => { if (sessionPhotos.length > 0 && sessionData) finalizeSession(sessionPhotos, sessionData); else { setCurrentScreen(isSingleRetake ? lastScreen : AppScreen.GALLERY); setIsSingleRetake(false); } }} onCapture={handleCapture} />}
        {currentScreen === AppScreen.REVIEW && <ReviewScreen imageUrl={capturedImage!} data={sessionData!} isAnalyzing={isAnalyzing} sessionIndex={sessionIndex} isSingleRetake={isSingleRetake} onRetake={() => setCurrentScreen(AppScreen.CAMERA)} onUpdateData={(newData) => { setSessionData(newData); if (sessionIndex === 0 && !isSingleRetake) { setBaseSerialNumber(newData.serialNumber); setBasePartNumber(newData.partNumber || ''); } }} onConfirm={() => processConfirmation(capturedImage!, sessionData || { serialNumber: 'Manual_SN', model: 'ZT411' })} />}
        {currentScreen === AppScreen.DETAILS && <DetailsScreen printer={selectedPrinter!} viewMode={detailsViewMode} setViewMode={setDetailsViewMode} onBack={() => setCurrentScreen(AppScreen.GALLERY)} onAddPhoto={(idx) => { setSessionIndex(idx); setIsSingleRetake(true); setSessionData({ serialNumber: selectedPrinter!.serialNumber, model: selectedPrinter!.model, partNumber: selectedPrinter!.partNumber }); setLastScreen(AppScreen.DETAILS); setCurrentScreen(AppScreen.CAMERA); }} onPreviewImage={(photos, index) => { setPreviewPhotos(photos); setPreviewIndex(index); setLastScreen(AppScreen.DETAILS); setCurrentScreen(AppScreen.PREVIEW); }} onManualSync={performSyncCycle} onUpdatePrinter={updatePrinter} onAllPhotosComplete={() => { setSessionIndex(0); setSessionPhotos([]); setSessionData(null); setBaseSerialNumber(''); }} isSyncing={selectedPrinter?.isSyncing} user={user} onLogin={handleLogin} onLogout={handleLogout} />}
        {currentScreen === AppScreen.PREVIEW && <ImagePreviewScreen photos={previewPhotos} initialIndex={previewIndex} onBack={() => setCurrentScreen(lastScreen)} onRetake={(idx) => { setSessionIndex(idx); setIsSingleRetake(true); if (selectedPrinter) setSessionData({ serialNumber: selectedPrinter.serialNumber, model: selectedPrinter.model }); setCurrentScreen(AppScreen.CAMERA); }} onReplace={(idx, b64) => { if (!selectedPrinter) return; const currentPhotos = selectedPrinter.photos || []; const updatedPhotos = [...currentPhotos]; updatedPhotos[idx] = { ...updatedPhotos[idx], url: b64, isSynced: false }; const updatedPrinter = { ...selectedPrinter, photos: updatedPhotos, imageUrl: idx === 0 ? b64 : selectedPrinter.imageUrl, syncedCount: updatedPhotos.filter(p => p.isSynced).length }; setPrinters(prev => prev.map(p => p.id === selectedPrinter.id ? updatedPrinter : p)); setSelectedPrinter(updatedPrinter); setPreviewPhotos(updatedPhotos); }} />}
        {currentScreen === AppScreen.SETTINGS && <SettingsScreen settings={settings} onUpdate={setSettings} activeProject={activeProject} onBack={() => setCurrentScreen(activeProjectId ? AppScreen.GALLERY : AppScreen.PROJECT_LIST)} />}
        {currentScreen === AppScreen.SEARCH && <SearchScreen printers={printers} onBack={() => setCurrentScreen(AppScreen.GALLERY)} onPreviewImage={(url) => { setPreviewPhotos([{url, label: 'Search', filename: 's.jpg'}]); setPreviewIndex(0); setLastScreen(AppScreen.SEARCH); setCurrentScreen(AppScreen.PREVIEW); }} />}
      </div>
    </div>
  );
};

export default App;
