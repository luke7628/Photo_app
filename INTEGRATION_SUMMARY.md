# Microsoft OneDrive 集成完整总结

## 📋 实现概述

Photo Suite 应用现已支持 **Microsoft OneDrive** 云存储集成，与现有的 Google Drive 并行工作。用户可在应用设置中选择云提供商。

## 🆕 新增文件

### 1. **核心服务**

#### [services/oneDriveService.ts](./services/oneDriveService.ts)
- OneDrive 文件操作 API 封装
- 功能：
  - 查找/创建文件夹
  - 上传图像文件
  - 管理文件路径层级
- 方法：
  - `setToken()` - 设置访问令牌
  - `findFolder(path)` - 按路径查找文件夹
  - `ensureFolder(path)` - 确保文件夹存在，不存在则创建
  - `uploadImage(base64, filename, folderId)` - 上传图像
  - `getRootInfo()` - 获取根文件信息

#### [services/microsoftAuthService.ts](./services/microsoftAuthService.ts)
- Microsoft Azure AD 认证处理
- 功能：
  - OAuth 2.0 授权码流程
  - Token 刷新机制
  - 用户信息获取
  - 登出处理
- 关键方法：
  - `getLoginUrl()` - 生成 Microsoft 登录 URL
  - `exchangeCodeForToken()` - 授权码换 Token
  - `refreshAccessToken()` - 刷新 Token
  - `getUserInfo()` - 获取用户信息
  - `logout()` - 清除所有认证信息

### 2. **认证回调页面**

#### [public/auth-callback.html](./public/auth-callback.html)
- OAuth 重定向处理页面
- 接收并转发授权码给主应用
- 支持新窗口和直接导航两种方式
- 自动关闭认证窗口

### 3. **文档**

#### [MICROSOFT_SETUP.md](./MICROSOFT_SETUP.md)
- 详细的 Azure 应用注册步骤
- API 权限配置指南
- 生产环境部署说明
- 常见问题解决方案

#### [ONEDRIVE_QUICKSTART.md](./ONEDRIVE_QUICKSTART.md)
- 5 分钟快速开始指南
- 关键配置项说明
- 常见问题 Q&A
- 生产部署最佳实践

## 🔄 修改的文件

### [App.tsx](./App.tsx)

**新增导入：**
```typescript
import { oneDriveService } from './services/oneDriveService';
import { microsoftAuthService, MicrosoftUser } from './services/microsoftAuthService';
```

**新增配置常数：**
```typescript
const MICROSOFT_CLIENT_ID = "YOUR_MICROSOFT_CLIENT_ID";
const MICROSOFT_TENANT_ID = "common";
const MICROSOFT_CLIENT_SECRET = "YOUR_MICROSOFT_CLIENT_SECRET";
const MICROSOFT_REDIRECT_URI = "http://localhost:3000/auth/callback";
```

**新增状态：**
```typescript
const [isMicrosoftReady, setIsMicrosoftReady] = useState(false);
// settings 中新增 cloudProvider 字段
```

**新增函数：**
- `analyzeWithBarcode()` - 条形码识别（已有）
- `handleMicrosoftLogin()` - Microsoft 登录处理
- `initMicrosoft()` - 初始化 Microsoft（检查缓存 token）

**优化的 performSyncCycle()：**
- 支持根据 `settings.cloudProvider` 选择 Google Drive 或 OneDrive
- 自动判断哪个 token 可用
- 两个系统的文件夹结构和上传逻辑一致

### [types.ts](./types.ts)

**UserPreferences 接口更新：**
```typescript
interface UserPreferences {
  // ... 原有字段 ...
  cloudProvider?: 'none' | 'drive' | 'onedrive';
}

// Printer 接口新增：
interface Printer {
  // ... 原有字段 ...
  partNumber?: string;
}
```

## 🔐 安全考虑

### 前端（当前实现）
✅ **适合：**
- 开发和测试环境
- 个人使用
- 客户端 ID（公开信息）

❌ **不适合生产：**
- 客户端密钥硬编码在前端代码中

### 生产环境建议  
使用后端代理处理 token 交换：

```
前端                        后端                    Microsoft
  │                          │                          │
  ├──── 授权码 ──────────────>│                          │
  │                          ├──── 授权码 + 密钥 ──────>│
  │                          │<──── Access Token ──────┤
  │<──── Access Token ────────┤                          │
  │                          │                          │
```

这样客户端密钥永远不会被暴露。

## 🎯 使用流程

### 1. 用户登录
```
用户点击 "Login with Microsoft"
  ↓
生成登录 URL → 重定向到 Microsoft
  ↓
用户在 Microsoft 页面登录和授权
  ↓
Microsoft 重定向到 /auth/callback → 获取授权码
  ↓
前端使用授权码交换 access token
  ↓
保存 token 到 microsoftAuthService 和 localStorage
  ↓
获取用户信息，更新 UI 显示用户已登录
```

### 2. 自动上传照片
```
用户拍照并确认
  ↓
如果 cloudProvider === 'onedrive' 且有 token
  ↓
performSyncCycle 触发
  ↓
1. 确保文件夹结构（/Dematic/FieldPhotos/[Project]/[SerialNumber]）
2. 上传照片到文件夹
3. 标记为已同步
  ↓
同步完成
```

### 3. 切换云提供商
```
Settings → Cloud Provider
  ↓
选择 Google Drive 或 OneDrive
  ↓
导出/导入 token（如果有）
  ↓
后续上传使用选定的服务
```

## 📊 文件夹结构对比

### Google Drive
```
My Drive
└── Dematic Field Photos/
    └── Project A/
        └── 99J2037011108/
            └── photos...
```

### OneDrive
```
OneDrive
└── Dematic/
    └── FieldPhotos/
        └── Project A/
            └── 99J2037011108/
                └── photos...
```

> 两个系统自动保持相同的逻辑结构

## 🔧 配置清单

### 开发环境
- [ ] 在 Azure 门户注册应用
- [ ] 获取 Client ID、Tenant ID、Client Secret
- [ ] 配置 API 权限（Files.ReadWrite.All, User.Read）
- [ ] 更新 App.tsx 中的配置常数
- [ ] 测试登录流程
- [ ] 测试照片上传

### 生产环境
- [ ] 为生产环境注册新的 Azure 应用
- [ ] 更新 Redirect URI 为生产域名
- [ ] 使用环境变量而不是硬编码常数
- [ ] **优先**：实现后端代理处理 token 交换
- [ ] 启用 HTTPS
- [ ] 配置 CORS（如使用单独后端）
- [ ] 进行完整的安全审计

## 🚀 快速开始

1. **配置**：按照 [ONEDRIVE_QUICKSTART.md](./ONEDRIVE_QUICKSTART.md) 中的 5 个步骤
2. **启动**：`npm run dev`
3. **登录**：点击 "Login with Microsoft"
4. **上传**：开始拍照，自动同步到 OneDrive

## 📚 相关资源

- [Microsoft Graph API 文档](https://docs.microsoft.com/graph)
- [Azure AD OAuth 2.0 授权码流](https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [OneDrive REST API](https://docs.microsoft.com/onedrive/developer)
- [MSAL.js 文档](https://github.com/AzureAD/microsoft-authentication-library-for-js)

## ✅ 测试清单

```
功能测试
├─ [ ] Microsoft 登录
├─ [ ] 获取用户信息
├─ [ ] 创建文件夹
├─ [ ] 上传图像
├─ [ ] 自动同步
├─ [ ] 切换云提供商
├─ [ ] 登出清除 token
└─ [ ] 刷新 token（长期使用）

边界情况
├─ [ ] 网络中断后恢复
├─ [ ] Token 过期处理
├─ [ ] 同时登录两个账户
├─ [ ] 删除已同步照片
└─ [ ] 修改文件夹路径后同步

安全测试
├─ [ ] Token 不会泄露到控制台日志
├─ [ ] localStorage 中的 token 正确加密（可选）
├─ [ ] CORS 配置正确
└─ [ ] 敏感信息不在客户端暴露
```

## 🎓 架构设计说明

### 为什么分离 Auth 和 Drive 服务？
- **关注点分离**：认证逻辑与存储逻辑独立
- **代码复用**：其他地方需要 OneDrive 时无需重复
- **易于测试**：可单独 mock 每个服务
- **可维护性**：修改认证不影响存储逻辑

### 为什么同时保留 Google Drive 和 OneDrive？
- **用户选择**：支持多种场景（个人用户 vs 企业用户）
- **平滑迁移**：用户可在两个系统间切换而不丢失设置
- **企业适应**：一些企业只能用 OneDrive（Microsoft 生态）
- **备用方案**：如一个服务出问题，可快速切换

### Token 缓存策略
- **localStorage**：在浏览器刷新后保持登录状态
- **内存**：快速访问，避免每次重复读取 localStorage
- **自动清理**：登出时同时清除两个位置

## 已知限制

1. **前端 Client Secret**：目前硬编码（开发用），生产环境应改用后端代理
2. **单账户登录**：目前只支持一个 Microsoft 账户（可扩展以支持多账户）
3. **Token 刷新**：当 refresh token 过期需要重新登录
4. **单云提供商**：一次只能选择一个（代码支持同时使用，UI 未实现）

## 🔮 未来改进方向

- [ ] 支持同时使用多个云服务
- [ ] 批量导出/导入设置到另一个云
- [ ] 云端照片删除同步
- [ ] 团队协作（多用户同时编辑）
- [ ] 版本控制和恢复
- [ ] 高级搜索和分类
- [ ] 灾难恢复和备份

---

**集成完成日期**：2026年2月14日  
**版本**：1.0.0  
**维护者**：Photo Suite Team
