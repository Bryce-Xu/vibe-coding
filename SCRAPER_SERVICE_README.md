# Scraper Service 独立服务说明

## 📍 位置

爬虫服务已经独立到 `scraper-service/` 文件夹中。

## 🎯 目的

将爬虫服务从主应用中分离，便于：
- 独立部署和扩展
- 独立版本管理
- 独立测试和维护
- 未来拆分为微服务

## 📁 结构

```
scraper-service/
├── src/                    # 源代码
│   ├── api.js             # Express API 服务器
│   └── scraper.js         # Puppeteer 爬取逻辑
├── docs/                   # 文档
│   ├── IMPLEMENTATION.md  # 实现细节
│   └── MIGRATION.md       # 迁移指南
├── ARCHITECTURE.md        # 架构文档
├── README.md              # 服务 README
├── SUMMARY.md             # 总结文档
├── Dockerfile             # Docker 配置
└── package.json           # 独立依赖配置
```

## 🚀 使用方式

### 方式 1: 作为独立服务运行

```bash
cd scraper-service
npm install
npm start
```

### 方式 2: 在主应用中运行（当前方式）

```bash
# 在主项目根目录
npm run dev
# 这会同时启动 scraper-service 和 vite
```

### 方式 3: Docker 独立部署

```bash
cd scraper-service
docker build -t scraper-service .
docker run -p 3001:3001 scraper-service
```

## 📚 文档

详细文档请查看 `scraper-service/` 文件夹：

- **README.md** - 快速开始
- **ARCHITECTURE.md** - 架构设计
- **docs/IMPLEMENTATION.md** - 实现细节
- **docs/MIGRATION.md** - 迁移指南

## 🔄 当前集成方式

主应用通过以下方式使用 Scraper Service：

1. **开发环境**: 
   - `npm run dev` 会启动 `scraper-service`
   - Vite 代理 `/api/scrape` 到 `http://localhost:3001`

2. **生产环境**:
   - Dockerfile 会同时运行 Scraper Service 和静态文件服务器
   - 或者可以独立部署 Scraper Service

## 📝 下一步

要完全拆分为独立应用：

1. 将 `scraper-service/` 移动到独立的 Git 仓库
2. 更新主应用的配置，指向独立的服务 URL
3. 独立部署和版本管理

详细步骤请参考 `scraper-service/docs/MIGRATION.md`。

