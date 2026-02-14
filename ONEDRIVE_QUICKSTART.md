# OneDrive 快速开始指南

## 5 分钟快速配置 Microsoft OneDrive

### 步骤 1：获取 Azure 凭证（5 分钟）

1. 打开 [Azure 门户](https://portal.azure.com)
2. 左侧菜单 → **Azure Active Directory** → **App registrations**（应用注册）
3. **+ New registration**（新注册）
   - 名称：`Photo Suite`
   - 账户类型：选择合适的选项（单租户/多租户）
   - Redirect URI：`http://localhost:3000/Photo_app/public/auth-callback.html`
   - **Register**（注册）

4. **复制这两个值：**
   - 应用程序（客户端）ID → **MICROSOFT_CLIENT_ID**
   - 目录（租户）ID → **MICROSOFT_TENANT_ID**

5. 左菜单 → **Certificates & secrets**（证书和密码）
   - **+ New client secret**
   - 过期时间：12 个月
   - 复制 **Value** → **MICROSOFT_CLIENT_SECRET**

### 步骤 2：添加 API 权限（3 分钟）

1. 左菜单 → **API permissions**（API 权限）
2. **+ Add a permission**
3. 搜索 **Microsoft Graph**
4. **Delegated permissions**（委托权限）
5. 勾选：
   - ✅ `Files.ReadWrite.All`
   - ✅ `User.Read`
   - ✅ `offline_access`
6. **Grant admin consent**（授予管理员同意）

### 步骤 3：更新应用代码（2 分钟）

在 [App.tsx](./App.tsx) 中找到并替换：

```typescript
// 第 40-43 行
const MICROSOFT_CLIENT_ID = "your_client_id_here";
const MICROSOFT_TENANT_ID = "your_tenant_id_here";
const MICROSOFT_CLIENT_SECRET = "your_client_secret_here";
// REDIRECT_URI 保持不变
```

### 步骤 4：启动和测试（即时）

```bash
npm run dev
```

1. 打开 `http://localhost:3000`
2. 点击 **Settings**（设置）
3. 找 **Cloud Provider**，选 **Microsoft OneDrive**
4. 点 **Login with Microsoft**
5. 完成登录流程
6. 开始上传照片到 OneDrive！

## 配置项说明

### 基本配置

| 配置 | 说明 | 必需 |
|-----|------|------|
| `MICROSOFT_CLIENT_ID` | Azure 应用 ID | ✅ |
| `MICROSOFT_TENANT_ID` | Azure 租户 ID | ✅ |
| `MICROSOFT_CLIENT_SECRET` | Azure 客户端密钥 | ✅ |
| `MICROSOFT_REDIRECT_URI` | 回调 URL | ✅ |

### 应用设置

在 Settings 中配置：

| 设置 | 说明 | 默认值 |
|-----|------|--------|
| **Cloud Provider** | 选择云存储服务 | none |
| **OneDrive Path** | 上传文件夹路径 | `/Dematic/FieldPhotos/` |
| **Use Subfolders by SN** | 按序列号创建文件夹 | enabled |
| **Auto Upload** | 自动上传照片 | enabled |

## 常见问题

### Q: 如何切换回 Google Drive？
A: Settings → Cloud Provider → Google Drive（需要事先配置 Google OAuth）

### Q: 如何同时使用两个云服务？
A: 目前应用只能选择一个，但代码已支持同时使用。可在 `performSyncCycle` 函数中修改逻辑。

### Q: OneDrive 上的文件夹在哪里？
A: 登录 OneDrive，在根目录找 `/Dematic/FieldPhotos/` 文件夹

### Q: 如何改变上传路径？
A: Settings → Drive Path，改为你想要的路径，如 `/Photos/` 或 `/MyProject/Images/`

### Q: 刷新 token 失败怎么办？
A: 可能是 refresh token 过期。重新登录即可。Token 自动保存在浏览器 localStorage 中。

## 生产部署

### 1. 更新 Redirect URI

Azure 门户中应用注册：
- 左菜单 → Authentication
- Redirect URIs 中添加：`https://yourdomain.com/Photo_app/public/auth-callback.html`

### 2. 使用环境变量

创建 `.env.production`：
```env
VITE_MICROSOFT_CLIENT_ID=your_prod_client_id
VITE_MICROSOFT_TENANT_ID=your_prod_tenant_id
```

更新代码使用环境变量而不是硬编码。

### 3. 后端代理（推荐）

不要在前端保存 Client Secret。改用后端代理：

```typescript
// 前端：请求授权码
const code = getAuthCodeFromRedirect();
const response = await fetch('/api/auth/microsoft', {
  method: 'POST',
  body: JSON.stringify({ code })
});
const { accessToken } = await response.json();
microsoftAuthService.accessToken = accessToken;
```

```python
# 后端（伪代码）
@app.post('/api/auth/microsoft')
def exchange_code(code):
    token = exchange_code_for_token(
        code=code,
        client_id=os.getenv('MICROSOFT_CLIENT_ID'),
        client_secret=os.getenv('MICROSOFT_CLIENT_SECRET')
    )
    return { 'accessToken': token['access_token'] }
```

## 更多信息

- 详细配置：[MICROSOFT_SETUP.md](./MICROSOFT_SETUP.md)
- Microsoft Graph 文档：[docs.microsoft.com/graph](https://docs.microsoft.com/graph)
- Azure AD 文档：[docs.microsoft.com/azure/active-directory](https://docs.microsoft.com/azure/active-directory)
