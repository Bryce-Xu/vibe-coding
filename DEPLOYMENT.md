# 部署环境变量配置指南

## 如何在部署时注入环境变量

### 方法 1: 通过 deploy-config.json（推荐）

在 `deploy-config.json` 文件中添加 `env_vars` 字段：

```json
{
  "repo_url": "https://github.com/Bryce-Xu/vibe-coding.git",
  "service_name": "nsw-park-ride-checker",
  "branch": "main",
  "port": 8000,
  "env_vars": {
    "NODE_ENV": "production",
    "VITE_TFNSW_API_KEY": "your-api-key-here",
    "OTHER_VAR": "value"
  }
}
```

### 方法 2: 直接在 API 调用中传递

调用部署 API 时，在请求体中包含 `env_vars`：

```bash
curl -X POST "https://space.ai-builders.com/backend/v1/deployments" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/Bryce-Xu/vibe-coding.git",
    "service_name": "nsw-park-ride-checker",
    "branch": "main",
    "port": 8000,
    "env_vars": {
      "VITE_TFNSW_API_KEY": "your-api-key-here"
    }
  }'
```

## 重要说明

### 对于 Vite/React 静态应用

1. **构建时注入**: Vite 应用的环境变量需要在**构建时**注入，而不是运行时
2. **VITE_ 前缀**: 只有以 `VITE_` 开头的环境变量才会暴露给客户端代码
3. **Dockerfile 支持**: Dockerfile 已经配置为在构建时读取 `VITE_TFNSW_API_KEY` 环境变量

### 环境变量限制

- 最多 20 个环境变量
- 环境变量不会存储在平台数据库中（stateless design）
- `AI_BUILDER_TOKEN` 会自动注入，无需手动添加

### 安全建议

- **不要**将敏感信息提交到 Git 仓库
- 使用 `deploy-config.json` 管理环境变量，但确保它不会被提交（已添加到 .gitignore）
- 对于生产环境，考虑使用密钥管理服务

## 当前配置的环境变量

查看 `deploy-config.json` 文件了解当前配置的环境变量。

## 更新环境变量

如果需要更新环境变量：

1. 修改 `deploy-config.json` 中的 `env_vars`
2. 重新调用部署 API（使用相同的 service_name）
3. 部署系统会使用新的环境变量重新构建和部署

