#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== 1. 清理可能误进 git 暂存区的依赖与敏感文件 ==="
git rm -r --cached node_modules 2>/dev/null || true
git rm -r --cached dist 2>/dev/null || true
git rm -r --cached dev-dist 2>/dev/null || true
git rm -r --cached .env 2>/dev/null || true
git rm -r --cached .DS_Store 2>/dev/null || true

echo "=== 2. 检查暂存并提交更新后的 .gitignore 与代码 ==="
git add .
if ! git diff --cached --quiet; then
  git commit -m "chore: clean dependencies and update .gitignore for studyplan2"
else
  echo "当前暂存区无新变动，跳过 commit。"
fi

echo "=== 3. 推送到 studyplan2.git ==="
# 默认推送到 main 分支
git push -u studyplan2 main

echo "✅ 上传完成！仓库地址: https://github.com/Payen08/studyplan2"
