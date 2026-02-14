# Microsoft OneDrive 集成指南

本文档说明如何配置应用以支持 Microsoft 登录和 OneDrive 访问。

## 前置要求

- 一个有效的 Microsoft/Office 365 账户（个人或企业）
- Azure 门户访问权限
- 对 Azure AD 应用注册的基本理解

## 第一步：在 Azure 门户中注册应用

### 1. 访问 Azure 门户

打开 [https://portal.azure.com](https://portal.azure.com) 并使用你的 Microsoft 账户登录。

### 2. 创建新的应用注册

1. 在左侧菜单中，点击 **Azure Active Directory**
2. 选择 **App registrations**（应用注册）
3. 点击 **+ New registration**（新注册）

### 3. 填写注册信息

| 字段 | 值 |
|------|-----|
| **Name** | Photo Suite（或任何你喜欢的名称） |
| **Supported account types** | Accounts in this organizational directory only (Single tenant) **或** Multitenant - 取决于你的需求 |
| **Redirect URI** | Web - `http://localhost:3000/Photo_app/public/auth-callback.html` |

> ⚠️ **重注意**：如果是生产环境，将 `localhost:3000` 替换为你的实际域名。

点击 **Register**（注册）。

### 4. 保存应用凭证

在应用注册页面上，你会看到：
- **Application (client) ID** ← 复制这个
- **Directory (tenant) ID** ← 复制这个

在左侧菜单中，选择 **Certificates & secrets**（证书和密码）：
- 点击 **+ New client secret**
- 设置过期时间（建议 12 个月或更长）
- 复制显示的 **Value**（密码值）

> ⚠️ **重要**：立即保存这些值，刷新页面后将无法再看到密码。

## 第二步：配置 API 权限

### 1. 设置权限

在应用注册页面：
1. 选择 **API permissions**（API 权限）
2. 点击 **+ Add a permission**（添加权限）
3. 搜索 **Microsoft Graph**
4. 选择 **Delegated permissions**（委托权限）

### 2. 添加以下权限

搜索并添加下列权限：
- **Files.ReadWrite.All** - 允许读写用户的 OneDrive 文件
- **User.Read** - 允许读取用户基本信息
- **offline_access** - 允许使用刷新令牌

### 3. 授予管理员同意

如果你有全局管理员权限：
1. 点击 **Grant admin consent for [Your Directory]**（为目录授予管理员同意）
2. 确认操作

如果没有管理员权限，管理员稍后需要在 Azure 门户中授予同意。

## 第三步：配置应用

### 更新 App.tsx 中的常数

在 [App.tsx](../App.tsx) 中，找到以下行并替换为你的值：

```typescript
// MICROSOFT OneDrive SETUP
const MICROSOFT_CLIENT_ID = "YOUR_MICROSOFT_CLIENT_ID";           // 替换为你的 Client ID
const MICROSOFT_TENANT_ID = "YOUR_TENANT_ID";                     // 替换为你的 Tenant ID
const MICROSOFT_CLIENT_SECRET = "YOUR_MICROSOFT_CLIENT_SECRET";   // 替换为你的 Client Secret
const MICROSOFT_REDIRECT_URI = "http://localhost:3000/Photo_app/public/auth-callback.html";
```

**示例：**
```typescript
const MICROSOFT_CLIENT_ID = "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6";
const MICROSOFT_TENANT_ID = "x1y2z3a4-b5c6-7d8e-9f0g-h1i2j3k4l5m6";
const MICROSOFT_CLIENT_SECRET = "ns.7Q~abc...xyz_DEF~abc";
const MICROSOFT_REDIRECT_URI = "http://localhost:3000/Photo_app/public/auth-callback.html";
```

### 环境变量配置（可选）

如不想在代码中硬编码敏感信息，可以使用环境变量：

#### 创建 .env.local 文件

在项目根目录创建 `.env.local`：

```env
VITE_MICROSOFT_CLIENT_ID=your_client_id_here
VITE_MICROSOFT_TENANT_ID=your_tenant_id_here
VITE_MICROSOFT_REDIRECT_URI=http://localhost:3000/Photo_app/public/auth-callback.html
```

> ⚠️ **注意**：`VITE_` 前缀是必需的（Vite 约定），客户端密码应该在后端安全存储，不应在前端暴露。

#### 更新 vite.config.ts

```typescript
define: {
  'process.env.VITE_MICROSOFT_CLIENT_ID': JSON.stringify(env.VITE_MICROSOFT_CLIENT_ID),
  'process.env.VITE_MICROSOFT_TENANT_ID': JSON.stringify(env.VITE_MICROSOFT_TENANT_ID),
  'process.env.VITE_MICROSOFT_REDIRECT_URI': JSON.stringify(env.VITE_MICROSOFT_REDIRECT_URI),
}
```

## 第四步：测试登录

### 1. 启动开发服务器

```bash
npm run dev
```

应用将运行在 `http://localhost:3000`

### 2. 点击 Microsoft 登录

在应用中找到登录选项，点击 **Microsoft** 或 **OneDrive** 登录按钮。

### 3. 完成 OAuth 流程

1. 浏览器会打开 Microsoft 登录页面
2. 使用你的 Microsoft 账户登录
3. 应用会请求权限确认（读写 OneDrive 文件等）
4. 点击 **Accept**（接受）
5. 你会被重定向回应用，应该看到你的用户信息

### 常见问题排查

| 问题 | 解决方案 |
|------|---------|
| "Invalid client ID" | 检查你的 MICROSOFT_CLIENT_ID 是否正确复制 |
| "Redirect URI mismatch" | 确保 Redirect URI 在 Azure 和代码中完全一致 |
| "Invalid scope" | 确保已在 Azure 门户中添加了必需的 API 权限 |
| "Admin consent required" | 让你的 Azure 管理员在门户中授予管理员同意 |
| 登录后无法访问 OneDrive | 确保 "Files.ReadWrite.All" 权限已添加且已授予同意 |

## 使用 OneDrive 存储

登录后：

1. 在应用设置中，选择 **Cloud Provider** → **OneDrive**
2. 配置 **OneDrive Path**（默认为 `/Dematic/FieldPhotos/`）
3. 启用 **Auto Upload**（自动上传）
4. 应用会自动将照片同步到你的 OneDrive

### 文件夹结构

上传时会创建以下结构：

```
OneDrive
└── /Dematic
    └── /FieldPhotos
        └── /[Project Name]
            └── /[Serial Number]  (如果启用了按序列号分文件夹)
                └── [Photo Files]
```

## 生产环境部署

### 更新 Redirect URI

在 Azure 门户中的应用注册中：
1. 在 **Authentication** 中更新 Redirect URI
2. 替换为你的生产域名：
   ```
   https://yourdomain.com/Photo_app/public/auth-callback.html
   ```
3. 保存更改

### 使用后端代理进行客户端密码交换（推荐）

为了安全起见，不要在前端暴露客户端密码。相反：

1. 创建一个后端 API 端点来交换授权码
2. 前端调用你的后端端点，传入授权码
3. 后端使用客户端 ID 和密码与 Microsoft 交换令牌
4. 后端返回访问令牌给前端

### 启用 HTTPS

在生产环境中，总是使用 HTTPS：
- 配置 SSL/TLS 证书
- 确保所有 OAuth 流量都经过 HTTPS

## 参考资源

- [Microsoft Graph API 文档](https://docs.microsoft.com/graph)
- [Azure AD OAuth 2.0 文档](https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [OneDrive API 文档](https://docs.microsoft.com/onedrive/developer)
- [Vite 环境变量](https://vitejs.dev/guide/env-and-mode.html)

## 支持和反馈

如有问题，请：
1. 检查浏览器控制台日志（F12 → Console 标签）
2. 查看 Azure 门户中的应用日志
3. 参考上述参考资源
