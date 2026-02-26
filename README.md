# Photo APP - Printer Documentation App

A modern web application for capturing and managing printer documentation photos with intelligent barcode/QR code recognition.

## Recent Engineering Updates

- Refined iOS-like image preview interactions with neighbor-image peek during horizontal swipe.
- Added rubber-band bounds and bounce-back settling for pan/zoom gestures.
- Improved crop reliability by loading from the current source before canvas processing.
- Repositioned pagination indicators to avoid overlap with bottom action controls.

## Features

✨ **Intelligent Barcode Recognition**:
- **Barcode/QR Code Detection** - Directly read label barcodes and QR codes (completely offline, highly accurate)
- Automatic recognition of Serial Number, Model, and Part Number
- One-click manual edit and correction

☁️ **Cloud Storage Support**:
- **Microsoft OneDrive** - Microsoft OneDrive integration with enterprise account support

📸 **12-Photo Documentation**: Structured photo capture workflow for complete printer documentation
🎨 **Modern UI**: Clean, Apple-inspired interface with smooth animations

### Recognition Performance

Optimized for **Zebra Printer Labels** (such as ZT411/ZT421):
- ✅ Automatically detect and read barcodes on labels (Serial Number)
- ✅ Automatically detect QR code data
- ✅ Automatically recognize part numbers (e.g., ZT41142-T010000Z)
- ✅ Completely offline, no API Key required
- ✅ Fast response time <100ms

## Quick Start

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloud Provider (Optional)

Use Microsoft OneDrive (or choose local-only storage).

**For OneDrive integration:**
- Set `VITE_MICROSOFT_CLIENT_ID` in `.env.local`
- Set `VITE_MICROSOFT_TENANT_ID` (default: "common")
- Set `VITE_MICROSOFT_REDIRECT_URI` (defaults to current origin)

**For Azure Computer Vision (barcode fallback):**
- Create a Cognitive Services (or Computer Vision) resource in the Azure Portal.
- In your project root create `.env.local` (do NOT commit it) and set:

```text
VITE_AZURE_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com
VITE_AZURE_KEY=<your-subscription-key>
```

- Note: Browser requests to Azure require the resource to allow CORS from your dev origin, or you should proxy requests through a small server. See the Azure docs for "CORS" and "Computer Vision".

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000/Photo_app/`

### 4. Build for Production (Web)

```bash
npm run build:web
```

Output will be in the `dist/` folder.

## Project Structure

```
src/
├── App.tsx                 # Main application component
├── index.tsx              # Entry point
├── types.ts               # TypeScript interfaces
├── constants.ts           # App constants
├── components/            # React components
│   ├── SplashScreen.tsx
│   ├── CameraScreen.tsx
│   ├── ReviewScreen.tsx
│   ├── GalleryScreen.tsx
│   ├── DetailsScreen.tsx
│   └── ...
├── services/              # Business logic
│   ├── barcodeService.ts
│   ├── quaggaService.ts
│   ├── microsoftAuthService.ts
│   ├── oneDriveService.ts
│   └── storageService.ts
└── styles/                # CSS styles
    └── theme.css

Config files:
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS
├── tsconfig.json          # TypeScript config
└── package.json           # Dependencies & scripts
```

## Available Commands

```bash
npm run dev           # Start development server (localhost:3000)
npm run build:web     # Build for production web deployment
npm run preview       # Preview production build locally
```

### Mobile Development
```bash
npm run build:mobile    # Build web resources and sync
npm run ios:build       # Complete iOS build
npm run android:build   # Complete Android build
npm run sync:ios        # Sync changes to iOS
npm run sync:android    # Sync changes to Android
npm run sync:both       # Sync to both platforms
```

## Cloud Provider Configuration

The app supports selecting a cloud provider in **Settings**:
- **None** - Local storage only, no cloud sync
- **Microsoft OneDrive** - Requires Azure AD app registration

After selection, the app will automatically upload photos to the chosen provider.

### Cloud Provider Documentation

- **Microsoft OneDrive**: See [MICROSOFT_SETUP.md](./MICROSOFT_SETUP.md) and [ONEDRIVE_QUICKSTART.md](./ONEDRIVE_QUICKSTART.md)

## Usage

### Taking Photos

1. Click the **Capture** button on the Gallery screen
2. For the **first photo**:
   - The camera will capture the printer label
   - System will automatically recognize the Serial Number
   - Review and edit if needed
3. Continue taking the remaining 11 photos (different angles/components)
4. All photos are automatically saved

### Settings

- **Skip Review Screen**: Skip the review step after each photo
- **Auto Upload**: Automatically sync photos to cloud storage
- **Flash**: Control camera flash (On/Off/Auto)
- **Image Quality**: Original or Compressed

## Troubleshooting

### Recognition System

The app uses a **smart dual recognition system** with automatic fallback:

**📊 Phase 1: Barcode/QR Code Recognition**
- Scans the printer label's barcode
- Extracts serial number directly (most accurate)
- Uses ZXing library and native BarcodeDetector API

**📷 Phase 2: Fallback (Offline)**
- Automatic fallback when barcode not found
- Works completely offline
- No preprocessing needed for high-quality photos

**Recognition Flow:**
```
Photo Captured
    ↓
[1] Barcode/QR Code Recognition (BarcodeDetector → ZXing)
    ├─ Serial Number detected? ✓
    ├─ Part Number detected? ✓
    └─ Model detected? ✓
    ↓
Return results or prompt for manual entry
```

### Barcode Recognition

**Checking Recognition Status**:
1. Open browser DevTools (F12)
2. Check recognition status messages:
   - 📊 "Scanning barcodes..." - Barcode detection in progress
   - ✅ "Found X barcodes" - Barcodes detected successfully
   - ⚠️ "No barcodes detected or recognition failed" - Barcode not found

**Best Practices**:
1. **For best recognition results**:
   - ✅ Ensure barcode is clear and in focus
   - ✅ Center the label in the frame
   - ✅ Good lighting conditions (avoid glare/shadows)
   - ✅ Keep the phone steady for 1-2 seconds
   - ✅ Ensure "Serial No." and "Model" text is readable
   
2. **If automatic recognition fails**:
   - ✅ Manually enter serial number, model, and part number
   - No need for any API Key or cloud setup

3. **For Barcode Issues**:
   - Get closer to the label
   - Ensure barcode is not damaged
   - Check lighting (barcode needs good contrast)

4. **Debug Mode**:
   - Go to Settings
   - Turn OFF "Skip Review Screen"
   - This shows the full recognition process and allows manual editing

### Manual Entry

If barcode recognition fails, you can always manually enter the information:
- On the Review screen, click the Serial Number area
- Enter the information manually
- Click confirm

## Tech Stack

- **React 19** + **TypeScript** - UI framework
- **Vite** - Fast build tool & dev server
- **Tailwind CSS** - Utility-first styling
- **Barcode Recognition**:
  - **Quagga2** - Advanced barcode detection
  - **ZXing** - Fallback barcode/QR code library
  - **jsQR** - Pure JavaScript QR code reader
- **Cloud Storage**: Microsoft Graph API for OneDrive
- **IndexedDB** - Local data persistence

## License

Private project - All rights reserved
