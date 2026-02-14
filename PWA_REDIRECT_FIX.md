# PWA Home Screen Redirect Fix

## Problem Description
When users on iPhone save the web app to their home screen, the PWA would launch to `https://luke7628.github.io/Photo_app/assets/` instead of the correct homepage `https://luke7628.github.io/Photo_app/`, causing a 404 error.

## Root Cause
The issue was caused by two problems:

1. **Web App Manifest**: The `start_url` in `manifest.json` was set to `"."` which resolves to the current directory. When the manifest is served from `/assets/`, this becomes `/assets/`.

2. **Direct Access**: If users somehow access the assets folder directly, there was no fallback to redirect them to the main app.

## Solution Implemented

### 1. Fixed Web App Manifest (`manifest.json`)
```json
// Before
"start_url": ".",

// After
"start_url": "/Photo_app/",
```

This ensures that when the PWA is launched from the home screen, it always starts at the correct homepage URL.

### 2. Added Redirect Fallback (`public/assets/index.html`)
Created a redirect page in the assets folder that automatically redirects users to the main app if they access the assets folder directly.

```html
<script>
    // Redirect to main app if accessed directly
    if (window.location.pathname.endsWith('/assets/') || window.location.pathname.endsWith('/assets')) {
        window.location.href = '/Photo_app/';
    }
</script>
```

## Files Modified
- `manifest.json` - Updated start_url for PWA
- `public/assets/index.html` - Added redirect fallback

## Testing
After deployment, test on iPhone:
- [ ] Save web app to home screen
- [ ] Launch PWA from home screen
- [ ] Verify it opens to correct homepage, not assets folder
- [ ] Test direct access to `/assets/` URL redirects properly

## Technical Details
- The manifest file is processed by Vite during build and served from `/assets/` folder
- The `start_url` is now an absolute path that works regardless of where the manifest is served from
- The redirect fallback ensures users don't get stuck in the assets folder
- This fix works for both direct browser access and PWA home screen launches

## Prevention
- Always use absolute paths in PWA manifest start_url for GitHub Pages deployments
- Consider adding redirect fallbacks for any public subdirectories that shouldn't be accessed directly</content>
<parameter name="filePath">c:\Work\Photo_App\PWA_REDIRECT_FIX.md