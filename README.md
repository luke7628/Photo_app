# Photo APP - Printer Documentation App

A modern web application for capturing and managing printer documentation photos with intelligent barcode/QR code recognition.

## Features

✨ **Intelligent Barcode Recognition**:
- **Barcode/QR Code Detection** - Directly read label barcodes and QR codes (completely offline, highly accurate)
- Automatic recognition of Serial Number, Model, and Part Number
- One-click manual edit and correction

☁️ **Dual Cloud Storage Support**:
- **Google Drive** - Official Google Cloud Storage integration
- **Microsoft OneDrive** - Microsoft OneDrive integration with enterprise account support

📸 **12-Photo Documentation**: Structured photo capture workflow for complete printer documentation
🎨 **Modern UI**: Clean, Apple-inspired interface with smooth animations
📱 **Cross-Platform Support (Capacitor)**:
- **Web** - Modern browsers
- **iOS** - iPhone and iPad (iOS 13+)
- **Android** - Android phones and tablets (Android 8+)
- Native camera integration and permission management
- Offline photo storage and synchronization

### Recognition Performance

Optimized for **Zebra Printer Labels** (such as ZT411/ZT421):
- ✅ Automatically detect and read barcodes on labels (Serial Number)
- ✅ Automatically detect QR code data
- ✅ Automatically recognize part numbers (e.g., ZT41142-T010000Z)
- ✅ Completely offline, no API Key required
- ✅ Fast response time <100ms

## Quick Start

### 📱 Mobile Users (iOS and Android)

**Fastest way to get started (5 minutes):**

See [MOBILE_QUICKSTART.md](./MOBILE_QUICKSTART.md) - Complete iOS and Android build steps.

**Detailed Build Guides:**

- [MOBILE_BUILD_GUIDE.md](./MOBILE_BUILD_GUIDE.md) - Complete iOS/Android build and release guide
- [CAPACITOR_GUIDE.md](./CAPACITOR_GUIDE.md) - Capacitor configuration and native feature integration
- [MOBILE_PLATFORM_CONFIG.md](./MOBILE_PLATFORM_CONFIG.md) - Platform-specific configuration and initialization

### 💻 Web Users

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloud Provider (Optional)

You can choose to use Microsoft OneDrive or Google Drive (or neither for local-only storage).

#### Option A: Microsoft OneDrive (Recommended)
- **See [MICROSOFT_SETUP.md](./MICROSOFT_SETUP.md)**

#### Option B: Google Drive
- See Google Drive configuration steps in [MICROSOFT_SETUP.md](./MICROSOFT_SETUP.md)

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 3b. Mobile Development (Optional)

#### Build iOS App
```bash
# Option 1: Automatically open Xcode
npm run ios:build

# Option 2: Step by step
npm run build
npm run sync:ios
npx cap open ios
```

#### Build Android App
```bash
# Option 1: Automatically open Android Studio
npm run android:build

# Option 2: Step by step
npm run build
npm run sync:android
npx cap open android
```

### 4. Build for Production

```bash
npm run build
```

#### Mobile Release

To publish iOS or Android apps:
- **iOS Release**: See [MOBILE_BUILD_GUIDE.md](./MOBILE_BUILD_GUIDE.md) section "iOS Release Build"
- **Android Release**: See [MOBILE_BUILD_GUIDE.md](./MOBILE_BUILD_GUIDE.md) section "Android Release Build"

## Available Commands

### Web Development
```bash
npm run dev       # Start development server
npm run build     # Production build
npm run preview   # Preview production build
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
- **Google Drive** - Requires Google OAuth configuration
- **Microsoft OneDrive** - Requires Azure AD app registration

After selection, the app will automatically upload photos to the chosen provider.

### Cloud Provider Documentation

- **Google Drive**: See [MICROSOFT_SETUP.md](./MICROSOFT_SETUP.md)
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

- **React 19** + **TypeScript**
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Recognition Stack**:
  - **BarcodeDetector API** - Native barcode/QR code reader
  - **ZXing** - Barcode/QR code library (fallback)
  - Custom image processing for optimal recognition
- **Google Drive API** - Cloud storage
- **Microsoft Graph API** - OneDrive integration
- **Capacitor** - Cross-platform mobile framework
- **IndexedDB** - Local data persistence

## License

Private project - All rights reserved
