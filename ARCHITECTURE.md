# OneDrive 集成架构图

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Photo Suite App                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐              ┌──────────────────┐                 │
│  │   UI Components  │              │   Settings       │                 │
│  ├──────────────────┤              ├──────────────────┤                 │
│  │ • SplashScreen   │              │ • Cloud Provider │                 │
│  │ • CameraScreen   │              │ • Drive Path     │                 │
│  │ • GalleryScreen  │              │ • Auto Upload    │                 │
│  │ • ReviewScreen   │◄─────────────┤ • File Structure │                 │
│  │ • SettingsScreen │              │                  │                 │
│  └────────┬─────────┘              └──────────────────┘                 │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────┐                          │
│  │          App.tsx (State Management)      │                          │
│  ├──────────────────────────────────────────┤                          │
│  │ • user (MicrosoftUser)                  │                          │
│  │ • cloudProvider = 'none' | 'onedrive'   │                          │
│  │ • handleLogin()                          │                          │
│  │ • handleMicrosoftLogin()                 │                          │
│  │ • performSyncCycle()                     │                          │
│  │ • analyzeWithBarcode()                   │                          │
│  └──┬──────────────────────────────────────┤                          │
│     │                                       │                          │
└─────┼───────────────────────────────────────┼──────────────────────────┘
      │                                       │
      ▼                                       ▼
   ┌───────────────────────────────────────────────────────┐
   │            Service Layer                              │
   ├───────────────────────────────────────────────────────┤
   │                                                         │
       │  ┌─────────────────────┐    ┌─────────────────────┐   │
       │  │ oneDriveService     │    │ microsoftAuthService│   │
       │  ├─────────────────────┤    ├─────────────────────┤   │
       │  │ • accessToken       │    │ • accessToken       │   │
       │  │ • findFolder()      │    │ • getLoginUrl()     │   │
       │  │ • ensureFolder()    │    │ • exchangeCode()    │   │
       │  │ • uploadImage()     │    │ • refreshToken()    │   │
       │  │ • getRootInfo()     │    │ • getUserInfo()     │   │
       │  └──────────┬──────────┘    └──────────┬──────────┘   │
       │             │                          │               │
       │  ┌─────────────────────┐                              │
   │  │ microsoftAuthService│    │ barcodeService      │   │
   │  ├─────────────────────┤    ├─────────────────────┤   │
   │  │ • accessToken       │    │ • readBarcode()     │   │
   │  │ • getLoginUrl()     │    │ • readQRCode()      │   │
   │  │ • exchangeCode()    │    │ • resetReader()     │   │
   │  │ • refreshToken()    │    │                     │   │
   │  │ • getUserInfo()     │    │ [ZXing + jsQR]      │   │
   │  │ • logout()          │    │ [Offline]           │   │
   │  └──────────┬──────────┘    └─────────────────────┘   │
   │             │                                         │
   └─────────────┼─────────────────────────────────────────┘
                 │
                 ▼
   ┌───────────────────────────────────────────────────────┐
   │         External APIs / Storage                        │
   ├───────────────────────────────────────────────────────┤
   │                                                         │
       │  ┌─────────────────────┐                              │
       │  │  Microsoft         │                              │
       │  │  Azure AD (OAuth)  │                              │
       │  │  login.microsoft   │                              │
       │  │  .com              │                              │
       │  └─────────────────────┘                              │
       │                                                       │
       │  ┌─────────────────────┐                              │
       │  │  OneDrive          │                              │
       │  │  graph.microsoft   │                              │
       │  │  .com              │                              │
       │  │  (Files REST API)  │                              │
       │  └─────────────────────┘                              │
   │                                                         │
   └───────────────────────────────────────────────────────┘
```

## 认证流程

### Microsoft OAuth 2.0 授权码流程

```
┌──────────┐                 ┌──────────────────────┐
│  User    │                 │  Photo Suite App     │
│ (Browser)│                 │                      │
└────┬─────┘                 └──────┬───────────────┘
     │                              │
     │  1. Click "Login with MS"    │
     │◄─────────────────────────────│
     │                              │
     │  2. Redirect to login URL    │
     │─────────────────────────────►│ getLoginUrl(clientId, redirectUri)
     │                              │
     ├──────────────────────────────┤
     │                              │
     │  3. Opens Microsoft login    │
     │   window.open(loginUrl)      │
     │                              │
     │  4. User logs in & authorizes
     │                              │
     ├──────────────────────────────┤
     │                              │
     │  5. Redirect to callback     │
     │  /auth/callback?code=AUTH123 │
     │◄─────────────────────────────│ Microsoft
     │                              │
     │  6. Extract code             │
     │  localStorage['code']        │
     │                              │
     │  7. Sends code to main app   │
     │ postMessage({code})          │
     ├──────────────────────────────┤
     │                              │
     │  8. Exchange code for token  │
     │  exchangeCodeForToken(code)  │
     │────────────────────────────► │
     │                              │
     │◄─ POST /token               │ POST to Microsoft
     │   (id + code + secret)       │
     │                              │
     │◄──────────────────────────────│
     │  Returns: access_token       │
     │           refresh_token      │
     │           id_token           │
     │                              │
     │  9. Save tokens              │
     │   localStorage, memory       │
     │                              │
     │  10. Get user info           │
     │   GET /me (Microsoft Graph)  │
     │────────────────────────────► │
     │                              │
     │◄──────────────────────────────│
     │  Returns: name, email        │
     │                              │
     │  11. Update UI               │
     │  Show user info              │
     │                              │
     ├──────────────────────────────┤
     │                              │
     │  ✅ User is logged in        │
     │                              │
```

## 文件同步流程

```
┌──────────────┐
│ User Takes   │
│ Photo        │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ CameraScreen         │
│ • Capture image      │
│ • Show in ReviewScreen
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ ReviewScreen         │
│ • Auto-recognize SN  │
│ • Show barcode result
│ • User confirms      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ processConfirmation()│
│ • Store photo locally
│ • Mark isSynced=false
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ performSyncCycle()   │
│ (5s interval)        │
└──────┬───────────────┘
       │
       ▼
  ┌────────────────────────────────┐
  │ Check CloudProvider setting    │
  └───┬──────────────────────┬─────┘
      │                      │
       "onedrive"
              │
              ▼
 ┌─────────────────┐
 │ Microsoft Graph │
 │ (OneDrive API)  │
 └────────┬────────┘
                      │
                      ▼
┌─────────────────────────────────────┐
│ 1. Ensure Folder Structure:         │
│    /Dematic/FieldPhotos/            │
│      └─ Project Name/               │
│         └─ Serial Number/           │
│            (if enabled)             │
└──────────┬────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 2. Upload Photo                     │
│    • Convert Base64 → Blob          │
│    • REST API POST                  │
│    • Mark isSynced=true             │
└──────────┬────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 3. Update UI                        │
│    • Update syncedCount             │
│    • Show last sync time            │
│    • Display success message        │
└─────────────────────────────────────┘
           │
           ▼
        ✅ Sync Complete
```

## 数据存储架构

```
┌─────────────────────────────────────────────────────────┐
│              Browser Storage                             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Local Storage (Key-Value Pairs)                        │
│  ├─ 'user'                      → MicrosoftUser object  │
│  ├─ 'microsoft_access_token'     → Token string        │
│  ├─ 'microsoft_id_token'         → ID token           │
│  ├─ 'microsoft_refresh_token'    → Refresh token      │
│  ├─ 'projects'                  → Project[] JSON      │
│  ├─ 'printers'                  → Printer[] JSON      │
│  ├─ 'settings'                  → Settings JSON       │
│  │                                                     │
│  Memory (JavaScript Variables)                         │
│  ├─ microsoftAuthService.accessToken → Current token  │
│  ├─ oneDriveService.accessToken      → Current token  │
│  │                                                     │
│  IndexedDB (Larger Data)                              │
│  ├─ 'printers' store → Printer photos (Base64)       │
│  │   • photo.url (Base64 image)                       │
│  │   • photo.filename                                 │
│  │   • photo.isSynced                                 │
│  │                                                     │
└─────────────────────────────────────────────────────────┘

                          ↓

┌─────────────────────────────────────────────────────────┐
│              Cloud Storage (OneDrive)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  OneDrive Folder Structure:                            │
│  /Dematic/                                              │
│  └─ FieldPhotos/                                        │
│     └─ Project Alpha/                                   │
│        ├─ 99J2037011108/         (SN folder)          │
│        │  ├─ ZT411_SN_1.jpg      (photo 1)           │
│        │  ├─ ZT411_SN_2.jpg      (photo 2)           │
│        │  └─ ...                                       │
│        │                                               │
│        └─ 99J2037011109/         (Another printer)    │
│           └─ ...                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 状态转换图

```
                    ┌──────────────┐
                    │  Not Logged  │
                    │    In        │
                    └──────┬───────┘
                           │
                           │ Click "Login"
                           │
       ┌────────────────────────────┐
       │ Microsoft Auth Window Opens│
       └──────────────┬─────────────┘
                     │
                     │ Grant Permission
                     │
                     ▼
            ┌──────────────────────────────┐
            │   ✅ User Logged In          │
            │  (cloudProvider selected)    │
            └──────────────┬───────────────┘
                           │
                         │
                         ▼
                  ┌──────────┐
                  │Microsoft │
                  │ OneDrive │
                  │ Syncing  │
                  └────┬─────┘
                      │
              ┌────────┴───────┐
              │                │
         ┌─────▼──────┐  ┌──────▼────┐
         │Photos      │  │ Photos    │
         │Synced ✅   │  │Uploading  │
         └────────────┘  └───────────┘

             Click "Logout"
              │
              ▼
            ┌──────────────────┐
            │ Clear tokens     │
            │ SignOut user     │
            │ Reset provider   │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │  Not Logged In   │
            └──────────────────┘
```

## API 调用流程

### 创建文件夹（OneDrive）

```
App.tsx performSyncCycle()
    │
    ├─► oneDriveService.ensureFolder()
    │   │
    │   ├─► findFolder()
    │   │   │
    │   │   └─► GET /me/drive/items/{itemId}/children?filter=name eq '{folderName}'
    │   │       │
    │   │       ├─ 存在 ──► return itemId
    │   │       │
    │   │       └─ 不存在
    │   │           │
    │   │           └─► createFolder()
    │   │               │
    │   │               └─► POST /me/drive/items/{parentId}/children
    │   │                   { name: folderName, folder: {} }
    │   │                   │
    │   │                   └─ 201 Created ──► return itemId
    │   │
    │   └─► return targetFolderId
    │
    └─ 继续上传流程
```

### 上传图像（OneDrive）

```
oneDriveService.uploadImage()
    │
    ├─ 转换 Base64 → Blob
    │
    ├─ PUT /me/drive/items/{folderId}:/{filename}:/content
    │  │
    │  ├─ Headers: Authorization: Bearer {accessToken}
    │  │
    │  ├─ Body: Binary image data
    │  │
    │  └─ 200 OK
    │     │
    │     └─ Response: { id, webUrl, name }
    │
    └─ return { id, webUrl, name }
```

## Token 刷新机制

```
┌─────────────────────────────────────┐
│ API 调用失败 (401 Unauthorized)      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 检查 isAccessTokenExpired()         │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   过期           未过期
      │             │
      ▼             ▼
  调用         直接返回
refreshToken  错误/404

      │
      ▼
┌─────────────────────────────────────┐
│ refreshAccessToken()                │
│ • 使用 refresh_token               │
│ • POST /token                       │
│ • 获取新 access_token              │
│ • 更新 localStorage               │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   成功           失败
      │             │
      ▼             ▼
  重试API      提示用户
  调用        重新登录
```

---

本架构文档提供了应用的完整技术视图，包括组件通信、数据流和 API 调用机制。
