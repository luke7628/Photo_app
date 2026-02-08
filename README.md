# Photo Suite - Printer Documentation App

A modern web application for capturing and managing printer documentation photos with AI-powered serial number and model recognition.

## Features

✨ **双模式 AI 识别**: 
- **云端模式** - Google Gemini AI（需要 API Key，更准确）
- **本地模式** - Tesseract.js OCR（无需配置，完全离线）
- 自动智能切换，无缝回退

📸 **12-Photo Documentation**: Structured photo capture workflow for complete printer documentation  
☁️ **Google Drive Integration**: Automatic synchronization to Google Drive  
🎨 **Modern UI**: Clean, Apple-inspired interface with smooth animations  
📱 **Responsive Design**: Works on desktop and mobile devices  

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

The app uses an **intelligent dual-mode recognition system**:

**🤖 Mode 1: Gemini AI (Cloud)**
- Used when API key is configured
- Higher accuracy
- Requires internet connection

**📷 Mode 2: Local OCR (Tesseract.js)**
- Automatic fallback when Gemini is unavailable
- Works completely offline
- No API key needed
- Good accuracy for clear photos

**How it works:**
1. Takes photo → Check if Gemini API key exists
2. If YES → Try Gemini AI
3. If Gemini fails OR no API key → Use local OCR
4. Display results to user

### AI Recognition Not Working

**Check Console Logs**:
1. Open browser DevTools (F12)
2. Look for recognition status messages:
   - 🤖 "使用 Gemini AI 识别..." - Using cloud AI
   - 📷 "使用本地 OCR 识别..." - Using local OCR
   - ✅ "识别成功" - Recognition succeeded
   - ⚠️ "识别失败" - Recognition failed

**Solutions**:
1. **For poor OCR results**:
   - Ensure good lighting
   - Hold camera steady
   - Get close to the label
   - Make sure text is in focus
   - Try configuring Gemini API for better accuracy

2. **For Gemini API errors**:
   - Check API key in `.env`
   - Verify key is valid at [Google AI Studio](https://aistudio.google.com/)
   - Check quota limits
   - Restart dev server after changing `.env`

3. **Disable "Skip Review Screen"**:
   - Go to Settings
   - Turn OFF "Skip Review Screen"
   - This lets you see the recognition process and results

### Manual Entry

If AI recognition fails, you can always manually enter the information:
- On the Review screen, click the Serial Number area
- Enter the information manually
- Click confirm

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Google Gemini AI** - Cloud-based image analysis (optional)
- **Tesseract.js** - Local OCR engine (offline capable)
- **Google Drive API** - Cloud storage
- **IndexedDB** - Local data persistence

## License

Private project - All rights reserved
