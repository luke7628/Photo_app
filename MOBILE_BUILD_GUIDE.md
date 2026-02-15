# Photo Suite - 移动端构建指南

本指南说明如何为 iOS 和 Android 平台构建并部署 Photo Suite 应用。

目录：
- [iOS 构建和部署](#iOS-构建和部署)
- [Android 构建和部署](#Android-构建和部署)
- [Capacitor 命令参考](#Capacitor-命令参考)
- [常见问题](#常见问题)

---

## 前置要求

### 全局要求

- Node.js 16+ 和 npm 8+
- Git
- Photo Suite 仓库已克隆

### iOS 构建要求

- macOS (Xcode 12 或更高版本)
- Xcode Command Line Tools
- CocoaPods (可选，但推荐)
  ```bash
  sudo gem install cocoapods
  ```
- Apple 开发者账户 (用于真机测试和发布)

### Android 构建要求

- Java Development Kit (JDK) 11 或更高版本
- Android Studio 2021.1 或更高版本
- Android SDK (API level 31+)
- Android NDK (可选，但某些插件可能需要)
- Android 应用商店开发者账户 (用于发布)

---

## iOS 构建和部署

### 1. 构建 Web 资源并同步到 iOS

```bash
# 构建 web 资源
npm run build

# 同步到 iOS
npm run sync:ios

# 或一步完成
npm run ios:build
```

**输出：**
- Web 资源被复制到 `ios/App/App/public/`
- `capacitor.config.json` 被创建在 iOS 项目中

### 2. 使用 Xcode 打开 iOS 项目

```bash
# 打开 iOS 项目
npx cap open ios
```

或手动打开：
```bash
open ios/App/App.xcworkspace
```

**注意：** 必须打开 `.xcworkspace` 文件，而非 `.xcodeproj`

### 3. 在 Xcode 中配置签名

1. 在 Xcode 中选择 `App` 项目
2. 选择 `Targets > App`
3. 转到 `General` 标签
4. 在 `Signing & Capabilities` 中：
   - 选择你的开发团队
   - 设置 Bundle Identifier: `com.dematic.photosuite`

### 4. 选择构建目标

- **模拟器：** 选择 `iPhone 14 (或任意模拟器)`
- **真机：** 连接 iPhone，选择你的设备

### 5. 构建并运行

```bash
# 在 Xcode 中按下 Cmd + R 或
# 点击 Play 按钮
```

或使用 CLI：
```bash
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination generic/platform=iOS
```

### 6. iOS 发布构建

#### 6.1 配置版本号和信息

在 Xcode 中：
1. 选择 `App` 项目 > `General` 标签
2. 设置版本号 (Version)
3. 设置构建号 (Build)
4. 确保 Bundle Identifier 正确: `com.dematic.photosuite`

#### 6.2 创建 Archive

```bash
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -derivedDataPath build \
  archive
```

或在 Xcode 中：
1. 选择 `Product > Archive`
2. 等待完成

#### 6.3 上传到 App Store

1. 打开 Xcode Organizer (`Cmd + Shift + 2`)
2. 选择你的 Archive
3. 点击 `Distribute App`
4. 选择 `App Store Connect`
5. 按照步骤完成上传

### 需要的 iOS 权限

在 **ios/App/App/Info.plist** 中已配置：

```xml
<key>NSCameraUsageDescription</key>
<string>Photo Suite 需要访问相机以拍摄照片</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Photo Suite 需要访问相册以管理照片</string>

<key>NSPhotoLibraryAddOnlyUsageDescription</key>
<string>Photo Suite 需要权限保存照片到相册</string>
```

---

## Android 构建和部署

### 1. 构建 Web 资源并同步到 Android

```bash
# 构建 web 资源
npm run build

# 同步到 Android
npm run sync:android

# 或一步完成
npm run android:build
```

**输出：**
- Web 资源被复制到 `android/app/src/main/assets/public/`
- `capacitor.config.json` 被创建在 Android 项目中

### 2. 使用 Android Studio 打开项目

```bash
# 打开 Android 项目
npx cap open android
```

或手动打开：
```bash
# Windows
start android

# macOS / Linux
open android
```

### 3. 在 Android Studio 中配置项目

1. 打开 Android Studio
2. 文件 > 打开 > 选择 `android` 文件夹
3. 等待 Gradle 同步完成（可能需要时间下载依赖）
4. 连接 Android 设备或启动模拟器

### 4. 选择运行目标

- **模拟器：** Android Studio > Tools > AVD Manager，创建或启动一个虚拟设备
- **真机：** 连接 Android 手机（启用开发者模式和 USB 调试）

### 5. 构建并运行

```bash
# 使用 Gradle
./gradlew build  # 在 android 文件夹下

# 直接运行
./gradlew installDebug

# 或在 Android Studio 中按 Run (Shift + F10)
```

### 6. Android 发布构建

#### 6.1 生成签名密钥

```bash
keytool -genkey -v -keystore photo-suite.keystore \
  -alias photo-suite-release \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass your_password -keypass your_password
```

**注意：** 
- 将 `your_password` 替换为安全的密码
- 妥善保管 `photo-suite.keystore` 文件

#### 6.2 配置签名配置

在 **android/app/build.gradle** 中添加：

```gradle
android {
    // ... 其他配置

    signingConfigs {
        release {
            storeFile file('photo-suite.keystore')
            storePassword 'your_password'
            keyAlias 'photo-suite-release'
            keyPassword 'your_password'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 6.3 构建 Release APK

```bash
cd android
./gradlew assembleRelease
```

或 Bundle (推荐用于应用商店发布)：

```bash
./gradlew bundleRelease
```

**输出位置：**
- APK: `app/build/outputs/apk/release/app-release.apk`
- Bundle: `app/build/outputs/bundle/release/app-release.aab`

#### 6.4 上传到应用商店

1. 登录你的 Android 应用商店后台
2. 创建新应用或选择现有应用
3. 进入发布/版本管理页面
4. 上传你的 AAB 文件
5. 填写 Release notes
6. 检查并提交审核

### 需要的 Android 权限

在 **android/app/src/main/AndroidManifest.xml** 中已配置：

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

## Capacitor 命令参考

### 常用命令

```bash
# 构建 web 资源
npm run build

# 同步所有平台
npm run sync:both

# 同步特定平台
npm run sync:ios
npm run sync:android

# 打开特定平台的开发工具
npx cap open ios
npx cap open android

# 复制 web 资源到原生项目
npx cap copy

# 更新原生依赖
npx cap update

# 添加平台
npx cap add ios
npx cap add android

# 删除平台
npx cap remove ios
npx cap remove android
```

### 移动端开发工作流

1. **开发阶段：**
   ```bash
   npm run dev              # 启动 web 开发服务器
   # 或在另一个终端
   npm run sync:both        # 在保存文件时定期运行以同步更改
   ```

2. **测试阶段：**
   ```bash
   npm run build
   npm run sync:ios         # 更新 iOS
   npm run sync:android     # 更新 Android
   # 然后在各自的 IDE 中运行
   ```

3. **发布阶段：**
   ```bash
   npm run build           # 生成优化的构建
   # 然后按下面的说明提交到应用商店
   ```

---

## 常见问题

### iOS 相关

**Q: "Multiple commands produce file..." 错误**

A: 清除构建缓存：
```bash
rm -rf ios/App/Build/
npx cap sync ios
```

**Q: CocoaPods 依赖错误**

A: 更新 CocoaPods：
```bash
cd ios/App
pod repo update
pod install
```

**Q: Xcode 签名错误**

A: 
1. 在 Xcode 中清除旧签名证书
2. 重新选择开发团队
3. 清除派生数据：`rm -rf ~/Library/Developer/Xcode/DerivedData/*`

**Q: 在真机上测试时出现"Untrusted Enterprise Developer"**

A: 
1. 在 iOS 设备上，进入 Settings > General > Profiles & Device Management
2. 找到你的开发证书，点击 Trust

### Android 相关

**Q: Gradle 同步失败**

A: 
```bash
cd android
./gradlew clean
./gradlew sync
```

**Q: 权限在运行时被拒绝**

A: 应用会在首次需要时请求权限，也可以手动在 Settings 中启用

**Q: "Could not determine java version"**

A: 设置 JAVA_HOME 环境变量：
```bash
# Windows
set JAVA_HOME=C:\Program Files\Java\jdk-11

# macOS / Linux
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
```

**Q: Release 构建很大或运行缓慢**

A: 启用混淆和资源压缩：
```gradle
minifyEnabled true
shrinkResources true
```

### 跨平台问题

**Q: web 资源在构建后没有更新**

A: 明确清除缓存：
```bash
rm -rf dist/
npm run build
npm run sync:both
```

**Q: 某些 web 功能在移动端不工作**

A: 检查：
1. Capacitor 插件是否正确安装
2. 应用权限是否已在平台中配置
3. 浏览器控制台中是否有错误（使用 Android Studio logcat 或 Xcode 控制台）

---

## 性能优化

### Web 资源优化

修改 `vite.config.ts` 以获得更小的构建：

```typescript
export default {
  build: {
    minify: 'terser',
    target: ['chrome90', 'safari15'],
    rollupOptions: {
      output: {
        manualChunks: {
          'barcode': ['@zxing/library'],
          'vendor': ['react', 'react-dom']
        }
      }
    }
  }
}
```

### 运行时优化

在 app 初始化时：
```typescript
// 延迟加载非关键功能
const Camera = lazy(() => import('./services/cameraService'));
```

---

## 证书和签名更新

### iOS 证书轮换

每 1 年更新一次开发证书：
1. 在 Apple Developer 网站上撤销旧证书
2. 生成新证书
3. 在 Xcode 中更新团队签名
4. 重新构建存档

### Android 签名密钥管理

**保护密钥：**
- 将 `photo-suite.keystore` 存储在安全位置（不要提交到版本控制）
- 定期备份密钥文件
- 不要分享密钥密码

**密钥有效期：**
- 生成的密钥默认有效期为 10000 天 (~27 年)
- 在密钥过期前足够长的时间重新生成新密钥

---

## 支持和资源

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [iOS 开发指南](https://developer.apple.com/design/)
- [Android 开发指南](https://developer.android.com/guide)
- [Photo Suite GitHub](https://github.com/luke7628/Photo_app)
