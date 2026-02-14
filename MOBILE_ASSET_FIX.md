# 移动端资源加载问题修复

## 问题描述

在 iOS/Android 移动应用上保存网页到主屏幕后，应用会自动跳转到 asset 页面并显示"无效链接"错误。

## 根本原因

Vite 配置中的 `base: '/Photo_app/'` 路径设置适用于 Web 平台（GitHub Pages），但在 Capacitor 移动应用中会破坏所有资源链接：

- **Web 环境**：资源从 `https://example.com/Photo_app/` 加载 ✅
- **移动应用**：资源从本地文件系统加载（`file:///...`），但应用仍然寻找 `/Photo_app/` 路径 ❌

## 解决方案

### 1. 修改 `vite.config.ts`

动态设置 `base` 路径，根据构建目标选择：

```typescript
// 动态设置 base 路径
const isCapacitor = process.env.VITE_CAPACITOR === 'true';
const base = isCapacitor ? '/' : '/Photo_app/';
```

- **移动应用**：`VITE_CAPACITOR=true` → `base: '/'`
- **Web 应用**：默认 → `base: '/Photo_app/'`

### 2. 修改 `package.json` 脚本

添加两个独立的构建命令：

```json
"build": "vite build",           // 默认 Web 构建
"build:web": "BASE_URL=/Photo_app/ vite build",  // 显式 Web 构建
"build:mobile": "VITE_CAPACITOR=true vite build && npx cap sync"  // 移动端构建
```

### 3. 使用正确的构建命令

**构建 Web 版本**（GitHub Pages）：
```bash
npm run build          # 使用默认配置（base: '/Photo_app/'）
npm run build:web      # 显式指定 Web 构建
```

**构建移动应用**（iOS/Android）：
```bash
npm run build:mobile   # 使用 base: '/'，然后同步到移动平台
npm run ios:build      # 完整 iOS 构建流程
npm run android:build  # 完整 Android 构建流程
```

---

## 完整工作流示例

### 第一次设置

```bash
# 1. 构建 Web 版本（GitHub Pages）
npm run build:web

# 2. 构建移动应用
npm run build:mobile
npm run ios:build    # 或 npm run android:build
```

### 日常开发

```bash
# 修改代码后，如果要更新移动应用：
npm run build:mobile
npm run sync:ios     # 同步到 iOS
npm run sync:android # 同步到 Android

# 然后在 Xcode 或 Android Studio 中运行应用
```

### 发布到 Web

```bash
# 准备发布到 GitHub Pages
npm run build:web
# GitHub Actions will deploy the dist/ folder
```

---

## 验证修复

### iOS 验证
1. 运行 `npm run ios:build`
2. 在 Xcode 中运行应用
3. 应用应该正常加载，所有资源显示正确
4. 保存到主屏幕，应该能够正常运行

### Android 验证
1. 运行 `npm run android:build`
2. 在 Android Studio 中运行应用
3. 应用应该正常加载，所有资源显示正确
4. 保存到主屏幕，应该能够正常运行

### Web 验证
1. 运行 `npm run build:web`
2. 部署 `dist/` 到 GitHub Pages
3. 访问 `https://luke7628.github.io/Photo_app/`
4. 应该能够正常加载所有资源

---

## 技术细节

### Vite `base` 配置

`vite.config.ts` 中的 `base` 选项控制应用部署的基础路径：

```typescript
// base: '/' 
// ✅ 在移动应用中工作（或根目录 Web 应用）
// 资源：/index.html, /app.js, /style.css

// base: '/Photo_app/'
// ✅ 在 GitHub Pages 子路径中工作
// 资源：/Photo_app/index.html, /Photo_app/app.js, /Photo_app/style.css
```

### 环境变量注入

通过环境变量控制构建配置：

```typescript
const isCapacitor = process.env.VITE_CAPACITOR === 'true';
// 设置此变量：npm run build:mobile (内部设置：VITE_CAPACITOR=true)
```

---

## 故障排查

### 问题：构建后资源仍然找不到

**解决**：
```bash
# 1. 清除旧构建
rm -rf dist/

# 2. 完整重建
npm run build:mobile

# 3. 清除应用缓存
npm run sync:both

# 4. 重新运行应用
```

### 问题：Web 版本资源找不到

**解决**：
```bash
# 确保使用 Web 构建命令
npm run build:web

# 检查 dist/ 中的索引文件路径
ls -la dist/index.html
```

### 问题：在 GitHub Pages 上找不到资源

**解决**：
```bash
# 1. 检查 vite.config.ts 中的 base 配置
# 应该是 '/Photo_app/'

# 2. 构建
npm run build:web

# 3. 部署 dist/ 文件夹
# GitHub Actions 应该自动完成
```

---

## 总结

| 构建命令 | 基础路径 | 目标平台 | 用途 |
|---------|---------|---------|------|
| `npm run build` | `/Photo_app/` | Web | GitHub Pages |
| `npm run build:web` | `/Photo_app/` | Web | 显式 Web 构建 |
| `npm run build:mobile` | `/` | iOS/Android | 移动应用 |
| `npm run ios:build` | `/` | iOS | iOS 完整构建 |
| `npm run android:build` | `/` | Android | Android 完整构建 |

选择正确的构建命令以确保在正确的平台上获得正确的资源路径。
