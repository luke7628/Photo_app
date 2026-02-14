# 移动端特定配置和初始化

本文档说明在 Photo Suite 中针对 iOS 和 Android 平台的特定配置。

## 目录

- [初始化流程](#初始化流程)
- [平台检测](#平台检测)
- [权限处理](#权限处理)
- [屏幕尺寸适配](#屏幕尺寸适配)
- [设备特性检测](#设备特性检测)
- [状态栏和导航栏](#状态栏和导航栏)
- [离线支持](#离线支持)

---

## 初始化流程

### 应用启动序列

```
1. index.tsx - 应用入口
   ├─ 初始化 React
   ├─ 加载初始样式
   └─ 挂载 App 组件

2. App.tsx - 主应用组件
   ├─ useEffect 初始化
   ├─ 检测平台 (isCapacitor)
   ├─ 加载已保存的设置
   ├─ 验证令牌有效性
   ├─ 初始化云存储服务
   └─ 启动定期同步任务 (performSyncCycle)

3. 特定于平台的初始化
   ├─ iOS 特定处理
   └─ Android 特定处理
```

### 推荐的初始化代码

在 `App.tsx` 中添加平台特定的初始化：

```typescript
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const isCapacitor = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios', 'android', 'web'

useEffect(() => {
  const initializeMobile = async () => {
    if (!isCapacitor) return;
    
    try {
      // 特定于平台的初始化
      if (platform === 'ios') {
        await initializeIOS();
      } else if (platform === 'android') {
        await initializeAndroid();
      }
      
      // 通用初始化
      await initializeCommon();
      
    } catch (error) {
      console.error('Mobile initialization failed:', error);
    }
  };
  
  initializeMobile();
}, []);

async function initializeIOS() {
  // iOS 特定初始化
  console.log('Initializing iOS...');
}

async function initializeAndroid() {
  // Android 特定初始化
  console.log('Initializing Android...');
}

async function initializeCommon() {
  // 跨平台初始化
  console.log('Common initialization...');
}
```

---

## 平台检测

### 运行时平台检测

```typescript
import { Capacitor } from '@capacitor/core';

// 检查是否在原生环境中运行
const isNative = Capacitor.isNativePlatform();

// 获取当前平台
const platform = Capacitor.getPlatform(); // 'ios', 'android', 'web'

// 在组件中使用
function MyComponent() {
  return (
    <>
      {platform === 'ios' && <div>iOS 特定内容</div>}
      {platform === 'android' && <div>Android 特定内容</div>}
      {!isNative && <div>Web 特定内容</div>}
    </>
  );
}
```

### 构建时条件编译

对于需要完全不同的实现，可以使用文件后缀：

```
src/
├── services/
│   ├── storageService.ts        # 通用实现
│   ├── storageService.ios.ts    # iOS 特定
│   ├── storageService.android.ts # Android 特定
│   └── storageService.web.ts    # Web 特定

// 配置 Vite 自动选择正确的文件
```

在 `vite.config.ts` 中配置：

```typescript
export default defineConfig({
  resolve: {
    extensions: ['.ts', `.${platform}.ts`, '.tsx', `.${platform}.tsx`, '.js']
  }
});
```

---

## 权限处理

### 相机权限流程

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';
import { Toast } from '@capacitor/toast';

async function requestCameraPermission(): Promise<boolean> {
  try {
    // 请求权限
    const permission = await Camera.requestPermissions();
    
    if (permission.camera === 'granted') {
      return true;
    } else if (permission.camera === 'denied') {
      await Toast.show({
        text: '相机权限被拒绝',
        duration: 'short'
      });
      return false;
    } else {
      // 用户选择"稍后再询问"
      return false;
    }
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

async function takePhotoWithPermission(): Promise<string | null> {
  const hasPermission = await requestCameraPermission();
  
  if (!hasPermission) {
    return null;
  }
  
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      promptLabelPhoto: '选择照片',
      promptLabelPicture: '拍照'
    });
    
    return photo.base64String ?? null;
  } catch (error) {
    console.error('Failed to take photo:', error);
    return null;
  }
}
```

### iOS 权限提示文本

在 `ios/App/App/Info.plist` 中编辑权限提示：

```xml
<key>NSCameraUsageDescription</key>
<string>Photo Suite 需要访问您的相机来拍摄照片和识别条形码</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Photo Suite 需要访问您的照片库来选择和管理照片</string>

<key>NSPhotoLibraryAddOnlyUsageDescription</key>
<string>Photo Suite 需要权限将新照片保存到您的照片库</string>

<key>NSMicrophoneUsageDescription</key>
<string>Photo Suite 可能需要访问麦克风用于未来的功能</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Photo Suite 可能需要位置信息用于地理标记照片</string>
```

### Android 权限处理

在 `android/app/src/main/AndroidManifest.xml` 中声明权限：

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

对于 Android 6.0+ 的运行时权限，Capacitor 会自动处理。

---

## 屏幕尺寸适配

### 响应式设计

```typescript
// 检测屏幕尺寸
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

// 使用媒体查询
const isMobile = window.matchMedia('(max-width: 600px)').matches;
const isTablet = window.matchMedia('(min-width: 601px) and (max-width: 1024px)').matches;
const isDesktop = window.matchMedia('(min-width: 1025px)').matches;

// React Hook 用于响应式设计
function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 600,
    isTablet: window.innerWidth >= 600 && window.innerWidth <= 1024,
    isDesktop: window.innerWidth > 1024
  });
  
  React.useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 600,
        isTablet: window.innerWidth >= 600 && window.innerWidth <= 1024,
        isDesktop: window.innerWidth > 1024
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return screenSize;
}
```

### Safe Area 处理（iPhone notch）

```css
/* CSS 中使用 safe-area-inset */
.content {
  padding-top: max(16px, env(safe-area-inset-top));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
}
```

```typescript
// 获取 Safe Area 信息
function getSafeArea() {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0')
  };
}
```

---

## 设备特性检测

### 检测设备能力

```typescript
import { Device } from '@capacitor/device';

async function getDeviceInfo() {
  const info = await Device.getInfo();
  
  return {
    platform: info.platform,        // 'web', 'ios', 'android'
    operatingSystem: info.osVersion, // 版本
    manufacturer: info.manufacturer,
    model: info.model,
    memoryUsage: info.memUsed,
    diskFreeSpace: info.diskFree,
    diskTotalSize: info.diskTotal,
    isVirtual: info.isVirtual,       // 是否在模拟器上运行
    batteryLevel: info.batteryLevel  // 电池百分比 (可能为 null)
  };
}

// 检查具体能力
async function checkDeviceCapabilities() {
  const info = await Device.getInfo();
  
  if (info.isVirtual) {
    console.log('Running on emulator/simulator');
  }
  
  if (info.diskFree! < 100) {
    console.warn('Low disk space');
  }
  
  if (info.memUsed! > 80) {
    console.warn('High memory usage');
  }
}
```

### 设备标识

```typescript
import { Device } from '@capacitor/device';

async function getUniqueDeviceId() {
  const { identifier } = await Device.getId();
  return identifier; // 唯一的设备标识符
}
```

---

## 状态栏和导航栏

### iOS 状态栏（需要 @capacitor/status-bar）

```bash
npm install @capacitor/status-bar
```

```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

// 设置深色样式
StatusBar.setStyle({ style: Style.Dark });

// 设置浅色样式
StatusBar.setStyle({ style: Style.Light });

// 设置背景颜色
StatusBar.setBackgroundColor({ color: '#ffffff' });

// 显示/隐藏
StatusBar.show();
StatusBar.hide();
```

### Android 软键导航栏

```typescript
import { App as CapacitorApp } from '@capacitor/app';

// 监听返回按钮
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    // 返回上一页
    window.history.back();
  } else {
    // 退出应用
    CapacitorApp.exitApp();
  }
});
```

---

## 离线支持

### 网络状态检测

```typescript
import { Network } from '@capacitor/network';

// 检查当前网络状态
async function checkNetworkStatus() {
  const status = await Network.getStatus();
  
  return {
    connected: status.connected,
    connectionType: status.connectionType, // 'wifi', '4g', etc.
    isOnline: status.connected
  };
}

// 监听网络变化
Network.addListener('networkStatusChange', (status) => {
  if (status.connected) {
    console.log('Device is online');
    // 重新同步数据
    performSyncCycle();
  } else {
    console.log('Device is offline');
    // 停止上传，使用本地缓存
  }
});
```

### 离线队列管理

```typescript
interface OfflineOperation {
  id: string;
  type: 'upload' | 'sync';
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private queue: OfflineOperation[] = [];
  
  async addToQueue(operation: OfflineOperation) {
    this.queue.push(operation);
    // 保存到 IndexedDB
    await storageService.saveOfflineQueue(this.queue);
  }
  
  async processQueue() {
    const status = await Network.getStatus();
    
    if (!status.connected) {
      return; // 设备离线，稍后重试
    }
    
    while (this.queue.length > 0) {
      const operation = this.queue[0];
      
      try {
        if (operation.type === 'upload') {
          await uploadFile(operation.data);
        }
        this.queue.shift();
        await storageService.saveOfflineQueue(this.queue);
      } catch (error) {
        operation.retries++;
        
        if (operation.retries > 3) {
          this.queue.shift(); // 放弃重试
        }
        
        break; // 停止处理，稍后重试
      }
    }
  }
}

// 在网络恢复时处理队列
Network.addListener('networkStatusChange', async (status) => {
  if (status.connected) {
    const offlineQueue = new OfflineQueue();
    await offlineQueue.processQueue();
  }
});
```

### Service Worker 离线支持

在 `public/` 目录中创建 `sw.js`：

```javascript
// Service Worker 缓存策略
const CACHE_NAME = 'photo-suite-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles/theme.css',
  '/dist/bundle.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // 缓存优先策略
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      
      return fetch(event.request).catch(() => {
        // 离线时返回缓存的主页
        return caches.match('/index.html');
      });
    })
  );
});
```

在 `index.html` 中注册 Service Worker：

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed'));
  }
</script>
```

---

## 最佳实践总结

1. **始终检查平台：** 在使用平台特定 API 前检查 `Capacitor.getPlatform()`
2. **处理权限：** 为相机、位置等权限提供适当的请求和回退
3. **响应式设计：** 为各种设备尺寸设计 UI
4. **网络感知：** 检查网络状态并相应地处理离线场景
5. **性能优化：** 压缩图像，延迟加载，最小化包大小
6. **安全性：** 不要在 localStorage 中存储敏感令牌，使用内存存储
7. **测试：** 在真实设备和模拟器上测试所有平台

---

## 参考资源

- [Capacitor 文档 - 平台 API](https://capacitorjs.com/docs/apis)
- [Device API](https://capacitorjs.com/docs/apis/device)
- [Network API](https://capacitorjs.com/docs/apis/network)
- [iOS 人机界面指南](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Android Material Design](https://material.io/design)
