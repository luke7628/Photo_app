# 📱 Mobile Debug Tool (Temporary)

**⚠️ This is a temporary debugging tool that will be removed before production release.**

## 🚀 How to Enable

### Method 1: URL Parameter (Recommended for Production Testing)
Add `?debug=true` to your URL:
```
https://your-app-url.com/?debug=true
```

### Method 2: Development Mode
The debug tool is **automatically enabled** when running in development mode:
```bash
npm run dev
```

## 🎯 How to Use

Once enabled, you'll see a **floating button** (usually a eruda icon) in the **bottom-right corner** of the screen.

### Open Console:
1. Tap the floating button
2. Console panel will slide up from bottom
3. You can now see all `console.log()` messages

### Available Tabs:
- **Console**: All logs, errors, warnings
- **Elements**: DOM inspector
- **Network**: HTTP requests inspection
- **Resources**: LocalStorage, SessionStorage inspection
- **Info**: Device and browser information
- **Sources**: View source code
- **Settings**: Eruda configuration

## 📊 What to Look For (Barcode Recognition)

When testing barcode recognition on iPhone, look for these logs:

### 1. API Availability Check
```
🔍 [BarcodeDetector] API ✅ 可用
📱 [Device] UserAgent: Mozilla/5.0...
🌐 [Browser] Safari iOS
```
**If you see ❌**: BarcodeDetector API is not available, will use ZXing fallback

### 2. Image Processing
```
📐 [readBarcode] 预优化：调整分辨率...
📐 [optimizeResolution] 分辨率优化: 3024x4032 → 1600x2133
```
**Check**: Image dimensions should be reasonable (not 0x0)

### 3. Detection Progress
```
🔍 [BarcodeDetector] 开始检测 (原图)...
📊 [BarcodeDetector] 检测完成，找到 1 个结果
✅ BarcodeDetector (raw) 识别成功: ZT41142-T010000Z (CODE_128)
```
**If no results**: Check image quality or try different lighting

### 4. Quality Assessment (on failure)
```
📊 [readBarcode] 图像质量分数: 45/100
问题: Too dark, Low contrast
💡 建议: Improve lighting...
```

## 🔧 Common Issues & Solutions

### Issue: Eruda doesn't appear
**Solutions:**
1. Make sure `?debug=true` is in URL
2. Check browser console for errors
3. Try refreshing the page
4. Clear cache and reload

### Issue: Can't see barcode logs
**Solutions:**
1. Open Eruda console
2. Filter by keyword: type "barcode" or "readBarcode" in search
3. Check "All" tab (not just "Log" tab)
4. Make sure you've taken a photo first

### Issue: Too many logs
**Solutions:**
1. Use Eruda's filter feature
2. Filter by log level: errors only, warnings, etc.
3. Use search: type "❌" or "✅" to find issues/successes

## 📸 Example Testing Workflow

1. **Open app with debug mode**:
   ```
   https://your-app.com/?debug=true
   ```

2. **Open Eruda console** (tap floating button)

3. **Clear console** (trash icon in Eruda)

4. **Take a photo of barcode**

5. **Check console logs** for detection results:
   - ✅ Success: You'll see recognized barcode value
   - ❌ Failure: Check which stage failed and why

6. **Share logs** (if needed):
   - Screenshot the console
   - Or copy console output

## 🗑️ How to Disable

### Temporary (current session):
Just remove `?debug=true` from URL and refresh

### Permanent (before production):
We'll remove eruda package and code before final release:
```bash
npm uninstall eruda
# Remove initDebugTool() code from App.tsx
```

## 📝 Notes

- **Performance**: Eruda adds ~500KB to bundle size (only loaded when enabled)
- **Privacy**: Don't share console logs containing sensitive data
- **Mobile-friendly**: Eruda is specifically designed for mobile debugging
- **Cross-browser**: Works on Safari iOS, Chrome Android, etc.

## 🎓 Advanced Tips

### Export logs for sharing:
1. Open Console tab
2. Tap "..." menu (top-right)
3. Select "Export"
4. Save or share the log file

### Inspect network requests:
1. Switch to "Network" tab
2. Take photo
3. See all API calls and responses

### Check device info:
1. Switch to "Info" tab
2. View device, browser, screen info
3. Useful for debugging device-specific issues

---

**Remember**: This tool is for **testing only**. It will be removed before production deployment.
