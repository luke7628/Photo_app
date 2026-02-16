# Photo Suite App - 快速参考指南

## 目录
1. [目录结构](#目录结构)
2. [快速开始](#快速开始)
3. [常见任务](#常见任务)
4. [组件速查](#组件速查)
5. [服务速查](#服务速查)
6. [样式指南](#样式指南)
7. [常见问题](#常见问题)
8. [调试技巧](#调试技巧)

---

## 目录结构

```
src/
├── components/              # React 组件
│   ├── CameraScreen.tsx     # 相机拍摄
│   ├── ReviewScreen.tsx     # 照片审核
│   ├── GalleryScreen.tsx    # 图库和打印机列表
│   ├── ProjectListScreen.tsx # 项目管理
│   ├── SettingsScreen.tsx   # 应用设置
│   ├── SplashScreen.tsx     # 启动和认证
│   ├── SearchScreen.tsx     # 全局搜索
│   ├── DetailsScreen.tsx    # 打印机详情
│   ├── ImagePreviewScreen.tsx # 图像预览
│   ├── ModelSelector.tsx    # 型号选择
│   └── UserAvatar.tsx       # 用户头像
│
├── services/                # 业务逻辑
│   ├── microsoftAuthService.ts      # Microsoft 认证
│   ├── oneDriveService.ts           # OneDrive 文件操作
│   ├── barcodeService.ts            # 条码识别
│   ├── storageService.ts            # 本地存储
│   ├── imagePreprocessor.ts         # 图像处理
│   ├── quaggaService.ts             # Quagga 条码集成
│   ├── projectUtils.ts              # 项目工具
│   ├── modelMemoryService.ts        # 模型内存管理
│   ├── errorHandler.ts      (新增)  # 错误处理
│   ├── logger.ts            (新增)  # 日志记录
│   ├── styleService.ts      (新增)  # 样式工具
│   └── performanceService.ts(新增)  # 性能监控
│
├── hooks/                   # 自定义 Hooks
│   └── useDeviceOrientation.ts (新增) # 设备方向
│
├── styles/                  # 全局样式
│   ├── theme.css           # 主题和变量
│   └── animations.css      (新增) # 动画定义
│
├── types.ts                # TypeScript 类型定义
├── constants.ts            # 应用常量
├── App.tsx                 # 主应用
├── index.tsx              # 入口点
└── vite.config.ts         # Vite 配置
```

---

## 快速开始

### 环境设置

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 构建生产版本
npm run build

# 构建 Android
npm run build
npx cap add android
npx cap sync android
npx cap open android

# 构建 iOS
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

### 开发工作流

```bash
# 1. 启动开发服务器
npm run dev

# 2. 在浏览器打开
# http://localhost:5173

# 3. 编辑组件（自动热重载）

# 4. 查看控制台日志
# 按 F12 打开开发工具

# 5. 测试移动设备
# 使用 Chrome DevTools 的设备模拟
```

---

## 常见任务

### 添加新组件

```typescript
// components/NewComponent.tsx
import { FC } from 'react'

interface NewComponentProps {
  // 定义 props
}

export const NewComponent: FC<NewComponentProps> = ({
  // 解构 props
}) => {
  return (
    <div className="flex items-center justify-center">
      {/* UI */}
    </div>
  )
}
```

### 添加新服务

```typescript
// services/newService.ts
import { logger } from './logger'
import { AppError, ErrorCode, apiCallWithRetry } from './errorHandler'

class NewService {
  async someMethod() {
    try {
      return await apiCallWithRetry(
        async () => {
          // 业务逻辑
        },
        { maxRetries: 3 }
      )
    } catch (error: unknown) {
      const appError = parseError(error)
      logger.error('NewService', '方法失败', appError)
      throw appError
    }
  }
}

export const newService = new NewService()
```

### 添加新类型

```typescript
// types.ts
export interface NewType {
  id: string
  name: string
  createdAt: Date
}

export type NewUnion = 'option1' | 'option2' | 'option3'
```

### 添加新常量

```typescript
// constants.ts
export const NEW_CONSTANT = 'value'
export const NEW_CONFIG = {
  TIMEOUT: 5000,
  RETRIES: 3
}
```

### 在组件中使用服务

```typescript
import { useCallback, useState } from 'react'
import { newService } from '../services/newService'
import { logger } from '../services/logger'

export function MyComponent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAction = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await newService.someMethod()
      logger.info('MyComponent', '操作成功', result)
      // 处理结果
    } catch (err: unknown) {
      const appError = parseError(err)
      setError(appError.message)
      logger.error('MyComponent', '操作失败', appError)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div>
      {error && <div className="text-red-600">{error}</div>}
      <button
        onClick={handleAction}
        disabled={loading}
      >
        {loading ? '加载中...' : '操作'}
      </button>
    </div>
  )
}
```

---

## 组件速查

### SplashScreen
**用途**: 启动和认证
**主要方法**: 
- `handleMicrosoftLogin()` - 打开 OAuth 授权窗口
- `processAuthCode(code)` - 处理授权码
**文件**: [components/SplashScreen.tsx](components/SplashScreen.tsx)

### CameraScreen
**用途**: 拍摄照片
**主要方法**:
- `capturePhoto()` - 拍摄照片
- `switchCamera()` - 切换摄像头
**文件**: [components/CameraScreen.tsx](components/CameraScreen.tsx)

### ReviewScreen
**用途**: 审核照片和识别条码
**主要方法**:
- `analyzeBarcode()` - 分析条码
- `handleConfirm()` - 用户确认
- `handleRetake()` - 重新拍摄
**文件**: [components/ReviewScreen.tsx](components/ReviewScreen.tsx)
**重要状态**: `uiRotation`, `recognizedSN`, `confidence`

### GalleryScreen
**用途**: 显示打印机列表和图库
**主要方法**:
- `filterPrinters()` - 过滤打印机
- `searchPrinters()` - 搜索打印机
**文件**: [components/GalleryScreen.tsx](components/GalleryScreen.tsx)
**关键特性**: 响应式列表、搜索过滤、图像预览

### SettingsScreen
**用途**: 应用配置
**配置项**: 云提供商、同步间隔、图像质量等
**文件**: [components/SettingsScreen.tsx](components/SettingsScreen.tsx)

### ProjectListScreen
**用途**: 项目管理
**主要操作**: 创建、编辑、删除项目
**文件**: [components/ProjectListScreen.tsx](components/ProjectListScreen.tsx)

### SearchScreen
**用途**: 全局搜索
**搜索对象**: 序列号、型号、项目名称
**文件**: [components/SearchScreen.tsx](components/SearchScreen.tsx)

### DetailsScreen
**用途**: 打印机详细信息
**显示内容**: 元数据、照片历史、同步状态
**文件**: [components/DetailsScreen.tsx](components/DetailsScreen.tsx)

### ImagePreviewScreen
**用途**: 全屏查看图像
**功能**: 放大/缩小、删除、分享
**文件**: [components/ImagePreviewScreen.tsx](components/ImagePreviewScreen.tsx)

### ModelSelector
**用途**: 选择打印机型号
**功能**: 搜索、快速过滤
**文件**: [components/ModelSelector.tsx](components/ModelSelector.tsx)

---

## 服务速查

### microsoftAuthService
```typescript
// 获取登录 URL
const url = microsoftAuthService.getLoginUrl(clientId, redirectUri)
window.open(url)

// 交换授权码
const token = await microsoftAuthService.exchangeCode(code, clientId, redirectUri)

// 刷新令牌
await microsoftAuthService.refreshAccessToken()

// 检查令牌过期
if (microsoftAuthService.isAccessTokenExpired()) {
  await microsoftAuthService.refreshAccessToken()
}

// 获取用户信息
const user = await microsoftAuthService.getUserInfo()

// 登出
microsoftAuthService.logout()
```

### oneDriveService
```typescript
// 获取驱动器信息
const info = await oneDriveService.getRootInfo()

// 查找文件夹
const folderId = await oneDriveService.findFolder(parentId, folderName)

// 确保文件夹存在
const folderId = await oneDriveService.ensureFolder(parentId, folderName)

// 上传图像
const result = await oneDriveService.uploadImage(folderId, filename, blob)

// 删除项目
await oneDriveService.deleteItem(itemId)

// 创建文件夹
const id = await oneDriveService.createFolder(parentId, folderName)
```

### barcodeService
```typescript
// 读取 1D 条码
const result = await barcodeService.readBarcode(imageUrl)

// 读取二维码
const result = await barcodeService.readQRCode(imageUrl)

// 综合分析
const result = await barcodeService.analyzeImage(imageUrl)

// 重置读取器
barcodeService.resetReader()
```

### storageService
```typescript
// LocalStorage 操作
const value = storageService.getItem('key')
storageService.setItem('key', value)
storageService.removeItem('key')

// IndexedDB 操作
const photos = await storageService.getPhotos(printerId)
await storageService.savePhoto(printerId, photo)
await storageService.deletePhoto(photoId)
await storageService.markSynced(photoId)

// 查询
const count = await storageService.getSyncedCount()
const unsyncedPhotos = await storageService.getAllUnsyncedPhotos()
```

### imagePreprocessor
```typescript
// 压缩图像
const compressed = await imagePreprocessor.compressImage(base64, 'medium')

// 标准化图像
const normalized = await imagePreprocessor.normalizeImage(base64)

// 获取图像元数据
const metadata = imagePreprocessor.getImageMetadata(base64)

// 应用滤镜
const filtered = await imagePreprocessor.applyFilter(base64, 'brightness')
```

### projectUtils
```typescript
// 创建项目
const project = projectUtils.createProject(projectData)

// 更新项目
const updated = projectUtils.updateProject(id, partialData)

// 删除项目
projectUtils.deleteProject(id)

// 获取 OneDrive 路径
const path = projectUtils.getProjectDrivePath(projectName, useSerialNumber)

// 格式化文件名
const filename = projectUtils.formatFilename('{sn}_{timestamp}', metadata)
```

### 新增服务

### errorHandler
```typescript
import { AppError, ErrorCode, parseError, apiCallWithRetry } from '../services/errorHandler'

// 解析错误
const appError = parseError(unknownError)

// API 调用带重试
const result = await apiCallWithRetry(
  () => fetch(...),
  { maxRetries: 3, retryDelay: 1000 }
)

// 抛出自定义错误
throw new AppError(ErrorCode.NETWORK_ERROR, 0, '网络连接失败')
```

### logger
```typescript
import { logger } from '../services/logger'

// 记录日志
logger.debug('Module', '调试信息', { data: ... })
logger.info('Module', '信息')
logger.warn('Module', '警告')
logger.error('Module', '错误', error)

// 导出日志
const logs = logger.getLogs()
const report = logger.exportLogs()
```

### styleService
```typescript
import { getRotationStyle, getOrientationClasses, getResponsiveSize } from '../services/styleService'

// 获取旋转样式
const style = getRotationStyle(90, 0.8)

// 获取方向类名
const classes = getOrientationClasses(isLandscape)

// 获取响应式大小
const size = getResponsiveSize(isLandscape, 'p-2', 'p-4')

// 获取渐变背景
const style = getGradientStyle(['#FF6B6B', '#4ECDC4'], 135)
```

### performanceService
```typescript
import { performanceMonitor } from '../services/performanceService'

// 标记开始
performanceMonitor.mark('operation-start')

// ... 执行操作

// 标记结束
performanceMonitor.mark('operation-end')

// 测量
performanceMonitor.measure('operation', 'operation-start', 'operation-end')

// 获取指标
const metric = performanceMonitor.getMetric('operation')
const allMetrics = performanceMonitor.getAllMetrics()

// 生成报告
const report = performanceMonitor.generateReport()
```

---

## 样式指南

### 使用 Tailwind CSS 类

```typescript
// ✅ 推荐：使用 Tailwind 类
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h1 className="text-lg font-semibold text-gray-900">标题</h1>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    按钮
  </button>
</div>

// ❌ 避免：混合使用 style 属性
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  padding: '16px'
}}>
  ...
</div>
```

### 动画类

```typescript
// ✅ 使用定义的动画
<div className="animate-slideUp">内容</div>
<div className="animate-fadeIn">内容</div>
<div className="animate-scaleIn">内容</div>

// 或自定义动画持续时间
<div className="animate-pulse">加载中...</div>
```

### 响应式设计

```typescript
// ✅ 使用 Tailwind 断点
<div className="text-sm md:text-base lg:text-lg">
  响应式文本
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 响应式网格 */}
</div>

// ✅ 使用自定义 hook 处理设备方向
const { isLandscape } = useDeviceOrientation()
<div className={isLandscape ? 'landscape-layout' : 'portrait-layout'}>
  内容
</div>
```

### 动态样式

```typescript
// ✅ 使用 useMemo 缓存动态样式
import { getRotationStyle } from '../services/styleService'

const style = useMemo(
  () => getRotationStyle(rotation, scale),
  [rotation, scale]
)

<div style={style}>内容</div>

// ❌ 避免：在每次渲染时创建新对象
<div style={{ transform: `rotate(${rotation}deg)` }}>内容</div>
```

### 条件样式

```typescript
// ✅ 使用三元或逻辑运算符
<div className={`base-class ${isActive ? 'active-class' : ''}`}>
  内容
</div>

<div className={`
  px-4 py-2
  ${isLoading ? 'opacity-50' : ''}
  ${isError ? 'border-red-500' : 'border-gray-300'}
`}>
  内容
</div>

// ❌ 避免：过长的类名拼接
const className = isActive && isLoading && isError ? '...' : '...'
```

### 主题支持

```typescript
// ✅ 支持亮色/暗色主题
<div className="bg-white dark:bg-slate-900 text-black dark:text-white">
  内容
</div>

// 切换主题
document.documentElement.classList.toggle('dark')
```

---

## 常见问题

### Q: 如何添加新的认证方式？

A: 在 `microsoftAuthService.ts` 中添加新方法：
```typescript
async loginWithGoogle(clientId, redirectUri) {
  // 实现 Google 登录
}
```

### Q: 如何增加上传超时时间？

A: 在 `constants.ts` 中修改：
```typescript
export const API_TIMEOUT = 30000 // 30 秒
```

或在 `oneDriveService.ts` 中：
```typescript
const response = await fetch(url, {
  method: 'PUT',
  signal: AbortSignal.timeout(60000), // 60 秒
  body: imageData
})
```

### Q: 如何调试设备方向问题？

A: 使用 Chrome DevTools 的 Sensors 面板：
1. 打开 DevTools (F12)
2. 按 Ctrl+Shift+P 搜索 "sensors"
3. 调整 Orientation

### Q: 如何优化大图片上传？

A: 使用 `imagePreprocessor`：
```typescript
// 压缩到低质量
const compressed = await imagePreprocessor.compressImage(base64, 'low')

// 然后上传
await oneDriveService.uploadImage(folderId, filename, compressed)
```

### Q: 如何处理网络离线？

A: 监听网络状态：
```typescript
window.addEventListener('online', () => {
  // 网络恢复，继续同步
  performSyncCycle()
})

window.addEventListener('offline', () => {
  // 网络断开，显示提示
  showNotification('网络已断开，改为本地保存')
})
```

### Q: 如何调试条码识别问题？

A: 启用日志和性能监控：
```typescript
logger.debug('BarcodeDebug', 'Image data', { url: imageUrl })
performanceMonitor.mark('barcode-start')

const result = await barcodeService.analyzeImage(imageUrl)

performanceMonitor.mark('barcode-end')
performanceMonitor.measure('barcode', 'barcode-start', 'barcode-end')

logger.debug('BarcodeDebug', 'Result', result)
```

---

## 调试技巧

### 启用详细日志

```typescript
// 在 App.tsx 初始化时
import { logger } from './services/logger'

logger.setErrorHandler((error) => {
  console.error('应用错误:', error)
  // 可选：发送到错误追踪服务
})

// 导出日志用于调试
const logs = logger.getLogs()
console.log(logger.exportLogs())
```

### 查看性能指标

```typescript
// 在浏览器控制台输入
import { performanceMonitor } from './services/performanceService'

console.log(performanceMonitor.generateReport())
```

### 检查本地存储

```typescript
// 在浏览器控制台
localStorage.getItem('user')
localStorage.getItem('projects')
localStorage.getItem('microsoft_access_token')
```

### 检查 IndexedDB

```javascript
// 在浏览器控制台
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('photo_app_db')
  request.onsuccess = () => resolve(request.result)
})

const tx = db.transaction('photos', 'readonly')
const photos = await new Promise((resolve, reject) => {
  const request = tx.objectStore('photos').getAll()
  request.onsuccess = () => resolve(request.result)
})

console.log(photos)
```

### 模拟慢速网络

1. 打开 Chrome DevTools
2. 切换到 Network 标签
3. 找到 Throttling 下拉菜单 (默认: "No throttling")
4. 选择 "Slow 3G" 或自定义

### 模拟不同设备

1. 打开 Chrome DevTools
2. 按 Ctrl+Shift+M 启用设备模拟
3. 在顶部选择设备型号

### 监控 API 调用

```typescript
// 在 oneDriveService.ts 中添加
const originalFetch = window.fetch
window.fetch = async (...args) => {
  console.log('API Call:', args[0])
  const start = performance.now()
  const response = await originalFetch(...args)
  const duration = performance.now() - start
  console.log(`Response (${duration.toFixed(2)}ms):`, response.status)
  return response
}
```

### 调试 Token 刷新

```typescript
// 监听 token 过期事件
window.addEventListener('token-expired', () => {
  console.log('Token 已过期，正在刷新...')
})

// 查看当前 token
console.log(localStorage.getItem('microsoft_access_token'))
console.log(localStorage.getItem('token_expiry'))

// 计算剩余时间
const expiry = parseInt(localStorage.getItem('token_expiry') || '0')
const remaining = (expiry - Date.now()) / 1000 / 60
console.log(`Token 有效期: ${remaining.toFixed(1)} 分钟`)
```

### 调试条码识别

```typescript
// 在 ReviewScreen.tsx 中
const handleDebugBarcode = async () => {
  console.time('barcode-analysis')
  try {
    const result = await barcodeService.analyzeImage(photoData)
    console.log('识别结果:', result)
    logger.debug('BarcodeDebug', '成功', result)
  } catch (error) {
    console.error('识别失败:', error)
    logger.error('BarcodeDebug', '失败', error)
  }
  console.timeEnd('barcode-analysis')
}
```

---

## 资源链接

### 官方文档
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Capacitor](https://capacitorjs.com)
- [Microsoft Graph API](https://docs.microsoft.com/graph)
- [OneDrive 开发者](https://docs.microsoft.com/onedrive)

### 相关工具
- [Vite](https://vitejs.dev)
- [ZXing](https://github.com/zxing-js/library)
- [jsQR](https://github.com/cozmo/jsQR)
- [Quagga.js](https://github.com/serratus/quaggaJS)

### 内部文档
- [完整架构文档](COMPLETE_ARCHITECTURE.md)
- [改进行动计划](IMPROVEMENT_PLAN.md)
- [原始架构图](ARCHITECTURE.md)

---

## 版本历史

| 版本 | 日期 | 更新 |
|------|------|------|
| 1.0 | 2024-01-01 | 初始版本 |
| 1.1 | 2024-01-15 | 添加快速参考 |

---

*最后更新: 2024-01-15*
