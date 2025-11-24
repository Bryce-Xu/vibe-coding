#!/bin/bash
# Script to manually trigger deployment

SERVICE_NAME="nsw-park-ride-checker"
TOKEN="sk_62204bd8_77fbcf6cdd65c7f78eca6b93ded08709d29f"
API_URL="https://space.ai-builders.com/backend/v1/deployments"

# Read config from deploy-config.json
CONFIG_FILE="deploy-config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: $CONFIG_FILE not found"
  exit 1
fi

echo "🚀 开始手动触发部署..."
echo ""

# Extract values from deploy-config.json
REPO_URL=$(jq -r '.repo_url' "$CONFIG_FILE")
BRANCH=$(jq -r '.branch' "$CONFIG_FILE")
PORT=$(jq -r '.port' "$CONFIG_FILE")
ENV_VARS=$(jq -c '.env_vars' "$CONFIG_FILE")

echo "📋 部署配置:"
echo "   服务名称: $SERVICE_NAME"
echo "   仓库: $REPO_URL"
echo "   分支: $BRANCH"
echo "   端口: $PORT"
echo ""

# Prepare deployment payload
DEPLOY_PAYLOAD=$(jq -n \
  --arg repo_url "$REPO_URL" \
  --arg service_name "$SERVICE_NAME" \
  --arg branch "$BRANCH" \
  --argjson port "$PORT" \
  --argjson env_vars "$ENV_VARS" \
  '{
    repo_url: $repo_url,
    service_name: $service_name,
    branch: $branch,
    port: $port,
    env_vars: $env_vars
  }')

echo "📤 发送部署请求..."
echo ""

# Trigger deployment
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$DEPLOY_PAYLOAD")

# Split response and status code (compatible with macOS)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 202 ]; then
  echo "✅ 部署请求已成功提交！"
  echo ""
  echo "📊 响应信息:"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  echo "⏳ 部署正在进行中，请等待 5-10 分钟..."
  echo "   可以在部署平台查看部署状态"
else
  echo "❌ 部署请求失败 (HTTP $HTTP_CODE)"
  echo ""
  echo "错误信息:"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  exit 1
fi

