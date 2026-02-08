# Photo Suite - Printer Documentation App

A modern web application for capturing and managing printer documentation photos with AI-powered serial number and model recognition.

## Features

✨ **三重智能识别系统** - 最高准确率方案:
- **条形码识别** - 直接读取标签条形码（最准确，针对序列号）
- **云端 AI** - Google Gemini（需要 API Key，全面识别）
- **本地 OCR** - Tesseract.js（无需配置，离线可用）
- 自动智能切换，多重备份保障

📸 **12-Photo Documentation**: Structured photo capture workflow for complete printer documentation  
☁️ **Google Drive Integration**: Automatic synchronization to Google Drive  
🎨 **Modern UI**: Clean, Apple-inspired interface with smooth animations  
📱 **Responsive Design**: Works on desktop and mobile devices  

### 识别效果说明

针对 **Zebra 打印机标签**（如 ZT411/ZT421）优化：
- ✅ 自动识别标签上的条形码（序列号）
- ✅ OCR 识别 "Model/Modèle: ZT411" 格式
- ✅ OCR 识别 "Serial No./No. de Série: 99J204501782" 格式
- ✅ 图像预处理增强识别准确率  

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Gemini API Key (Optional)

**⚡ 无需配置即可使用！**  
应用会自动使用内置的本地 OCR（Tesseract.js）进行识别，完全离线工作。

**想要更高的识别准确度？** 配置 Gemini API：

The app uses Google's Gemini AI for better recognition accuracy. If not configured, it automatically falls back to local OCR.

**Get your API key (optional):**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

**Configure the key:**
1. Open the `.env` file in the project root
2. Replace `GEMINI_API_KEY=` with your actual key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. Save the file and restart the dev server

⚠️ **Important**: Never commit your `.env` file to git. It's already in `.gitignore`.

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

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
[1] Try Barcode → Found serial? ✓ → Store serial number
    ↓
[2] Check Gemini API Key
    ├─ Available → Gemini AI → Get model + serial (if not found)
    └─ Not available → Skip
    ↓
[3] Local OCR → Get missing info (model/serial)
    ↓
Return combined results
```

### AI Recognition Not Working

**Check Console Logs**:
1. Open browser DevTools (F12)
2. Look for recognition status messages:
   - 📊 "尝试条形码识别..." - Scanning barcode
   - 🤖 "使用 Gemini AI 识别..." - Using cloud AI
   - 📷 "使用本地 OCR 识别..." - Using local OCR
   - 🎨 "开始图像预处理..." - Image preprocessing
   - ✅ "识别成功" - Recognition succeeded
   - ⚠️ "识别失败" - Recognition failed

**Solutions**:
1. **For Zebra Label Recognition**:
   - ✅ Ensure barcode is clearly visible and in focus
   - ✅ Center the label in frame
   - ✅ Good lighting (avoid glare/shadows)
   - ✅ Hold steady for 1-2 seconds
   - ✅ Make sure "Serial No." and "Model" text are readable
   
2. **For Low OCR Accuracy**:
   - Configure Gemini API for better results
   - Ensure text is large enough in frame
   - Clean the label if dirty/scratched
   - Try multiple angles

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
- **IndexedDB** - Local data persistence

## License

Private project - All rights reserved
