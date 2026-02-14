# Capacitor 配置和最佳实践

本文档说明 Photo Suite 在 Capacitor 中的配置、原生功能集成和最佳实践。

## 目录

- [Capacitor 配置](#capacitor-配置)
- [已安装的插件](#已安装的插件)
- [原生功能集成](#原生功能集成)
- [性能优化](#性能优化)
- [安全最佳实践](#安全最佳实践)
- [原生模块扩展](#原生模块扩展)

---

## Capacitor 配置

### capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dematic.photosuite',
  appName: 'Photo Suite',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true  // 允许 HTTP 用于开发环境
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    App: {
      exitOnBackButton: true
    },
    Keyboard: {
      resizeOnFullScreen: true
    }
  }
};

export default config;
```

### 所有可用配置选项

```typescript
{
  // 基本信息
  appId: string                    // App Bundle ID (iOS) / Package Name (Android)
  appName: string                  // 应用显示名称
  
  // Web 资源
  webDir: string                   // Web 资源目录
  
  // 服务器配置
  server: {
    url?: string                   // 自定义服务器 URL （实时开发）
    androidScheme?: string        // Android 使用的 URL scheme
    cleartext?: boolean           // 允许 HTTP（开发环境）
    scrollBounce?: boolean        // 页面反弹效果
    initialCapacitorContentVersion?: number
  }
  
  // 插件配置
  plugins: {
    [pluginName]: {
      // 插件特定配置
    }
  }
  
  // iOS 特定
  ios: {
    contentInset?: 'always' | 'scrolls'
    scrollEnabled?: boolean
  }
  
  // Android 特定
  android: {
    buildOptions?: {
      // Gradle 构建选项
    }
  }
  
  // 日志
  logLevel?: 'verbose' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  
  // 无头模式
  isNativeIde?: boolean            // IDE 内开发模式
}
```

---

## 已安装的插件

### 1. Camera (`@capacitor/camera`)

拍照和获取图像库。

**配置：**
```typescript
{
  Camera: {
    permissions: ['camera', 'photos']
  }
}
```

**iOS 权限（Info.plist）：**
```xml
<key>NSCameraUsageDescription</key>
<string>Photo Suite 需要访问相机以拍摄照片</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Photo Suite 需要访问相册以管理照片</string>

<key>NSPhotoLibraryAddOnlyUsageDescription</key>
<string>Photo Suite 需要权限保存照片到相册</string>
```

**Android 权限（AndroidManifest.xml）：**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

**使用示例：**
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

async function takePhoto() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Base64
  });
  
  return image.base64String;
}
```

### 2. App (`@capacitor/app`)

应用生命周期和事件处理。

**配置：**
```typescript
{
  App: {
    exitOnBackButton: true  // Android 返回按钮退出应用
  }
}
```

**使用示例：**
```typescript
import { App } from '@capacitor/app';

// 监听应用暂停
App.addListener('pause', () => {
  console.log('App paused');
});

// 监听应用恢复
App.addListener('resume', () => {
  console.log('App resumed');
});

// 监听返回按钮
App.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack) {
    App.exitApp();
  }
});
```

### 3. Keyboard (`@capacitor/keyboard`)

虚拟键盘控制。

**配置：**
```typescript
{
  Keyboard: {
    resizeOnFullScreen: true
  }
}
```

**使用示例：**
```typescript
import { Keyboard } from '@capacitor/keyboard';

// 隐藏键盘
await Keyboard.hide();

// 显示键盘
await Keyboard.show();

// 监听键盘事件
Keyboard.addListener('keyboardWillShow', (info) => {
  console.log('Keyboard height:', info.keyboardHeight);
});
```

---

## 原生功能集成

### 集成自定义原生代码

#### iOS (Swift)

在 `ios/App/App/Plugins/YourPlugin.swift` 中创建自定义插件：

```swift
import Capacitor

@objc(YourPlugin)
public class YourPlugin: CAPPlugin {
  @objc func nativeFunction(_ call: CAPPluginCall) {
    let message = call.getString("message") ?? ""
    
    DispatchQueue.main.async {
      // 执行 UI 操作
      call.resolve([
        "result": "Processed: \(message)"
      ])
    }
  }
}
```

在 `ios/App/App/Plugins/YourPlugin.swift` 的 JavaScript 中调用：

```typescript
import { registerPlugin } from '@capacitor/core';

const YourPlugin = registerPlugin('YourPlugin');

async function callNative() {
  const result = await YourPlugin.nativeFunction({
    message: 'Hello from Web'
  });
  console.log(result);
}
```

#### Android (Kotlin/Java)

在 `android/app/src/main/java/com/dematic/photosuite/YourPlugin.java` 中创建：

```java
package com.dematic.photosuite;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "YourPlugin")
public class YourPlugin extends Plugin {
  @PluginMethod
  public void nativeFunction(PluginCall call) {
    String message = call.getString("message", "");
    
    JSObject ret = new JSObject();
    ret.put("result", "Processed: " + message);
    call.resolve(ret);
  }
}
```

### 常见集成场景

#### 1. 访问本地文件系统

```typescript
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

async function saveToFile(filename: string, data: string) {
  await Filesystem.writeFile({
    path: filename,
    data: data,
    directory: Directory.Documents,
    encoding: Encoding.UTF8
  });
}

async function readFromFile(filename: string) {
  const data = await Filesystem.readFile({
    path: filename,
    directory: Directory.Documents,
    encoding: Encoding.UTF8
  });
  return data.data;
}
```

#### 2. 本地存储

```typescript
import { Preferences } from '@capacitor/preferences';

async function saveUserData(key: string, value: string) {
  await Preferences.set({ key, value });
}

async function getUserData(key: string) {
  const { value } = await Preferences.get({ key });
  return value;
}
```

#### 3. 网络状态检查

```typescript
import { Network } from '@capacitor/network';

async function checkNetwork() {
  const status = await Network.getStatus();
  console.log('Connected:', status.connected);
  console.log('Type:', status.connectionType);
}

// 监听网络变化
Network.addListener('networkStatusChange', (status) => {
  console.log('Network status:', status);
  if (!status.connected) {
    console.log('Device is offline');
  }
});
```

---

## 性能优化

### 1. Web 资源优化

**vite.config.ts:**
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    target: ['chrome90', 'safari15'],  // 针对移动浏览器
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'barcode': ['@zxing/library'],
          'vendors': ['react', 'react-dom']
        }
      }
    }
  }
});
```

### 2. 代码分割

```typescript
// 延迟加载大型组件
const CameraScreen = lazy(() => import('./components/CameraScreen'));
const GalleryScreen = lazy(() => import('./components/GalleryScreen'));

// 在使用前导入
const CameraComponent = await import('./components/CameraScreen');
```

### 3. 图像优化

```typescript
// 压缩上传前的图像
async function compressImage(base64: string): Promise<string> {
  const canvas = document.createElement('canvas');
  const img = new Image();
  
  img.onload = () => {
    const maxWidth = 1080;
    const ratio = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = img.height * ratio;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };
  
  img.src = `data:image/jpeg;base64,${base64}`;
}
```

### 4. 内存管理

```typescript
// 避免内存泄漏
useEffect(() => {
  const subscription = someObservable.subscribe(data => {
    // 处理数据
  });
  
  // 清理订阅
  return () => subscription.unsubscribe();
}, []);

// 及时释放资源
async function cleanupResources() {
  // 清除 IndexedDB
  const dbs = await indexedDB.databases();
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
  
  // 清除 localStorage
  localStorage.clear();
}
```

---

## 安全最佳实践

### 1. 令牌安全

```typescript
// ❌ 不要这样做 (不安全)
const token = localStorage.getItem('accessToken');

// ✅ 使用 In-Memory 存储敏感数据
let accessToken: string | null = null;

function setToken(token: string) {
  accessToken = token;
}

function getToken(): string | null {
  return accessToken;
}
```

### 2. HTTPS 强制

在 `capacitor.config.ts` 中：
```typescript
{
  server: {
    androidScheme: 'https',  // 强制 HTTPS
    cleartext: false          // 禁用 HTTP
  }
}
```

### 3. 内容安全策略

在 `public/index.html` 中：
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;">
```

### 4. 权限最小化

只请求必要的权限：
```typescript
// ❌ 不要一次请求所有权限

// ✅ 根据具体操作请求权限
if (needCamera) {
  await Camera.requestPermissions();
}
```

### 5. 数据加密

```typescript
// 对敏感数据进行加密
import * as crypto from 'crypto';

function encryptData(data: string, secret: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}

function decryptData(encrypted: string, secret: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
```

---

## 原生模块扩展

### 添加新的 Capacitor 插件

```bash
# 安装插件
npm install @capacitor/plugin-name

# 同步原生代码
npm run sync:both
```

### 常用插件推荐

| 插件 | 功能 | 安装 |
|------|------|------|
| `@capacitor/file` | 文件访问 | `npm install @capacitor/file` |
| `@capacitor/network` | 网络检查 | `npm install @capacitor/network` |
| `@capacitor/push-notifications` | 推送通知 | `npm install @capacitor/push-notifications` |
| `@capacitor/geolocation` | GPS 定位 | `npm install @capacitor/geolocation` |
| `@capacitor/share` | 系统分享 | `npm install @capacitor/share` |
| `@capacitor/toast` | 跨平台吐司 | `npm install @capacitor/toast` |

### 添加自定义原生代码

参考上面的 [原生功能集成](#原生功能集成) 部分。

---

## 调试

### 使用 DevTools

#### iOS（Safari）
```bash
# 1. 在 Safari 中启用开发者菜单
# Safari > Preferences > Advanced > Show Develop menu

# 2. Develop > [Your Device] > [Photo Suite]

# 3. 使用 DevTools Inspector
```

#### Android（Chrome DevTools）
```bash
# 1. 启用 USB 调试：Settings > Developer Options > USB Debugging

# 2. Chrome 中访问：chrome://inspect

# 3. 选择你的设备和应用

# 4. 使用 Chrome DevTools
```

### 日志记录

```typescript
// 开发环境详细日志
if (process.env.NODE_ENV === 'development') {
  console.log = (...args) => alert(JSON.stringify(args));
}

// 使用 Capacitor Logger 插件
import { CapacitorHttp } from '@capacitor/core';

class Logger {
  static async log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // 本地记录
    console.log(logMessage);
    
    // 可选：发送到远程日志服务
    // await this.sendToRemote(logMessage);
  }
}
```

---

## 故障排除

### 常见问题

**Q: 应用在设备上显示空白屏幕**

A: 
1. 检查控制台错误：`npm run sync:both`
2. 验证 `dist/` 内容已生成：`npm run build`
3. 检查 Capacitor 配置中的 `webDir` 是否正确

**Q: 原生权限未被请求**

A: 
1. 检查 iOS Info.plist 中的权限声明
2. 检查 Android AndroidManifest.xml 中的权限声明
3. 在应用中显式调用权限请求

**Q: 构建缓存问题**

A: 
```bash
rm -rf dist/ node_modules/ ios/Pods/ android/.gradle
npm install
npm run build
npm run sync:both
```

---

## 参考资源

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Capacitor 插件列表](https://capacitorjs.com/docs/plugins)
- [iOS 开发](https://developer.apple.com/swift/)
- [Android 开发](https://developer.android.com/)
