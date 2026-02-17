# GitHub Actions 设置指南

## 必需的 Secrets 配置

在 GitHub Repository 的 Settings → Secrets and variables → Actions 中配置以下 secrets：

### 1. Microsoft Azure 应用配置
```
VITE_MICROSOFT_CLIENT_ID
VITE_MICROSOFT_TENANT_ID  
VITE_MICROSOFT_REDIRECT_URI
```

### 获取这些值的步骤：

1. 访问 [Azure Portal](https://portal.azure.com)
2. 进入 "Azure Active Directory" → "App registrations"
3. 创建或选择一个应用
4. 从概览页面复制：
   - **Application (client) ID** → VITE_MICROSOFT_CLIENT_ID
   - 如果使用特定租户，复制 **Directory (tenant) ID** → VITE_MICROSOFT_TENANT_ID
   - 确认 **Redirect URI** 设置为应用部署地址 → VITE_MICROSOFT_REDIRECT_URI

## GitHub Pages 配置

1. 进入 Repository Settings → Pages
2. **Source** 选择: "Deploy from a branch"
3. **Branch** 选择: "gh-pages / root"
4. 保存配置

系统会自动创建 `gh-pages` 分支来部署应用。

## 工作流状态检查

- **deploy.yml**: 自动构建和部署到 GitHub Pages（main 推送时）
- **test.yml**: 验证构建（PR 和 main 推送时）

## 调试常见问题

### 问题1：找不到 gh-pages 分支
**原因**: 首次部署还未完成
**解决**: 等待第一次工作流完成后刷新

### 问题2：部署失败 "permission denied"
**原因**: Repository settings 中未启用 GitHub Pages
**解决**: 进入 Settings → Pages → 启用部署

### 问题3：构建失败 "module externalized for browser"
**原因**: Quagga2 库的浏览器兼容性警告
**解决**: 这是警告而非错误，可以忽略

### 问题4：环境变量未定义
**原因**: Secrets 未配置或名称错误
**解决**: 检查 Secrets 配置是否与工作流中的变量名完全匹配

## 本地测试工作流

```bash
# 验证 Node.js 缓存配置
npm ci

# 本地构建测试
npm run build

# 检查构建输出
ls -la dist/
```

## 部署流程

1. 提交代码到 main 分支
2. GitHub Actions 自动触发 deploy.yml
3. 构建完成后自动部署到 GitHub Pages
4. 访问 `https://luke7628.github.io/Photo_app/` 查看应用

## 监控部署

- 进入 Repository → Actions 标签页
- 查看最近的工作流运行状态
- 点击工作流查看详细日志
