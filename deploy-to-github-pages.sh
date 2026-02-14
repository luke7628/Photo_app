#!/bin/bash

# 部署到 GitHub Pages 的自动化脚本
# Deploy to GitHub Pages automation script

set -e  # Exit on error

echo "🚀 开始部署到 GitHub Pages..."
echo "🚀 Starting deployment to GitHub Pages..."
echo ""

# 检查是否在正确的分支
current_branch=$(git branch --show-current)
echo "📍 当前分支 / Current branch: $current_branch"

if [ "$current_branch" != "copilot/fix-serial-part-number-recognition" ]; then
    echo "⚠️  警告：不在预期的分支上"
    echo "⚠️  Warning: Not on expected branch"
    read -p "是否继续？Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📦 步骤 1/4: 确保所有更改已提交..."
echo "📦 Step 1/4: Ensuring all changes are committed..."
if [[ -n $(git status -s) ]]; then
    echo "⚠️  有未提交的更改 / Uncommitted changes found"
    git status -s
    read -p "是否提交这些更改？Commit these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Prepare for deployment to GitHub Pages"
    fi
fi
echo "✅ 所有更改已提交 / All changes committed"

echo ""
echo "🔄 步骤 2/4: 创建或切换到 main 分支..."
echo "🔄 Step 2/4: Creating or switching to main branch..."
if git show-ref --verify --quiet refs/heads/main; then
    echo "main 分支已存在，切换中... / main branch exists, switching..."
    git checkout main
    git merge $current_branch --no-edit
else
    echo "创建新的 main 分支... / Creating new main branch..."
    git checkout -b main
fi
echo "✅ 在 main 分支 / On main branch"

echo ""
echo "⬆️  步骤 3/4: 推送到 GitHub..."
echo "⬆️  Step 3/4: Pushing to GitHub..."
git push -u origin main
echo "✅ 推送完成 / Push complete"

echo ""
echo "⏳ 步骤 4/4: 等待 GitHub Actions 部署..."
echo "⏳ Step 4/4: Waiting for GitHub Actions deployment..."
echo ""
echo "🔗 查看部署进度 / View deployment progress:"
echo "   https://github.com/luke7628/Photo_app/actions"
echo ""
echo "🌐 部署完成后访问 / After deployment, visit:"
echo "   https://luke7628.github.io/Photo_app/"
echo ""
echo "📱 在手机上测试 / Test on mobile:"
echo "   1. 打开手机浏览器 / Open mobile browser"
echo "   2. 访问上面的链接 / Visit the URL above"
echo "   3. 测试所有功能 / Test all features"
echo ""
echo "✅ 部署脚本执行完成！"
echo "✅ Deployment script completed!"
echo ""
echo "💡 提示：部署通常需要 2-3 分钟"
echo "💡 Tip: Deployment usually takes 2-3 minutes"
