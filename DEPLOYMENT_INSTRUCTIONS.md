# Deployment to GitHub Pages - Complete Guide

## Prerequisites
- Git installed and configured with GitHub credentials
- Node.js and npm installed
- Repository cloned locally

## Deployment Steps

### Step 1: Get Latest Code
```bash
# Clone or update the repository
git clone https://github.com/luke7628/Photo_app.git
cd Photo_app

# Or if you already have the repository, pull latest changes
git fetch origin
git pull origin main
```

### Step 2: Install Dependencies and Build
```bash
# Install dependencies
npm install

# Build the application
npm run build
```

### Step 3: Deploy to GitHub
```bash
# Push to GitHub (triggers automatic deployment via GitHub Actions)
git push origin main
```

### Step 4: Monitor Deployment
Check the deployment progress at:
**https://github.com/luke7628/Photo_app/actions**

GitHub Actions will automatically:
1. Detect the push to main branch
2. Install dependencies (npm install)
3. Build the application (npm run build)
4. Deploy to GitHub Pages

### Step 5: Access the Deployed App
After deployment completes (typically 2-3 minutes), visit:

**🌐 https://luke7628.github.io/Photo_app/**

## Testing on Mobile

### Method 1: Direct Browser Access
1. Open a browser on your mobile device (Chrome, Safari, etc.)
2. Visit: https://luke7628.github.io/Photo_app/
3. Test all functionality

### Method 2: Generate QR Code
Use any QR code generator with this URL:
```
https://luke7628.github.io/Photo_app/
```

Example QR code generator: https://www.qr-code-generator.com/

## Verification Checklist

### 1. Test Mobile UI
- ✓ All elements are appropriately sized
- ✓ Buttons are easy to click
- ✓ Text is clear and readable
- ✓ Project cards layout properly
- ✓ No elements overflow the screen

### 2. Test Barcode Recognition
- ✓ Capture photos of printer labels
- ✓ System recognizes label barcodes
- ✓ Serial numbers (SN) are extracted correctly
- ✓ Part numbers (PN) are extracted correctly
- ✓ QR codes are recognized

### 3. Test Cloud Integration
- ✓ Microsoft OneDrive login works
- ✓ Photo uploads work correctly
- ✓ File sync completes successfully

## Troubleshooting

### GitHub Actions Deployment Fails
**Solution**:
1. Check the error logs in the Actions tab
2. Ensure all dependencies in package.json are up-to-date
3. Run locally: `npm install` and `npm run build` to confirm no errors

### Page Shows 404
**Solution**:
1. Confirm GitHub Pages is enabled in repository settings
2. Check that source is set to "GitHub Actions"
3. Wait a few minutes for deployment to complete fully
4. Clear browser cache and retry

### Assets Not Loading (404 on /assets/)
**Solution**:
1. Check vite.config.ts has correct base path configuration
2. Confirm build script uses correct base URL
3. Rebuild and redeploy

### Mobile Display Issues
**Solution**:
1. Clear mobile browser cache
2. Force refresh the page (pull-down refresh)
3. Try a different browser (Chrome, Safari, Firefox)

## Quick Command Reference

```bash
# Local development
npm install
npm run dev

# Local build test
npm run build
npm run preview

# Deploy to GitHub Pages
git push origin main

# Check deployment status
# Visit: https://github.com/luke7628/Photo_app/actions
```

## Important Notes

1. **Pushing to main branch automatically triggers deployment**
2. **Deployment typically takes 2-3 minutes**
3. **You may need to clear browser cache to see the latest version**
4. **Use incognito/private mode on mobile for testing**

## Post-Deployment

### Next Steps
- [ ] Test in desktop browser
- [ ] Test in mobile browser
- [ ] Verify image capture functionality
- [ ] Test barcode recognition
- [ ] Test cloud synchronization

### Optional Enhancements
- [ ] Configure custom domain (if desired)
- [ ] Enable PWA support (manifest.json already configured)
- [ ] Enable Service Worker caching

## Need Help?

- GitHub Actions Logs: https://github.com/luke7628/Photo_app/actions
- GitHub Pages Settings: https://github.com/luke7628/Photo_app/settings/pages
- Report Issues: https://github.com/luke7628/Photo_app/issues

Happy deploying! 🚀
