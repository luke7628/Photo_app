# Photo Suite App - 完整架构设计文档

## 目录
1. [系统概览](#系统概览)
2. [前端组件架构](#前端组件架构)
3. [服务层设计](#服务层设计)
4. [数据流和状态管理](#数据流和状态管理)
5. [类型定义和数据结构](#类型定义和数据结构)
6. [样式管理系统](#样式管理系统)
7. [认证和授权](#认证和授权)
8. [存储架构](#存储架构)
9. [性能优化](#性能优化)
10. [最佳实践](#最佳实践)
11. [已知问题和改进建议](#已知问题和改进建议)

---

## 系统概览

### 应用简介
Photo Suite App 是一款基于 Capacitor 和 React 的跨平台移动应用，用于：
- **相机拍摄**：使用设备相机进行现场拍摄
- **条码识别**：使用 ZXing 和 jsQR 识别设备序列号
- **打印机管理**：维护和同步打印机及相关信息
- **云同步**：支持 OneDrive 自动上传和同步
- **项目管理**：按项目和打印机组织文件

### 技术栈
- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS + 自定义 CSS
- **移动框架**：Capacitor
- **认证**：Microsoft OAuth 2.0
- **云存储**：OneDrive (Microsoft Graph API)
- **条码识别**：ZXing + jsQR
- **状态管理**：React Hooks + Context

### 项目结构
```
Photo_App/
├── components/           # React 组件
├── services/             # 业务逻辑和集成
├── styles/               # 全局样式
├── public/               # 静态资源
├── android/              # Android 原生代码
├── ios/                  # iOS 原生代码
├── App.tsx              # 主应用组件
├── index.tsx            # 应用入口
├── types.ts             # TypeScript 类型定义
├── constants.ts         # 应用常量
└── vite.config.ts       # Vite 配置
```

---

## 前端组件架构

### 组件树概览

```
App.tsx (主应用)
├── SplashScreen (启动画面)
├── Navigation (主导航)
│   ├── CameraScreen (相机界面) ──┐
│   ├── GalleryScreen (图库) ─────┼─► ReviewScreen (审核)
│   ├── ProjectListScreen (项目)  │
│   ├── SearchScreen (搜索) ──────┘
│   ├── DetailsScreen (详情)
│   ├── ImagePreviewScreen (预览)
│   ├── ModelSelector (型号选择)
│   ├── SettingsScreen (设置)
│   └── UserAvatar (用户头像)
```

### 各组件详细说明

#### 1. **SplashScreen** - 启动和认证界面
**职责**：
- 显示应用启动画面
- 处理 Microsoft OAuth 认证流程
- 管理认证状态

**关键功能**：
```typescript
- handleMicrosoftLogin()        // 打开 OAuth 授权窗口
- processAuthCode(code)         // 处理授权码
- exchangeCodeForToken()        // 交换 token
- fetchUserInfo()               // 获取用户信息
```

**数据流**：
```
User → Click Login → OAuth Window → 授权 → 
获取 Code → 交换 Token → 获取用户信息 → 保存到 Storage → 进入主应用
```

#### 2. **CameraScreen** - 相机拍摄界面
**职责**：
- 调用设备相机
- 捕获照片
- 预处理图像
- 传递到审核界面

**关键属性**：
```typescript
- isCameraActive: boolean          // 权限检查
- photoData: string                // Base64 图像数据
- deviceOrientation: number        // 设备方向
```

**关键功能**：
```typescript
- capturPhoto()                    // 拍摄照片
- switchCamera()                   // 前后摄像头切换
- requestCameraPermission()        // 请求权限
```

#### 3. **ReviewScreen** - 照片审核和条码识别
**职责**：
- 显示拍摄的照片
- 自动识别条码/二维码
- 用户确认或重拍
- 处理识别结果

**关键状态**：
```typescript
- photoData: string                // 当前照片 (Base64)
- recognizedSN: string             // 识别的序列号
- confidence: number               // 识别置信度
- isSingleRetake: boolean          // 是否只允许单次重拍
```

**关键函数**：
```typescript
- analyzeBarcode()                 // 调用条码识别
- handleConfirm()                  // 用户确认
- handleRetake()                   // 重新拍摄
- handleCancel()                   // 取消
```

**响应式布局**：
- 竖屏：`w-full aspect-[4/3] max-w-sm`
- 横屏：`h-[90%] aspect-[3/2] max-h-lg`
- 使用 `uiRotation` 和 `isLandscape` 控制

#### 4. **GalleryScreen** - 图库和打印机管理
**职责**：
- 显示打印机列表
- 过滤和搜索
- 管理打印机元数据
- 同步状态显示

**关键状态**：
```typescript
- printers: Printer[]              // 打印机列表
- filter: string                   // 型号过滤
- searchTerm: string               // 搜索条件
- uiRotation: number               // 设备旋转角度
```

**关键功能**：
```typescript
- filterPrinters()                 // 过滤打印机
- searchPrinters()                 // 搜索打印机
- loadPrinterPhotos()              // 加载图像
- openImagePreview()               // 打开图像详情
```

#### 5. **DetailsScreen** - 打印机详情
**职责**：
- 显示打印机完整信息
- 编辑打印机信息
- 删除记录
- 显示同步历史

**数据结构**：
```typescript
interface PrinterDetail {
  id: string
  serialNumber: string
  model: string
  location: string
  lastSyncTime: Date
  photos: Photo[]
  metadata: Record<string, any>
}
```

#### 6. **SearchScreen** - 全局搜索
**职责**：
- 跨打印机搜索
- 搜索历史记录
- 高级过滤选项

**搜索支持**：
```
- 序列号搜索
- 型号搜索
- 日期范围过滤
- 同步状态过滤
```

#### 7. **ProjectListScreen** - 项目管理
**职责**：
- 显示所有项目
- 创建/编辑项目
- 配置项目参数
- 管理项目中的打印机

**项目结构**：
```typescript
interface Project {
  id: string
  name: string
  location: string
  drivePath: string              // OneDrive 目录
  autoUpload: boolean            // 自动上传
  fileStructure: 'flat' | 'nested'
  createdAt: Date
  printers: Printer[]
}
```

#### 8. **SettingsScreen** - 应用设置
**职责**：
- 用户配置管理
- 云提供商选择
- 同步参数设置
- 应用信息和关于

**设置分类**：
```typescript
interface Settings {
  cloudProvider: 'none' | 'onedrive'
  autoSync: boolean
  syncInterval: number           // 毫秒
  fileNamingFormat: string       // {sn}_{timestamp}
  qualityLevel: 'low' | 'medium' | 'high'
  language: 'en' | 'zh'
  theme: 'light' | 'dark'
}
```

#### 9. **ImagePreviewScreen** - 图像预览
**职责**：
- 全屏显示图像
- 放大/缩小功能
- 删除或编辑
- 分享功能

#### 10. **ModelSelector** - 型号选择器
**职责**：
- 显示支持的打印机型号
- 快速过滤和搜索
- 型号详细信息显示

---

## 服务层设计

### 服务架构

```
┌─────────────────────────────────────────┐
│         Service Layer                   │
├─────────────────────────────────────────┤
├─ Auth Services                         │
│  └─ microsoftAuthService               │
├─ Cloud Services                        │
│  └─ oneDriveService                    │
├─ Recognition Services                  │
│  └─ barcodeService                     │
├─ Storage Services                      │
│  └─ storageService                     │
├─ Utility Services                      │
│  ├─ imagePreprocessor                  │
│  ├─ projectUtils                       │
│  ├─ quaggaService                      │
│  └─ modelMemoryService                 │
└─────────────────────────────────────────┘
```

### 1. microsoftAuthService
**职责**：管理微软账户认证和授权

**关键属性**：
```typescript
- accessToken: string | null
- idToken: string | null
- refreshToken: string | null
- expiryTime: number
- scopes: string[]
```

**关键方法**：
```typescript
getLoginUrl(clientId, redirectUri): string
  → 返回登录 URL，用于打开 OAuth 窗口

exchangeCode(code, clientId, redirectUri): Promise<TokenResponse>
  → 使用授权码交换访问令牌
  → 请求头：Content-Type: application/x-www-form-urlencoded
  → 请求体：{grant_type, code, client_id, redirect_uri}

refreshAccessToken(): Promise<TokenResponse>
  → 使用刷新令牌获取新访问令牌
  → 自动更新本地存储

isAccessTokenExpired(): boolean
  → 检查令牌是否过期

getUserInfo(): Promise<MicrosoftUser>
  → 从 Microsoft Graph 获取用户信息
  → 端点：GET /me

logout(): void
  → 清除所有令牌和用户信息
```

**错误处理**：
```typescript
- 401 Unauthorized → 自动刷新令牌
- 403 Forbidden → 提示权限不足
- 网络错误 → 重试机制
```

### 2. oneDriveService
**职责**：管理 OneDrive 文件操作

**关键方法**：
```typescript
getRootInfo(): Promise<DriveInfo>
  → 获取驱动器根目录信息

findFolder(parentId, folderName): Promise<string | null>
  → 在指定父目录中查找文件夹
  → 返回文件夹 ID 或 null

ensureFolder(parentId, folderName): Promise<string>
  → 确保文件夹存在，不存在则创建
  → 返回文件夹 ID

uploadImage(
  parentFolderId: string,
  filename: string,
  imageData: Blob
): Promise<UploadResult>
  → 上传图像文件
  → 使用 PUT /me/drive/items/{parentId}:/{filename}:/content
  → 返回 {webUrl, id, name}

deleteItem(itemId: string): Promise<void>
  → 删除文件或文件夹

createFolder(parentId, folderName): Promise<string>
  → 创建新文件夹
```

**文件夹结构管理**：
```typescript
// 自动创建层级结构：
// /Dematic/FieldPhotos/{ProjectName}/{SerialNumber}/

const folderPath = [
  'Dematic',
  'FieldPhotos',
  projectName,
  serialNumber
];

for (const folderName of folderPath) {
  parentId = await ensureFolder(parentId, folderName);
}
```

### 3. barcodeService
**职责**：条码和二维码识别

**关键方法**：
```typescript
readBarcode(imageUrl: string): Promise<BarcodeResult>
  → 使用 ZXing 识别 1D 条码
  → 返回 {text, format, confidence}

readQRCode(imageUrl: string): Promise<QRCodeResult>
  → 使用 jsQR 识别二维码
  → 返回 {text, location, confidence}

analyzeImage(imageUrl: string): Promise<RecognitionResult>
  → 综合分析条码和二维码
  → 尝试两种方法
  → 返回最高置信度的结果

resetReader(): void
  → 重置读取器状态
```

**识别结果结构**：
```typescript
interface RecognitionResult {
  format: 'barcode' | 'qrcode' | 'unknown'
  data: string
  confidence: number          // 0-100
  location?: {
    x: number
    y: number
    width: number
    height: number
  }
  timestamps: number          // 识别耗时（毫秒）
}
```

### 4. storageService
**职责**：管理本地和云存储

**存储策略**：
```typescript
// LocalStorage: 配置和令牌 (< 5MB)
- user: MicrosoftUser
- microsoft_access_token: string
- microsoft_refresh_token: string
- projects: Project[]
- printers: Printer[]
- settings: Settings

// IndexedDB: 图像数据 (> 50MB)
- printers (store)
  ├─ photos: Photo[]
  │  ├─ url: string (Base64)
  │  ├─ filename: string
  │  ├─ timestamp: number
  │  └─ isSynced: boolean
```

**关键方法**：
```typescript
// LocalStorage
getItem(key: string): any
setItem(key: string, value: any): void
removeItem(key: string): void
clear(): void

// IndexedDB
async getPhotos(printerId: string): Promise<Photo[]>
async savePhoto(printerId: string, photo: Photo): Promise<void>
async deletePhoto(photoeId: string): Promise<void>
async markSynced(photoId: string): Promise<void>
async getSyncedCount(): Promise<number>
async getAllUnsyncedPhotos(): Promise<Photo[]>
```

### 5. imagePreprocessor
**职责**：图像优化和预处理

**关键功能**：
```typescript
compressImage(
  base64: string,
  quality: 'low' | 'medium' | 'high'
): Promise<string>
  → 压缩图像大小
  → 返回压缩后的 Base64

normalizeImage(base64: string): Promise<string>
  → 标准化图像方向和大小

getImageMetadata(base64: string): ImageMetadata
  → 获取图像尺寸、颜色等信息

applyFilter(base64: string, filter: string): Promise<string>
  → 应用图像滤镜（可选）
```

**压缩策略**：
```
低 (low):    质量 60%, 宽度 ≤ 480px   → ~50KB
中 (medium): 质量 75%, 宽度 ≤ 800px   → ~150KB
高 (high):   质量 90%, 宽度 ≤ 1200px  → ~400KB
```

### 6. projectUtils
**职责**：项目相关工具函数

**关键功能**：
```typescript
createProject(data: ProjectInput): Project
  → 创建新项目

updateProject(id: string, data: Partial<ProjectInput>): Project
  → 更新项目信息

deleteProject(id: string): void
  → 删除项目

getProjectDrivePath(
  projectName: string,
  useSerialNumber: boolean
): string
  → 生成项目的 OneDrive 路径

formatFilename(
  format: string,
  metadata: Record<string, any>
): string
  → 格式化文件名
  → 支持变量：{sn}, {timestamp}, {date}, {model}
```

---

## 数据流和状态管理

### 应用状态结构 (App.tsx)

```typescript
interface AppState {
  // 用户认证
  user: MicrosoftUser | null
  isAuthenticated: boolean
  isLoading: boolean

  // 云同步
  cloudProvider: 'none' | 'onedrive'
  syncing: boolean
  lastSyncTime: number | null
  syncedCount: number
  unsyncedCount: number

  // 打印机数据
  printers: Printer[]
  selectedPrinter: Printer | null
  selectedPhoto: Photo | null

  // 项目数据
  projects: Project[]
  selectedProject: Project | null

  // 设置
  settings: Settings
  uiRotation: number              // 设备方向
}
```

### 主数据流

#### 流程 1: 用户认证流

```
SplashScreen (认证)
    ↓
App.tsx handleMicrosoftLogin()
    ↓
microsoftAuthService.getLoginUrl()
    ↓
Open OAuth Authorization Window
    ↓
User Authorizes
    ↓
Redirect to Callback
    ↓
Exchange Authorization Code for Token
    ↓
Get User Info (Microsoft Graph)
    ↓
Save Tokens (LocalStorage + Memory)
    ↓
Load Projects & Printers
    ↓
Navigate to Main App
```

#### 流程 2: 照片拍摄和同步流

```
CameraScreen
    ↓ (User captures photo)
    ↓
ReviewScreen (Show photo)
    ↓ (Barcode recognition)
    ↓
analyzeWithBarcode() → barcodeService.analyzeImage()
    ↓
Show recognition result
    ↓ (User confirms)
    ↓
processConfirmation()
    ├─ Save to IndexedDB
    ├─ Update printer metadata
    └─ Mark isSynced = false
    ↓
App.tsx performSyncCycle() [5s interval]
    ↓ (Check cloudProvider)
    ├─ cloudProvider = 'none' → Skip
    └─ cloudProvider = 'onedrive'
        ↓
    Get unsync photos
        ↓
    For each photo:
      ├─ ensureFolder() → Create folder structure
      ├─ uploadImage() → Upload to OneDrive
      ├─ Mark isSynced = true
      └─ Update UI (syncedCount++)
    ↓
Update last sync time
    ↓
Show success notification
```

#### 流程 3: 项目和打印机管理流

```
ProjectListScreen
    ↓ (Create/Edit Project)
    ↓
projectUtils.createProject() / updateProject()
    ↓
Save to LocalStorage
    ↓
Update App.tsx state
    ↓
GalleryScreen
    ↓ (Filter/Search printers)
    ↓
Load pictures from IndexedDB
    ↓
Display in gallery
```

### 状态优化

**性能优化**：
1. **记忆化计算**：
```typescript
const filteredPrinters = useMemo(() => {
  return printers.filter(/* conditions */)
}, [printers, filter, searchTerm])
```

2. **防抖搜索**：
```typescript
const debouncedSearch = useCallback(
  debounce((term) => setSearchTerm(term), 300),
  []
)
```

3. **分页加载**：
```typescript
const [page, setPage] = useState(1)
const pageSize = 20
const paginatedPrinters = useMemo(() => {
  return filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  )
}, [filtered, page])
```

---

## 类型定义和数据结构

### types.ts 完整定义

```typescript
// 用户相关
interface MicrosoftUser {
  id: string
  userPrincipalName: string
  displayName: string
  mail: string
  mobilePhone?: string
  officeLocation?: string
  jobTitle?: string
}

// 认证响应
interface TokenResponse {
  access_token: string
  refresh_token: string
  id_token: string
  expires_in: number
  token_type: 'Bearer'
  scope: string
}

// 打印机相关
interface Printer {
  id: string
  serialNumber: string
  model: string
  location?: string
  lastSeen?: Date
  metadata?: Record<string, any>
  photos: Photo[]
}

interface Photo {
  id: string
  filename: string
  url: string                      // Base64 or URL
  timestamp: number
  sizeBytes?: number
  isSynced?: boolean
  syncedAt?: Date
  metadata?: {
    width?: number
    height?: number
    confidence?: number
    recognizedSN?: string
  }
}

// 项目相关
interface Project {
  id: string
  name: string
  location?: string
  description?: string
  drivePath?: string
  autoUpload: boolean
  fileStructure: 'flat' | 'nested'  // flat: 单层, nested: 多层
  createdAt: Date
  updatedAt: Date
  printers: Printer[]
}

// 设置
interface Settings {
  cloudProvider: 'none' | 'onedrive'
  autoSync: boolean
  syncInterval: number
  fileNamingFormat: string         // {sn}_{timestamp}.jpg
  qualityLevel: 'low' | 'medium' | 'high'
  keepLocalCopy: boolean
  language: 'en' | 'zh'
  theme: 'light' | 'dark'
  autoRetakeOnBadQuality: boolean
  maxRetriesBeforeManual: number
}

// 条码识别结果
interface BarcodeResult {
  format: 'UPC' | 'CODE128' | 'QR_CODE' | 'unknown'
  data: string
  confidence: number               // 0-100
  timestamp: number
  location?: BarcodeLocation
}

interface BarcodeLocation {
  x: number
  y: number
  width: number
  height: number
}

// OneDrive 相关
interface DriveInfo {
  id: string
  name: string
  quota: {
    total: number
    used: number
    remaining: number
  }
}

interface UploadResult {
  id: string
  name: string
  webUrl: string
  createdDateTime: string
  size: number
}

// API 错误
interface ApiError extends Error {
  code: string
  status: number
  message: string
  details?: Record<string, any>
}
```

---

## 样式管理系统

### 当前样式架构

**文件位置和职责**：

1. **theme.css** - 全局主题和主要样式
   - CSS 变量定义
   - 全局动画 (@keyframes)
   - 主题色值

2. **Tailwind CSS** - 组件级样式
   - 实用优先 (Utility-first)
   - 响应式设计
   - 动态类名

3. **内联样式** - 动态/计算样式
   - 旋转和变换
   - 条件样式
   - 性能关键路径

### 问题分析和改进方案

#### 问题 1: 样式定义不一致

**现状**：
- GalleryScreen: `<style>@keyframes slideUp</style>`
- ReviewScreen: `style={{animation: '...'}}`
- SplashScreen: `className="..."`

**改进方案**：
```typescript
// styles/animations.css (新建)
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes rotateIn {
  from { transform: rotate(-10deg); opacity: 0; }
  to { transform: rotate(0); opacity: 1; }
}

// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      },
      animation: {
        slideUp: 'slideUp 0.3s ease-out',
        fadeIn: 'fadeIn 0.5s ease-in-out'
      }
    }
  }
}

// 在组件中使用
<div className="animate-slideUp">Content</div>
```

#### 问题 2: 响应式设计断点不统一

**改进方案**：
```typescript
// constants.ts (新增)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const

// 自定义 Hook
export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  })

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    isSmall: windowSize.width < BREAKPOINTS.md,
    isMedium: windowSize.width >= BREAKPOINTS.md && windowSize.width < BREAKPOINTS.lg,
    isLarge: windowSize.width >= BREAKPOINTS.lg,
    width: windowSize.width,
    height: windowSize.height,
  }
}
```

#### 问题 3: 旋转样式的集中管理

**改进方案**：
```typescript
// services/styleService.ts (新建)
export interface RotationStyle {
  transform: string
  transitionDuration?: string
}

export function getRotationStyle(
  rotation: number,
  scale: number = 1
): RotationStyle {
  return {
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transitionDuration: '500ms'
  }
}

export function getOrientationClasses(rotation: number): string {
  const isLandscape = rotation !== 0
  return isLandscape
    ? 'landscape-mode'
    : 'portrait-mode'
}

// 在组件中使用
const rotationStyle = getRotationStyle(uiRotation, isLandscape ? 0.8 : 1)
```

### 样式最佳实践

#### 1. 使用 Tailwind CSS 优先
```typescript
// ✅ 好
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg">
  Click me
</button>

// ❌ 避免
<button style={{
  padding: '8px 16px',
  backgroundColor: '#3b82f6',
  borderRadius: '8px'
}}>
  Click me
</button>
```

#### 2. 动态样式使用 useMemo
```typescript
// ✅ 好
const dynamicStyle = useMemo(() => ({
  transform: `rotate(${angle}deg)`,
  filter: `brightness(${brightness}%)`
}), [angle, brightness])

// ❌ 避免
<div style={{
  transform: `rotate(${angle}deg)`,
  filter: `brightness(${brightness}%)`
}} />
```

#### 3. 关键动画使用 CSS
```typescript
// ✅ 好：使用 CSS animation
<div className="animate-fadeIn">Content</div>

// ⚠️ 避免：使用 JS 动画
useEffect(() => {
  element.style.opacity = fadeInValue
})
```

#### 4. 响应式设计使用 Tailwind 断点
```typescript
// ✅ 好
<div className="text-sm md:text-base lg:text-lg">
  Content
</div>

// ❌ 避免
<div style={{
  fontSize: isLarge ? '18px' : '14px'
}}>
  Content
</div>
```

#### 5. 主题支持
```typescript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sage: '#B8C5A7',
        cream: '#F5F5F0',
      }
    }
  }
}

// 在组件中
<div className="dark:bg-slate-900 dark:text-white bg-white text-black">
  Content
</div>
```

---

## 认证和授权

### OAuth 2.0 授权码流程

#### 流程图
```
用户             应用                Microsoft Login        应用后端
 │              │                      │                      │
 ├─点击登录────► │                      │                      │
 │              ├─打开登录窗口───────► │                      │
 │              │                      │                      │
 │◄─────────────┤ ◄─登录页面────────── │                      │
 │              │                      │                      │
 └─输入账密───► │                      │                      │
               └─提交───────────────► │                      │
                                     └─授权代码──────────► │
                                                           │
                                                    ◄─保存到localStorage─┘
                                                           │
                                                   (后台交换)
                                                           │
                                   ◄─使用Code请求Token──┐
                                                        │
                                       返回Token────────┘
```

#### Token 更新策略

```typescript
// 主动刷新：在 Token 过期前 5 分钟刷新
export function setupTokenRefresh() {
  const expiryTime = parseInt(localStorage.getItem('token_expiry') || '0')
  const now = Date.now()
  const timeUntilExpiry = (expiryTime - now) / 1000 // 秒

  if (timeUntilExpiry < 300) {  // 5 分钟
    refreshAccessToken()
  }
}

// 被动刷新：API 返回 401 时重试
export async function apiCall(url: string, options: RequestInit) {
  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers
    },
    ...options
  })

  if (response.status === 401) {
    // Token 过期，刷新并重试
    await refreshAccessToken()
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${newAccessToken}`,
        ...options.headers
      },
      ...options
    })
  }

  return response
}
```

---

## 存储架构

### LocalStorage 结构

```typescript
{
  // 用户信息
  'user': {
    id: 'user-123',
    displayName: 'John Doe',
    mail: 'john@example.com'
  },

  // 认证令牌
  'microsoft_access_token': 'eyJhbGc...',
  'microsoft_refresh_token': 'eyJhbGc...',
  'token_expiry': '1234567890',

  // 项目和打印机
  'projects': [
    {
      id: 'proj-1',
      name: 'Project Alpha',
      printers: [...]
    }
  ],
  'printers': [
    {
      id: 'printer-1',
      serialNumber: '99J2037011108',
      model: 'ZT411',
      photos: []
    }
  ],

  // 设置
  'settings': {
    cloudProvider: 'onedrive',
    autoSync: true,
    syncInterval: 5000
  },

  // UI 状态
  'lastScreen': 'gallery',
  'uiPreferences': { ... }
}
```

### IndexedDB 结构

```typescript
// Database: photo_app_db (v1)
// Object Stores:

// Store: printers
{
  keyPath: 'id',
  indexes: [
    { name: 'serialNumber', keyPath: 'serialNumber', unique: false },
    { name: 'model', keyPath: 'model', unique: false }
  ]
}

// Store: photos
{
  keyPath: 'id',
  indexes: [
    { name: 'printerId', keyPath: 'printerId', unique: false },
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'isSynced', keyPath: 'isSynced', unique: false }
  ]
}

// 数据示例：
// photos store
{
  id: 'photo-1',
  printerId: 'printer-1',
  filename: '99J2037011108_1699564800.jpg',
  url: 'data:image/jpeg;base64,...',
  timestamp: 1699564800,
  sizeBytes: 245632,
  isSynced: false,
  metadata: {
    width: 1920,
    height: 1440,
    confidence: 95
  }
}
```

### 存储容量设计

| 存储类型 | 限制 | 使用情况 |
|---------|------|---------|
| LocalStorage | ~5-10 MB | 配置、令牌、元数据 |
| IndexedDB | ~50-500 MB | 高分辨率图像 (Base64) |
| 云存储 (OneDrive) | 无限 | 备份和共享 |

**存储优化**：
```typescript
// 低质量图像本地存储 (预览)
const thumbnail = await compressImage(base64, 'low')
await saveToIndexedDB(thumbnail)

// 高质量图像上传到云
const fullImage = await compressImage(base64, 'high')
await uploadToOneDrive(fullImage)

// 本地空间不足时清理
if (getLocalStorageUsage() > 0.8 * MAX_LOCAL) {
  await clearSyncedPhotos()
  await clearOldThumbnails()
}
```

---

## 性能优化

### 1. 图像优化

```typescript
// 多质量层级
const QUALITY_LEVELS = {
  thumbnail: { quality: 30, maxWidth: 200 },
  preview: { quality: 60, maxWidth: 600 },
  standard: { quality: 80, maxWidth: 1200 },
  original: { quality: 95, maxWidth: undefined }
}

// 根据网络状况自动选择
export function getOptimalQuality(networkType: string) {
  switch(networkType) {
    case '4g':
    case 'wifi': return 'standard'
    case '3g':
    case 'slow-4g': return 'preview'
    case 'slow-2g':
    case '2g': return 'thumbnail'
    default: return 'standard'
  }
}
```

### 2. 网络优化

```typescript
// 批量上传
export async function batchUploadPhotos(
  photos: Photo[],
  batchSize: number = 5
) {
  for (let i = 0; i < photos.length; i += batchSize) {
    const batch = photos.slice(i, i + batchSize)
    await Promise.all(
      batch.map(p => uploadImage(p))
    )
    // 批次间延迟，避免服务器过载
    if (i + batchSize < photos.length) {
      await delay(1000)
    }
  }
}

// 智能重试
export async function uploadWithRetry(
  photo: Photo,
  maxRetries: number = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadImage(photo)
    } catch (error: ApiError) {
      if (attempt === maxRetries) throw error

      // 指数退避
      const delay = Math.pow(2, attempt - 1) * 1000
      await sleep(delay)
    }
  }
}
```

### 3. 组件优化

```typescript
// 使用 React.memo 避免不必要 re-render
const PrinterListItem = React.memo(
  ({ printer, onSelect }: Props) => (
    <div onClick={() => onSelect(printer)}>
      {printer.name}
    </div>
  ),
  (prevProps, nextProps) =>
    prevProps.printer.id === nextProps.printer.id
)

// 使用 useMemo 缓存计算
const memoizedPrinters = useMemo(
  () => printers.filter(p => p.model === selectedModel),
  [printers, selectedModel]
)

// 使用 useCallback 缓存函数
const handleUpload = useCallback(
  async (photo: Photo) => {
    await uploadService.upload(photo)
  },
  [uploadService]
)
```

### 4. 虚拟滚动

```typescript
import { FixedSizeList } from 'react-window'

export function GalleryList({ printers }: Props) {
  const Row = ({ index, style }: any) => (
    <div style={style}>
      <PrinterCard printer={printers[index]} />
    </div>
  )

  return (
    <FixedSizeList
      height={600}
      itemCount={printers.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

### 5. Lazy Loading

```typescript
const ReviewScreen = lazy(() => import('./ReviewScreen'))
const ImagePreview = lazy(() => import('./ImagePreview'))

export function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ReviewScreen />
    </Suspense>
  )
}
```

---

## 最佳实践

### 1. 错误处理

```typescript
// 统一 API 错误处理
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}

// 在服务中使用
export async function uploadImage(photo: Photo) {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: photoData
    })

    if (!response.ok) {
      if (response.status === 401) {
        await refreshAccessToken()
        // 重试
      }
      if (response.status === 403) {
        throw new ApiError(403, 'PERMISSION_DENIED', '没有权限')
      }
      throw new ApiError(
        response.status,
        'UPLOAD_FAILED',
        `上传失败: ${response.statusText}`
      )
    }

    return await response.json()
  } catch (error) {
    console.error('[Upload Error]', error)
    throw error
  }
}

// 在组件中处理
const handleUpload = async (photo: Photo) => {
  try {
    await uploadService.upload(photo)
    showNotification('上传成功')
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        navigateToLogin()
      } else {
        showError(error.message)
      }
    }
  }
}
```

### 2. 日志记录

```typescript
// 统一日志服务
export const logger = {
  info: (scope: string, message: string, data?: any) =>
    console.log(`[${scope}]`, message, data),

  warn: (scope: string, message: string, data?: any) =>
    console.warn(`[${scope}]`, message, data),

  error: (scope: string, message: string, error?: Error) =>
    console.error(`[${scope}]`, message, error),

  debug: (scope: string, message: string, data?: any) =>
    process.env.NODE_ENV === 'development' &&
    console.debug(`[${scope}]`, message, data)
}

// 使用
logger.info('PhotoUpload', '开始上传', { photoId: '123' })
logger.error('OneDrive', '获取文件夹失败', error)
```

### 3. 环境配置

```typescript
// constants.ts
export const CONFIG = {
  development: {
    MICROSOFT_CLIENT_ID: 'dev-client-id',
    REDIRECT_URI: 'http://localhost:5173/auth-callback.html',
    API_TIMEOUT: 30000,
    ENABLE_DEBUG: true
  },
  production: {
    MICROSOFT_CLIENT_ID: 'prod-client-id',
    REDIRECT_URI: 'https://app.example.com/auth-callback.html',
    API_TIMEOUT: 30000,
    ENABLE_DEBUG: false
  }
}

export const CURRENT_CONFIG = CONFIG[process.env.NODE_ENV || 'development']
```

### 4. 代码组织

```typescript
// 按功能组织代码
components/
├── auth/
│   ├── LoginButton.tsx
│   └── LoginModal.tsx
├── gallery/
│   ├── GalleryScreen.tsx
│   ├── PrinterCard.tsx
│   └── FilterBar.tsx
├── camera/
│   ├── CameraScreen.tsx
│   └── ReviewScreen.tsx
├── common/
│   ├── Header.tsx
│   ├── Button.tsx
│   └── LoadingSpinner.tsx

services/
├── auth/
│   └── microsoftAuthService.ts
├── storage/
│   ├── oneDriveService.ts
│   └── storageService.ts
├── recognition/
│   └── barcodeService.ts
└── utils/
    └── imageProcessor.ts
```

### 5. 约定俗成

**命名约定**：
```typescript
// 组件名：PascalCase
const CameraScreen = () => { }
const PrinterCard = () => { }

// 函数名：camelCase
const handlePhotoCapture = () => { }
const processImage = () => { }

// 常量名：UPPER_SNAKE_CASE
const MAX_PHOTO_SIZE = 5 * 1024 * 1024
const DEFAULT_QUALITY = 'high'

// 类型名：PascalCase
interface Printer { }
type PhotoFormat = 'jpeg' | 'png'

// 私有函数：下划线前缀（可选）
const _formatFileName = () => { }
```

**导入导出约定**：
```typescript
// ✅ 具体导入
import { uploadImage, deleteImage } from './services/oneDrive'

// ❌ 通配符导入（仅在必要时使用）
import * as oneDriveService from './services/oneDrive'

// ✅ 一个默认导出
export default CameraScreen

// ✅ 命名导出（多个相关项）
export { Printer, Photo, uploadImage }
```

---

## 已知问题和改进建议

### 1. 样式定义不统一 ⚠️ 高优先级

**问题**：
- 不同组件使用不同方式定义样式 (CSS、inline、className)
- 缺乏全局样式规范
- 动画定义散乱

**改进方案**：参见 [样式管理系统](#样式管理系统)

**实施步骤**：
1. 创建统一的 animations.css
2. 更新 tailwind.config.js 添加所有动画定义
3. 迁移所有组件使用 Tailwind 类名
4. 创建 styleService.ts 管理动态样式

**预期收益**：
- 样式一致性提高 ✅
- 维护复杂性降低 ✅
- 加载时间减少 ✅

---

### 2. 设备方向处理冗余 ⚠️ 中优先级

**问题**：
- `uiRotation` 和 `isLandscape` 在多个组件中重复定义
- 计算逻辑不一致

**改进方案**：
```typescript
// hooks/useDeviceOrientation.ts
export function useDeviceOrientation() {
  const [rotation, setRotation] = useState(0)
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const { gamma } = e
      if (gamma === null) return

      const newRotation = Math.abs(gamma) > 40
        ? (gamma > 0 ? -90 : 90)
        : 0

      setRotation(newRotation)
      setIsLandscape(newRotation !== 0)
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [])

  return { rotation, isLandscape }
}

// 在组件中使用
const { rotation, isLandscape } = useDeviceOrientation()
```

---

### 3. 错误处理不完整 ⚠️ 中优先级

**问题**：
- 网络错误没有重试机制
- 用户不知道同步失败的原因
- Token 过期提示不清晰

**改进方案**：参见 [最佳实践](#最佳实践) 中的错误处理部分

---

### 4. 性能指标缺失 ⚠️ 中优先级

**问题**：
- 没有性能监控
- 无法定位瓶颈
- 用户体验无法量化

**改进方案**：
```typescript
// services/performanceService.ts
export const performanceMonitor = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(name)
    }
  },

  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark)
        const measure = performance.getEntriesByName(name)[0]
        if (measure) {
          logger.info('Performance', `${name}: ${measure.duration.toFixed(2)}ms`)
        }
      } catch (e) {
        logger.warn('Performance', `无法测量 ${name}`)
      }
    }
  }
}

// 在关键路径上使用
performanceMonitor.mark('photo-upload-start')
await uploadService.upload(photo)
performanceMonitor.mark('photo-upload-end')
performanceMonitor.measure('photo-upload', 'photo-upload-start', 'photo-upload-end')
```

---

### 5. 离线模式不完整 ⚠️ 低优先级

**问题**：
- 网络离线时无法继续工作
- 无同步队列机制

**改进方案**：
```typescript
// services/syncQueueService.ts
export class SyncQueue {
  private queue: QueueItem[] = []

  async addToQueue(photo: Photo, priority: 'high' | 'normal' = 'normal') {
    this.queue.push({ photo, priority, attempt: 0, status: 'pending' })
    localStorage.setItem('sync_queue', JSON.stringify(this.queue))
  }

  async processPendingQueue() {
    const offlineItems = this.queue.filter(item => item.status === 'pending')
    for (const item of offlineItems) {
      try {
        await uploadPhoto(item.photo)
        item.status = 'completed'
      } catch (error) {
        item.attempt++
        if (item.attempt >= MAX_RETRIES) {
          item.status = 'failed'
          // 通知用户
        }
      }
    }
    localStorage.setItem('sync_queue', JSON.stringify(this.queue))
  }
}
```

---

### 6. 类型安全改进 ⚠️ 低优先级

**问题**：
- 某些 API 响应缺少类型定义
- any 类型过多

**改进方案**：
```typescript
// 添加完整的 API 响应类型
interface GraphAPIResponse<T> {
  value: T[]
  '@odata.nextLink'?: string
}

interface MicrosoftGraphFile {
  id: string
  name: string
  size: number
  createdDateTime: string
  lastModifiedDateTime: string
  parentReference: {
    id: string
    path: string
  }
}

// 在服务中使用
async function listFiles(folderId: string): Promise<GraphAPIResponse<MicrosoftGraphFile>> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return response.json()
}
```

---

## 总结

本文档提供了 Photo Suite App 的完整架构设计，包括：

✅ **系统概览**：应用功能和技术栈
✅ **组件架构**：10 个主要 UI 组件的设计和职责
✅ **服务层**：6 个核心服务的接口和实现
✅ **数据流**：3 个主要业务流程的完整流程图
✅ **类型系统**：完整的 TypeScript 类型定义
✅ **样式管理**：统一的样式和主题管理方案
✅ **认证系统**：OAuth 2.0 流程和 Token 管理
✅ **存储架构**：LocalStorage 和 IndexedDB 的使用策略
✅ **性能优化**：5 个关键优化技术
✅ **最佳实践**：代码组织和命名约定
✅ **改进建议**：6 个已知问题和解决方案

### 快速参考

| 面向 | 主要内容 |
|-----|---------|
| **前端开发** | [前端组件架构](#前端组件架构)、[样式管理系统](#样式管理系统) |
| **后端集成** | [服务层设计](#服务层设计)、[认证和授权](#认证和授权) |
| **数据模型** | [类型定义和数据结构](#类型定义和数据结构)、[存储架构](#存储架构) |
| **优化** | [性能优化](#性能优化)、[最佳实践](#最佳实践) |
| **维护** | [已知问题和改进建议](#已知问题和改进建议) |
