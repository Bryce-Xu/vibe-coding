#!/bin/bash
# Script to check which commit corresponds to a deployment

SERVICE_NAME="nsw-park-ride-checker"
TOKEN="sk_62204bd8_77fbcf6cdd65c7f78eca6b93ded08709d29f"

echo "=== 检查部署对应的 Commit ==="
echo ""

# Get deployment info
DEPLOY_INFO=$(curl -s -X GET "https://space.ai-builders.com/backend/v1/deployments/$SERVICE_NAME" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

DEPLOY_TIME=$(echo "$DEPLOY_INFO" | jq -r '.last_deployed_at')
BRANCH=$(echo "$DEPLOY_INFO" | jq -r '.branch')

echo "部署时间: $DEPLOY_TIME"
echo "分支: $BRANCH"
echo ""

# Convert UTC to local time for git log
# Deployment time is in UTC, need to convert to +11:00 for git log
DEPLOY_UTC=$(echo "$DEPLOY_TIME" | sed 's/T/ /' | sed 's/\.[0-9]*$//')
echo "部署时间 (UTC): $DEPLOY_UTC"
echo ""

# Find commits before deployment time
echo "=== 部署时 main 分支的最新 commit ==="
git log origin/main --until="$DEPLOY_UTC +0000" --format="%H|%ai|%s" -1

echo ""
echo "=== 完整 commit 信息 ==="
COMMIT_HASH=$(git log origin/main --until="$DEPLOY_UTC +0000" --format="%H" -1)
if [ -n "$COMMIT_HASH" ]; then
  git show "$COMMIT_HASH" --stat --oneline
else
  echo "无法找到对应的 commit"
fi
