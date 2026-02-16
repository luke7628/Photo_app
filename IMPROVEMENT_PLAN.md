# Photo Suite App - 改进行动计划

## 优先级排序

### 🔴 高优先级 (立即实施)

1. **样式定义统一** - 1-2 天
   - 消除样式散乱问题
   - 提高代码可维护性
   - 改善组件复用

2. **错误处理完善** - 1 天
   - 用户体验改进
   - 同步可靠性提高

### 🟡 中优先级 (本周内)

3. **设备方向处理优化** - 0.5 天
   - 减少代码重复
   - 提高一致性

4. **性能指标添加** - 1 天
   - 数据驱动优化
   - 找出瓶颈

### 🟢 低优先级 (后续迭代)

5. **离线模式支持** - 2 天
   - 离线可用性
   - 同步队列管理

6. **类型安全改进** - 1 天
   - 减少运行时错误
   - 更好的 IDE 支持

---

## 行动计划详解

### 任务 1: 样式定义统一 (高优先级)

#### 1.1 创建全局动画库

**文件**: `src/styles/animations.css`

```css
/* 淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 向上滑入 */
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

/* 缩放回弹 */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 旋转进入 */
@keyframes rotateIn {
  from {
    opacity: 0;
    transform: rotate(-10deg);
  }
  to {
    opacity: 1;
    transform: rotate(0deg);
  }
}

/* 脉冲效果 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 加载旋转 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

#### 1.2 更新 Tailwind 配置

**文件**: `tailwind.config.js`

```javascript
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: '#B8C5A7',
        cream: '#F5F5F0',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        rotateIn: {
          '0%': { opacity: '0', transform: 'rotate(-10deg)' },
          '100%': { opacity: '1', transform: 'rotate(0deg)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideUp: 'slideUp 0.4s ease-out',
        scaleIn: 'scaleIn 0.3s ease-in-out',
        rotateIn: 'rotateIn 0.4s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        spin: 'spin 1s linear infinite'
      }
    }
  },
  plugins: [],
}
```

#### 1.3 创建样式工具服务

**文件**: `src/services/styleService.ts`

```typescript
export interface DynamicStyle extends React.CSSProperties {}

/**
 * 生成旋转变换样式
 * @param rotation 旋转角度 (度)
 * @param scale 缩放因子 (可选)
 */
export function getRotationStyle(
  rotation: number,
  scale: number = 1
): DynamicStyle {
  return {
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
  }
}

/**
 * 获取方向相关的 CSS 类名
 */
export function getOrientationClasses(isLandscape: boolean): string {
  const baseClasses = 'transition-all duration-500'
  if (isLandscape) {
    return `${baseClasses} landscape-mode`
  }
  return `${baseClasses} portrait-mode`
}

/**
 * 生成响应式大小样式
 */
export function getResponsiveSize(
  isLandscape: boolean,
  portraitSize: string,
  landscapeSize: string
): string {
  return isLandscape ? landscapeSize : portraitSize
}

/**
 * 生成渐变背景
 */
export function getGradientStyle(
  colors: [string, string],
  angle: number = 135
): DynamicStyle {
  return {
    background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]})`,
  }
}
```

#### 1.4 更新现有组件

**示例**: 更新 `ReviewScreen.tsx`

```typescript
import { getRotationStyle } from '../services/styleService'

export function ReviewScreen() {
  const [uiRotation, setUiRotation] = useState(0)
  const isLandscape = uiRotation !== 0

  // ✅ 使用统一的样式生成函数
  const rotationStyle = useMemo(
    () => getRotationStyle(uiRotation, isLandscape ? 0.8 : 1),
    [uiRotation, isLandscape]
  )

  return (
    <div className="flex flex-col h-screen">
      {/* 头部 */}
      <header className={`pt-4 px-4 bg-white rounded-b-3xl shadow-sm shrink-0 
        transition-all duration-500 ${isLandscape ? 'pb-1.5' : 'pb-2'}`}>
        {/* 内容 */}
      </header>

      {/* 图像预览区 */}
      <div className={`relative bg-black overflow-hidden shadow-2xl 
        border-2 border-white transition-all duration-700 ease-out
        ${isLandscape 
          ? 'h-[90%] aspect-[3/2] max-h-lg' 
          : 'w-full aspect-[4/3] max-w-sm'}`}>
        {/* 图像容器 */}
        <img
          src={photoData}
          alt="Review"
          style={rotationStyle}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 底部控制 */}
      <footer className={`bg-white rounded-t-3xl shadow-[0_-15_50px_rgba(0,0,0,0.06)]
        shrink-0 z-20 transition-all duration-500
        ${isLandscape ? 'pt-2 px-12' : 'pt-3 px-5'}`}>
        <div className={`flex gap-4 ${isLandscape ? 'justify-center' : ''}`}>
          {/* 底部按钮 */}
        </div>
      </footer>
    </div>
  )
}
```

#### 1.5 更新 GalleryScreen.tsx

```typescript
// ❌ 移除内联 <style> 标签，改用 className
// 之前的代码：
// <style>{`@keyframes slideUp { ... }`}</style>

// ✅ 使用 Tailwind 动画类
<div className="animate-slideUp">
  {/* 内容 */}
</div>
```

---

### 任务 2: 设备方向处理优化 (中优先级)

#### 2.1 创建自定义 Hook

**文件**: `src/hooks/useDeviceOrientation.ts`

```typescript
import { useState, useEffect } from 'react'

export interface DeviceOrientationInfo {
  rotation: number
  isLandscape: boolean
}

/**
 * 监听设备方向变化
 * @returns {DeviceOrientationInfo} 当前设备方向信息
 */
export function useDeviceOrientation(): DeviceOrientationInfo {
  const [rotation, setRotation] = useState<number>(0)
  const [isLandscape, setIsLandscape] = useState<boolean>(false)

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { gamma } = event
      if (gamma === null) return

      // 如果倾斜角度 > 40 度，视为横屏
      const newRotation = Math.abs(gamma) > 40
        ? (gamma > 0 ? -90 : 90)
        : 0

      setRotation(newRotation)
      setIsLandscape(newRotation !== 0)
    }

    window.addEventListener('deviceorientation', handleOrientation)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  return { rotation, isLandscape }
}

/**
 * 监听窗口 resize 事件
 * 用于网页预览和响应式设计
 */
export function useWindowOrientation() {
  const [isLandscape, setIsLandscape] = useState<boolean>(
    window.innerWidth > window.innerHeight
  )

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return { isLandscape }
}
```

#### 2.2 更新现有组件使用 Hook

**示例**: 更新 `GalleryScreen.tsx`

```typescript
import { useDeviceOrientation } from '../hooks/useDeviceOrientation'

export function GalleryScreen() {
  // ✅ 使用统一的 Hook
  const { rotation, isLandscape } = useDeviceOrientation()

  const filteredPrinters = useMemo(() => {
    // ... 过滤逻辑
  }, [printers, filter, searchTerm])

  return (
    <div className="w-full h-full flex flex-col">
      {/* 列表项 */}
      {filteredPrinters.map((printer) => (
        <div
          key={printer.id}
          className={`w-full text-left group flex items-center 
            bg-white rounded-2xl border border-gray-200 shadow-sm
            hover:shadow-md transition-all
            ${isLandscape ? 'p-2 gap-3' : 'p-3 gap-3.5'}`}
        >
          {/* 内容 */}
        </div>
      ))}
    </div>
  )
}
```

---

### 任务 3: 错误处理完善 (高优先级)

#### 3.1 创建错误处理类和工具

**文件**: `src/services/errorHandler.ts`

```typescript
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public status?: number,
    message?: string,
    public details?: Record<string, any>
  ) {
    super(message || code)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      status: this.status,
      message: this.message,
      details: this.details,
    }
  }
}

/**
 * 错误拦截器 - 将不同来源的错误统一转换
 */
export function parseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof TypeError) {
    if (error.message.includes('fetch')) {
      return new AppError(ErrorCode.NETWORK_ERROR, undefined, '网络连接失败')
    }
    return new AppError(ErrorCode.INVALID_INPUT, undefined, error.message)
  }

  if (error instanceof Response) {
    const code = getErrorCodeFromStatus(error.status)
    const message = getErrorMessageFromStatus(error.status)
    return new AppError(code, error.status, message)
  }

  if (error instanceof Error) {
    return new AppError(ErrorCode.UNKNOWN, undefined, error.message)
  }

  return new AppError(ErrorCode.UNKNOWN, undefined, String(error))
}

function getErrorCodeFromStatus(status: number): ErrorCode {
  if (status === 401) return ErrorCode.UNAUTHORIZED
  if (status === 403) return ErrorCode.FORBIDDEN
  if (status === 404) return ErrorCode.NOT_FOUND
  if (status >= 500) return ErrorCode.SERVER_ERROR
  return ErrorCode.UNKNOWN
}

function getErrorMessageFromStatus(status: number): string {
  const messages: Record<number, string> = {
    400: '请求格式错误',
    401: '认证失败，请重新登录',
    403: '没有权限访问此资源',
    404: '资源不存在',
    408: '请求超时',
    429: '请求过于频繁，请稍候',
    500: '服务器错误',
    502: '网关错误',
    503: '服务不可用',
  }
  return messages[status] || `请求失败 (${status})`
}

/**
 * 带重试的 API 调用
 */
export async function apiCallWithRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number
    retryDelay?: number
    retryableErrors?: ErrorCode[]
  }
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryableErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.SERVER_ERROR,
    ]
  } = options || {}

  let lastError: AppError | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = parseError(error)

      // 如果不能重试，立即抛出
      if (!retryableErrors.includes(lastError.code)) {
        throw lastError
      }

      // 如果是最后一次重试，抛出错误
      if (attempt === maxRetries) {
        throw lastError
      }

      // 指数退避
      const delay = retryDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
```

#### 3.2 更新 oneDriveService

**文件**: `src/services/oneDriveService.ts` (改进版)

```typescript
import { apiCallWithRetry, parseError, AppError, ErrorCode } from './errorHandler'
import { logger } from './logger'

export class OneDriveService {
  private accessToken: string | null = null

  async uploadImage(
    parentFolderId: string,
    filename: string,
    imageData: Blob
  ): Promise<UploadResult> {
    try {
      return await apiCallWithRetry(
        async () => {
          const url = `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}:/${filename}:/content`

          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/octet-stream',
            },
            body: imageData,
          })

          if (!response.ok) {
            if (response.status === 401) {
              // Token 可能过期
              throw new AppError(
                ErrorCode.UNAUTHORIZED,
                401,
                '认证令牌已过期'
              )
            }
            throw new AppError(
              ErrorCode.UNKNOWN,
              response.status,
              `上传失败: ${response.statusText}`
            )
          }

          return response.json() as Promise<UploadResult>
        },
        {
          maxRetries: 3,
          retryDelay: 1000,
          retryableErrors: [
            ErrorCode.NETWORK_ERROR,
            ErrorCode.TIMEOUT,
            ErrorCode.SERVER_ERROR,
          ]
        }
      )
    } catch (error: unknown) {
      const appError = parseError(error)
      logger.error('OneDrive', '图像上传失败', appError)

      if (appError.code === ErrorCode.UNAUTHORIZED) {
        // 触发登录刷新
        this.handleTokenExpired()
      }

      throw appError
    }
  }

  private handleTokenExpired() {
    // 触发事件或调用回调刷新令牌
    window.dispatchEvent(new CustomEvent('token-expired'))
  }
}
```

#### 3.3 创建日志服务

**文件**: `src/services/logger.ts`

```typescript
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  scope: string
  message: string
  data?: any
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000

  private onError?: (error: AppError) => void

  setErrorHandler(handler: (error: AppError) => void) {
    this.onError = handler
  }

  private log(level: LogLevel, scope: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      data,
    }

    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    const prefix = `[${scope}]`
    const logFn = this.getLogFunction(level)

    if (data) {
      logFn(`${prefix} ${message}`, data)
    } else {
      logFn(`${prefix} ${message}`)
    }
  }

  private getLogFunction(level: LogLevel) {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug
      case LogLevel.INFO:
        return console.log
      case LogLevel.WARN:
        return console.warn
      case LogLevel.ERROR:
        return console.error
    }
  }

  debug(scope: string, message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, scope, message, data)
    }
  }

  info(scope: string, message: string, data?: any) {
    this.log(LogLevel.INFO, scope, message, data)
  }

  warn(scope: string, message: string, data?: any) {
    this.log(LogLevel.WARN, scope, message, data)
  }

  error(scope: string, message: string, error?: unknown) {
    const appError = error instanceof AppError
      ? error
      : parseError(error)

    this.log(LogLevel.ERROR, scope, message, appError.toJSON())

    if (this.onError && error instanceof AppError) {
      this.onError(appError)
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

export const logger = new Logger()
```

#### 3.4 在组件中使用错误处理

```typescript
export function PhotoUploadComponent() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  const handleUpload = useCallback(
    async (photo: Photo) => {
      setUploading(true)
      setError(null)

      try {
        logger.info('Upload', '开始上传照片', { photoId: photo.id })
        const result = await oneDriveService.uploadImage(
          folderId,
          photo.filename,
          photo.url
        )
        logger.info('Upload', '照片上传成功', { result })
        showNotification('上传成功', 'success')
      } catch (err: unknown) {
        const appError = parseError(err)
        setError(appError)
        logger.error('Upload', '照片上传失败', appError)

        // 根据错误类型显示不同的提示
        switch (appError.code) {
          case ErrorCode.UNAUTHORIZED:
            showNotification('认证过期，请重新登录', 'error')
            // 触发登录流程
            break
          case ErrorCode.NETWORK_ERROR:
            showNotification('网络连接失败，请检查网络', 'error')
            break
          default:
            showNotification(appError.message || '上传失败', 'error')
        }
      } finally {
        setUploading(false)
      }
    },
    []
  )

  return (
    <div>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">{error.message}</p>
          {error.details && (
            <pre className="mt-2 text-sm text-red-600">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          )}
        </div>
      )}
      <button
        onClick={() => handleUpload(photo)}
        disabled={uploading}
      >
        {uploading ? '上传中...' : '上传'}
      </button>
    </div>
  )
}
```

---

### 任务 4: 性能指标添加 (中优先级)

#### 4.1 创建性能监控服务

**文件**: `src/services/performanceService.ts`

```typescript
import { logger } from './logger'

export interface PerformanceMetric {
  name: string
  duration: number
  startTime: number
  endTime: number
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private marks: Map<string, number> = new Map()
  private thresholds: Record<string, number> = {
    'photo-capture': 2000,      // 应该在 2 秒内完成
    'barcode-recognition': 3000, // 应该在 3 秒内完成
    'photo-upload': 10000,       // 应该在 10 秒内完成
    'api-call': 5000,            // 应该在 5 秒内完成
  }

  mark(name: string) {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string, endMark: string) {
    const start = this.marks.get(startMark)
    const end = this.marks.get(endMark)

    if (!start || !end) {
      logger.warn('Performance', `标记不存在: ${startMark} 或 ${endMark}`)
      return
    }

    const duration = end - start
    const metric: PerformanceMetric = {
      name,
      duration,
      startTime: start,
      endTime: end,
    }

    this.metrics.set(name, metric)

    // 检查是否超过阈值
    const threshold = this.thresholds[name]
    if (threshold && duration > threshold) {
      logger.warn('Performance', `${name} 耗时过长: ${duration.toFixed(2)}ms`, {
        threshold,
        actual: duration
      })
    } else {
      logger.debug('Performance', `${name}: ${duration.toFixed(2)}ms`)
    }

    // 清理标记
    this.marks.delete(startMark)
    this.marks.delete(endMark)
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name)
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  getAverageMetric(namePattern: string): number {
    const matching = Array.from(this.metrics.values()).filter(m =>
      m.name.includes(namePattern)
    )

    if (matching.length === 0) return 0

    const total = matching.reduce((sum, m) => sum + m.duration, 0)
    return total / matching.length
  }

  clearMetrics() {
    this.metrics.clear()
    this.marks.clear()
  }

  generateReport(): string {
    const metrics = this.getAllMetrics()
    let report = '=== 性能报告 ===\n\n'

    metrics.forEach(metric => {
      const threshold = this.thresholds[metric.name]
      const status = threshold && metric.duration > threshold ? '⚠️' : '✅'
      report += `${status} ${metric.name}: ${metric.duration.toFixed(2)}ms\n`
    })

    report += '\n=== 平均值 ===\n'
    const categories = new Set(metrics.map(m => m.name.split('-')[0]))
    categories.forEach(cat => {
      const avg = this.getAverageMetric(cat)
      report += `${cat}: ${avg.toFixed(2)}ms\n`
    })

    return report
  }
}

export const performanceMonitor = new PerformanceMonitor()
```

#### 4.2 在关键路径上集成

```typescript
// Camera.tsx
const handleCapture = useCallback(async () => {
  performanceMonitor.mark('photo-capture-start')

  try {
    const photo = await camera.capture()
    // ... 处理照片
  } finally {
    performanceMonitor.mark('photo-capture-end')
    performanceMonitor.measure(
      'photo-capture',
      'photo-capture-start',
      'photo-capture-end'
    )
  }
}, [])

// ReviewScreen.tsx
const handleAnalyzeBarcode = useCallback(async () => {
  performanceMonitor.mark('barcode-recognition-start')

  try {
    const result = await barcodeService.analyzeImage(photoData)
    setRecognizedSN(result.data)
  } finally {
    performanceMonitor.mark('barcode-recognition-end')
    performanceMonitor.measure(
      'barcode-recognition',
      'barcode-recognition-start',
      'barcode-recognition-end'
    )
  }
}, [])

// oneDriveService.ts
async uploadImage(...) {
  performanceMonitor.mark('photo-upload-start')

  try {
    // ... 上传逻辑
    return result
  } finally {
    performanceMonitor.mark('photo-upload-end')
    performanceMonitor.measure(
      'photo-upload',
      'photo-upload-start',
      'photo-upload-end'
    )
  }
}
```

#### 4.3 添加性能报告导出

```typescript
// SettingsScreen.tsx (新增调试选项)
export function SettingsScreen() {
  const handleExportMetrics = () => {
    const metrics = performanceMonitor.getAllMetrics()
    const report = performanceMonitor.generateReport()

    const dataStr = report + '\n\nJSON:\n' + JSON.stringify(metrics, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'text/plain' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `performance-${Date.now()}.txt`
    link.click()
  }

  return (
    <div>
      {process.env.NODE_ENV === 'development' && (
        <button onClick={handleExportMetrics}>
          导出性能指标
        </button>
      )}
    </div>
  )
}
```

---

## 实施时间表

| 周次 | 任务 | 预计工时 | 负责人 |
|------|------|---------|--------|
| 第 1 周 | 样式定义统一 | 8 小时 | 前端 |
|  | 错误处理完善 | 8 小时 | 全栈 |
| 第 2 周 | 设备方向处理优化 | 4 小时 | 前端 |
|  | 性能指标添加 | 8 小时 | 全栈 |
| 第 3 周 | 测试和优化 | 8 小时 | QA + 前端 |
|  | 文档和总结 | 4 小时 | 技术负责人 |

---

## 检查清单

### 样式定义统一
- [ ] 创建 `src/styles/animations.css`
- [ ] 更新 `tailwind.config.js`
- [ ] 创建 `src/services/styleService.ts`
- [ ] 更新所有组件去除内联 style 标签
- [ ] 测试所有动画效果
- [ ] 代码审查

### 设备方向处理
- [ ] 创建 `src/hooks/useDeviceOrientation.ts`
- [ ] 更新 `ReviewScreen.tsx`
- [ ] 更新 `GalleryScreen.tsx`
- [ ] 移除重复代码
- [ ] 测试各种设备方向

### 错误处理
- [ ] 创建 `src/services/errorHandler.ts`
- [ ] 创建 `src/services/logger.ts`
- [ ] 更新所有 API 调用
- [ ] 添加错误通知 UI
- [ ] 测试错误场景

### 性能监控
- [ ] 创建 `src/services/performanceService.ts`
- [ ] 在关键路径集成
- [ ] 添加性能报告导出
- [ ] 建立性能基准线
- [ ] 定期监控

---

## 预期收益

| 改进项 | 指标 | 目标 |
|--------|------|------|
| 代码质量 | 样式一致性 | 从 40% 提升到 95% |
| 代码复用 | 重复代码量 | 减少 50% |
| 维护成本 | 样式修改时间 | 从 30min 减少到 5min |
| 用户体验 | 错误提示清晰度 | 提升 80% |
| 性能 | 同步失败率 | 从 15% 降低到 5% |
| 可观测性 | 性能问题发现率 | 提升 90% |
