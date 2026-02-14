# Microsoft Login Testing Checklist

## Pre-Configuration Setup
- [ ] Configure Microsoft Azure AD app registration (see `MICROSOFT_SETUP.md`)
- [ ] Update `App.tsx` with your Microsoft credentials:
  ```typescript
  const MICROSOFT_CLIENT_ID = "your_client_id";
  const MICROSOFT_TENANT_ID = "common";
  const MICROSOFT_CLIENT_SECRET = "your_client_secret";
  const MICROSOFT_REDIRECT_URI = "http://localhost:3000/auth/callback";
  ```

## Application Build & Start
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `npm run build` - should complete without TypeScript errors
- [ ] Run `npm run dev` - development server should start successfully
- [ ] Open `http://localhost:3000` in browser

## UI Verification
- [ ] **Login Button Text**: All login buttons should show "Microsoft" instead of "Sign In"
- [ ] **Settings Screen**: Cloud Provider selector should be visible with options: None, OneDrive, Drive
- [ ] **Default Settings**: Cloud Provider should default to "OneDrive"
- [ ] **Storage Path Display**: Should show "OneDrive" instead of "Google Drive"

## Authentication Flow Testing
- [ ] Click any "Microsoft" login button
- [ ] Verify Microsoft OAuth popup window opens
- [ ] Complete Microsoft authentication (use test account)
- [ ] Verify popup closes and user is logged in
- [ ] Check user avatar and name display correctly
- [ ] Verify settings automatically set cloud provider to "OneDrive"

## Cloud Storage Integration
- [ ] With user logged in, go to Settings
- [ ] Verify Cloud Provider shows "OneDrive" as selected
- [ ] Test changing cloud provider to "None" or "Drive"
- [ ] Verify storage path preview updates correctly

## Logout Functionality
- [ ] Click user avatar to open user menu
- [ ] Click "Sign Out"
- [ ] Verify user is logged out and login buttons reappear
- [ ] Verify cloud provider resets to "None"

## Error Handling
- [ ] Test login with invalid Microsoft credentials (should fail gracefully)
- [ ] Test login when Microsoft services are unavailable
- [ ] Verify appropriate error messages are displayed

## Mobile Testing (Capacitor)
- [ ] Build mobile app: `npm run build:mobile`
- [ ] Test on iOS/Android device or simulator
- [ ] Verify login works in mobile environment
- [ ] Test camera and cloud sync functionality

## Cross-Browser Testing
- [ ] Test login flow in Chrome, Firefox, Safari, Edge
- [ ] Verify popup handling works across different browsers
- [ ] Test on mobile browsers

## Performance & Security
- [ ] Verify no console errors during login flow
- [ ] Check that tokens are properly stored/removed
- [ ] Verify no sensitive data is logged to console
- [ ] Test token refresh functionality (if implemented)

## Integration Testing
- [ ] Test complete photo capture workflow with OneDrive sync
- [ ] Verify automatic upload works after login
- [ ] Test manual sync functionality
- [ ] Verify logout properly clears all tokens and data

## Documentation Verification
- [ ] Review `MICROSOFT_LOGIN_INTEGRATION.md` for completeness
- [ ] Verify `README.md` correctly describes Microsoft setup
- [ ] Check that all configuration steps are clear

## Success Criteria
- [ ] All login buttons show "Microsoft"
- [ ] Microsoft authentication completes successfully
- [ ] User profile loads and displays correctly
- [ ] OneDrive integration works seamlessly
- [ ] No Google authentication code remains
- [ ] Application builds and runs without errors
- [ ] All UI text updated appropriately

## Troubleshooting
If issues occur:
1. Check browser console for JavaScript errors
2. Verify Microsoft app registration configuration
3. Ensure redirect URI matches exactly
4. Check network tab for failed API calls
5. Verify token storage in browser localStorage
6. Test with different Microsoft accounts

## Next Steps After Testing
- [ ] Deploy to production with proper Microsoft credentials
- [ ] Update any deployment documentation
- [ ] Notify users about the authentication change
- [ ] Monitor for any authentication-related issues</content>
<parameter name="filePath">c:\Work\Photo_App\MICROSOFT_LOGIN_TESTING.md