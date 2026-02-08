# Photo Suite - Printer Documentation App

A modern web application for capturing and managing printer documentation photos with AI-powered serial number and model recognition.

## Features

✨ **AI-Powered Recognition**: Automatically extract serial numbers and model information from photos using Google's Gemini AI  
📸 **12-Photo Documentation**: Structured photo capture workflow for complete printer documentation  
☁️ **Google Drive Integration**: Automatic synchronization to Google Drive  
🎨 **Modern UI**: Clean, Apple-inspired interface with smooth animations  
📱 **Responsive Design**: Works on desktop and mobile devices  

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Gemini API Key

The app uses Google's Gemini AI to automatically recognize printer serial numbers and models from photos.

**Get your API key:**
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
3. Save the file

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

### AI Recognition Not Working

**Symptom**: Photos are captured but serial number is not automatically extracted

**Solutions**:
1. **Check API Key Configuration**:
   - Open `.env` file
   - Ensure `GEMINI_API_KEY` is set correctly
   - Restart the dev server after changing `.env`

2. **Check Developer Console**:
   - Open browser DevTools (F12)
   - Look for errors in the Console tab
   - Common errors:
     - `API Key not configured`: API key is missing
     - `API quota exceeded`: Need to upgrade API plan
     - `Invalid API key`: Key is incorrect or expired

3. **Disable "Skip Review Screen"**:
   - Go to Settings
   - Turn OFF "Skip Review Screen"
   - This lets you see the AI analysis process

4. **Test API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Try asking a question to verify your key works

### Manual Entry

If AI recognition fails, you can always manually enter the information:
- On the Review screen, click the Serial Number area
- Enter the information manually
- Click confirm

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Google Gemini AI** - Image analysis
- **Google Drive API** - Cloud storage
- **IndexedDB** - Local data persistence

## License

Private project - All rights reserved
