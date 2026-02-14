# 移动端开发快速开始 (5分钟)

快速设置 Photo Suite iOS 或 Android 开发环境。

## 前置检查 (1分钟)

### 系统要求检查

```bash
# 检查 Node.js 版本 (需要 16+)
node --version

# 检查 npm 版本 (需要 8+)
npm --version

# iOS 开发者需要：
xcode-select --install

# Android 开发者需要：
# 1. 安装 Java JDK 11 或更高
java -version

# 2. 设置 ANDROID_HOME 环境变量
# Windows:
# ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\sdk

# 3. 验证 Android SDK
ls $ANDROID_HOME/platforms
```

## 安装和初始化 (2分钟)

```bash
# 1. 克隆仓库
git clone https://github.com/luke7628/Photo_app.git
cd Photo_app

# 2. 安装依赖
npm install

# 3. 构建 web 资源
npm run build

# 4. 同步到移动平台
npm run sync:both
```

## 开发 iOS (1分钟)

```bash
# 打开 Xcode
npx cap open ios

# 或手动打开
open ios/App/App.xcworkspace
```

在 Xcode 中：
1. 选择你要运行的设备 (模拟器或真机)
2. 按 **Cmd + R** 编译并运行

## 开发 Android (1分钟)

```bash
# 打开 Android Studio
npx cap open android

# 或手动打开
open android
```

在 Android Studio 中：
1. 选择你要运行的设备 (模拟器或真机)
2. 按 **Shift + F10** 或点击 Run 构建并运行

## 日常开发工作流

### 如果你改动了 Web 代码

```bash
# 方式1：自动同步 (推荐)
npm run build && npm run sync:both

# 方式2：分步同步
npm run build
npm run sync:ios      # 仅同步 iOS
npm run sync:android  # 仅同步 Android

# 然后重新运行移动应用（Cmd+R 或 Shift+F10）
```

### 如果你改动了原生代码 (iOS/Android)

- **iOS:** 在 Xcode 中直接编辑 Swift 代码，Cmd+R 运行
- **Android:** 在 Android Studio 中直接编辑 Kotlin/Java 代码，Shift+F10 运行

### 调试

#### iOS 调试

- 打开 Safari
- 菜单 → Develop → 选择你的设备和应用
- 在控制台中查看日志和错误

#### Android 调试

- 打开 Android Studio
- View → Tool Windows → Logcat
- 查看实时日志和错误

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 生成生产构建 |
| `npm run build:mobile` | 构建并同步 web 资源 |
| `npm run sync:both` | 同步更改到两个平台 |
| `npm run sync:ios` | 仅同步 iOS |
| `npm run sync:android` | 仅同步 Android |
| `npx cap open ios` | 打开 Xcode |
| `npx cap open android` | 打开 Android Studio |

## 下一步

- 详细构建指南：查看 [MOBILE_BUILD_GUIDE.md](MOBILE_BUILD_GUIDE.md)
- 应用权限配置：见下面的 "权限配置"
- 云存储集成：参考 [ONEDRIVE_QUICKSTART.md](ONEDRIVE_QUICKSTART.md) 或 [MICROSOFT_SETUP.md](MICROSOFT_SETUP.md)

## 权限配置

### iOS 权限 (已自动配置)

Photo Suite 在 iOS 上需要以下权限：
- **Camera:** 拍照
- **Photo Library:** 访问相册
- **Internet:** 云端同步

这些权限在首次使用时会请求用户。

### Android 权限 (已自动配置)

Photo Suite 在 Android 上需要以下权限：
- **CAMERA:** 拍照
- **READ_EXTERNAL_STORAGE:** 访问媒体文件
- **WRITE_EXTERNAL_STORAGE:** 保存照片
- **INTERNET:** 云端同步

对于 Android 6.0+，应用会在运行时请求权限。

## 常见错误排查

| 错误 | 原因 | 解决方法 |
|------|------|---------|
| `Command not found: xcode-select` | Xcode 未安装 | `xcode-select --install` |
| `Gradle sync failed` | Android SDK 问题 | 打开 SDK Manager，更新 build-tools 和 platform |
| `Pod install failed` | CocoaPods 缓存问题 | `cd ios/App && pod repo update && pod install` |
| 应用显示空白 | Web 资源未同步 | 运行 `npm run sync:both` |
| 权限被拒绝 | 应用权限未授予 | 在设备设置中手动启用权限 |

## 需要帮助？

- 查看详细的 [MOBILE_BUILD_GUIDE.md](MOBILE_BUILD_GUIDE.md)
- 访问 [Capacitor 文档](https://capacitorjs.com/docs)
- 提交 Issue 到 [GitHub](https://github.com/luke7628/Photo_app/issues)
