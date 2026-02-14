# Photo Suite - Printer Documentation App

A modern web application for capturing and managing printer documentation photos with AI-powered serial number and model recognition.

## Features

✨ **智能条形码识别** - 快速准确:
- **条形码/QR码识别** - 直接读取标签条形码和QR码（完全离线，100% 准确）
- 自动识别序列号、型号、部件号
- 一键手动编辑修正

☁️ **双云存储支持**:
- **Google Drive** - 官方谷歌云存储集成
- **Microsoft OneDrive** - 微软 OneDrive 集成，支持企业账户

📸 **12-Photo Documentation**: Structured photo capture workflow for complete printer documentation
🎨 **Modern UI**: Clean, Apple-inspired interface with smooth animations
📱 **跨平台支持 (Capacitor)**:
- **Web** - 现代浏览器
- **iOS** - iPhone 和 iPad（iOS 13+）
- **Android** - Android 手机和平板（Android 8+）
- 原生相机集成和权限管理
- 离线照片存储和同步  

### 识别效果说明

针对 **Zebra 打印机标签**（如 ZT411/ZT421）优化：
- ✅ 自动识别标签上的条形码（序列号）
- ✅ 自动识别 QR 码数据
- ✅ 自动识别部件号（如 ZT41142-T010000Z）
- ✅ 完全离线，无需任何 API Key
- ✅ 响应快速 <100ms

## 快速开始

### 📱 移动端用户（iOS 和 Android）

**最快开始方式 (5分钟)：**

详见 [MOBILE_QUICKSTART.md](./MOBILE_QUICKSTART.md) - 包含完整的 iOS 和 Android 构建步骤。

**详细构建指南：**

- [MOBILE_BUILD_GUIDE.md](./MOBILE_BUILD_GUIDE.md) - iOS/Android 完整构建和发布指南
- [CAPACITOR_GUIDE.md](./CAPACITOR_GUIDE.md) - Capacitor 配置和原生功能集成
- [MOBILE_PLATFORM_CONFIG.md](./MOBILE_PLATFORM_CONFIG.md) - 平台特定配置和初始化

### 💻 Web 用户

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloud Provider (Optional)

你可以选择使用 Google Drive 或 Microsoft OneDrive（或都不使用，仅本地存储）。

#### 选项 A: Google Drive
- 详见 README.md 中的 Google Drive 配置部分（原有步骤）

#### 选项 B: Microsoft OneDrive
- **详见 [MICROSOFT_SETUP.md](./MICROSOFT_SETUP.md)**

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 3b. 移动端开发 (可选)

#### 构建 iOS 应用
```bash
# 方式 1：自动打开 Xcode
npm run ios:build

# 方式 2：分步
npm run build
npm run sync:ios
npx cap open ios
```

#### 构建 Android 应用
```bash
# 方式 1：自动打开 Android Studio
npm run android:build

# 方式 2：分步
npm run build
npm run sync:android
npx cap open android
```

### 4. Build for Production

```bash
npm run build
```

#### 移动端发布

发布 iOS 或 Android 应用：
- **iOS 发布：** 见 [MOBILE_BUILD_GUIDE.md](./MOBILE_BUILD_GUIDE.md) 第 "iOS 发布构建" 部分
- **Android 发布：** 见 [MOBILE_BUILD_GUIDE.md](./MOBILE_BUILD_GUIDE.md) 第 "Android 发布构建" 部分

## 可用的命令

### Web 开发
```bash
npm run dev       # 启动开发服务器
npm run build     # 生产构建
npm run preview   # 预览生产构建
```

### 移动端开发
```bash
npm run build:mobile    # 构建 web 资源并同步
npm run ios:build       # iOS 完整构建
npm run android:build   # Android 完整构建
npm run sync:ios        # 同步更改到 iOS
npm run sync:android    # 同步更改到 Android
npm run sync:both       # 同步到两个平台
```

## Cloud Provider Configuration

应用支持在 **Settings** 中选择云提供商：
- **None** - 仅本地存储，无云同步
- **Google Drive** - 需要 Google OAuth 配置
- **Microsoft OneDrive** - 需要 Azure AD 应用注册

选择后，应用会自动使用该提供商上传照片。

### 云提供商文档

- **Google Drive**: 见 README.md 原有步骤
- **Microsoft OneDrive**: 详见 [MICROSOFT_SETUP.md](./MICROSOFT_SETUP.md) 和 [ONEDRIVE_QUICKSTART.md](./ONEDRIVE_QUICKSTART.md)

## Usage

### Taking Photos

1. Click the **Capture** button on the Gallery screen
2. For the **first photo**:
   - The camera will capture the printer label
   - AI will automatically recognize the Serial Number and Model
   - Review and edit if needed
3. Continue taking the remaining 11 photos (different angles/components)
4. All photos are automatically saved

### Settings

- **Skip Review Screen**: Skip the review step after each photo
- **Auto Upload**: Automatically sync photos to Google Drive
- **Flash**: Control camera flash (On/Off/Auto)
- **Image Quality**: Original or Compressed

## Troubleshooting

### Recognition System

The app uses an **intelligent triple recognition system** with automatic fallback:

**📊 Phase 1: Barcode Recognition**
- Scans the printer label's barcode
- Extracts serial number directly (most accurate)
- Uses ZXing library

**🤖 Phase 2: Gemini AI (Cloud)**
- Used when API key is configured
- Comprehensive text recognition
- Highest accuracy for both serial number and model
- Requires internet connection

**📷 Phase 3: Local OCR (Tesseract.js)**
- Automatic fallback when barcode/Gemini unavailable
- Works completely offline
- Enhanced with image preprocessing:
  - Grayscale conversion
  - Contrast enhancement
  - Sharpening filter
- Optimized regex patterns for Zebra labels

**Recognition Flow:**
```
Photo Captured
    ↓
[1] Barcode/QR Code Recognition (ZXing + jsQR)
    ├─ Serial Number detected? ✓
    ├─ Part Number detected? ✓
    └─ Model detected? ✓
    ↓
Return results or prompt for manual entry
```

### 识别功能

**Barcode Recognition**:
1. 打开浏览器 DevTools (F12)
2. 查看识别状态信息：
   - 📊 "尝试条形码和QR码识别..." - Scanning barcodes
   - ✅ "找到 X 个条码" - Found barcodes
   - ⚠️ "未找到条形码或识别失败" - No barcode found

**Best Practices**:
1. **为获得最佳识别效果**:
   - ✅ 确保条形码清晰可见且对焦准确
   - ✅ 将标签置于画面中央
   - ✅ 良好的照明（避免眩光/阴影）
   - ✅ 保持稳定 1-2 秒
   - ✅ 确保 "Serial No." 和 "Model" 文字可读
   
2. **如果自动识别失败**:
   - ✅ 手动输入序列号、型号和部件号
   - 无需任何 API Key 或云端配置


3. **For Barcode Issues**:
   - Get closer to the label
   - Ensure barcode is not damaged
   - Check lighting (barcode needs good contrast)

4. **For Gemini API errors**:
   - Check API key in `.env`
   - Verify key is valid at [Google AI Studio](https://aistudio.google.com/)
   - Check quota limits
   - Restart dev server after changing `.env`

5. **Debug Mode**:
   - Go to Settings
   - Turn OFF "Skip Review Screen"
   - This shows full recognition process and allows manual editing

### Manual Entry

If AI recognition fails, you can always manually enter the information:
- On the Review screen, click the Serial Number area
- Enter the information manually
- Click confirm

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Recognition Stack**:
  - **ZXing** - Barcode/QR code reader
  - **Google Gemini AI** - Cloud-based image analysis (optional)
  - **Tesseract.js** - Local OCR engine (offline capable)
  - **Custom image preprocessing** - Contrast enhancement, sharpening
- **Google Drive API** - Cloud storage
- **Microsoft Graph API** - OneDrive integration
- **Capacitor** - Cross-platform mobile framework
- **IndexedDB** - Local data persistence

## License

Private project - All rights reserved
