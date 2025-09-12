
# moments-workers

基于 Cloudflare Workers + Hono + React 的全栈开箱即用项目，用于记录和分享美好瞬间 ✨

## 功能特点

- 📝 支持用户注册、登录、权限管理（管理员/普通用户）
- 📸 图片/文件上传，文件存储于 Cloudflare KV，支持 Telegram 云端备份
- 🗂️ 记录（posts）增删改查，支持分页
- 🔒 RESTful API，基于 Basic Auth 验证
- ⚡ 前后端分离，前端基于 React + antd-mobile，后端基于 Hono 框架
- 🌍 跨域支持，适合多端部署
- 🛠️ 支持 Cloudflare D1 数据库

## 技术栈

- Cloudflare Workers
- Hono (API 路由)
- React 18 / antd-mobile
- Cloudflare KV / D1 Database
- Vite 构建
- Telegram Bot API（文件备份）

## 快速开始

### 1. 克隆并安装依赖

```bash
git clone https://github.com/chengzhnag/moments-workers.git
cd moments-workers
npm install
```

### 2. 配置环境

- 修改 `wrangler.json`，设置你的 Cloudflare 账号、KV、D1、Telegram Bot Token 等。
- 主要环境变量：
	- `TG_BOT_TOKEN`：Telegram Bot Token
	- `TG_CHAT_ID`：Telegram 群组/用户ID
	- `DOMAIN`：你的域名
	- `DB`：Cloudflare D1 数据库绑定
	- `IMAGE`：Cloudflare KV 绑定

### 3. 本地开发

```bash
npm run dev
```

- 前端访问：http://localhost:5173
- Worker API 本地访问：http://localhost:8787/api/...

### 4. 构建与部署

```bash
npm run build
npx wrangler deploy
```

## API 说明

### 用户相关

- `POST /api/auth` 用户登录（Basic Auth）
- `GET /api/users` 用户列表（管理员）
- `POST /api/users` 新增用户（管理员）
- `PUT /api/users/:id` 更新用户（管理员）
- `DELETE /api/users/:id` 删除用户（管理员）

### 记录（posts）

- `GET /api/records` 查询记录
- `POST /api/records` 新增记录（管理员）
- `PUT /api/records/:id` 更新记录（普通用户）
- `DELETE /api/records/:id` 删除记录（管理员）

### 文件上传

- `POST /api/upload-file` 上传文件（支持图片/视频/音频）
- `GET /api/file/:key` 下载文件
- `GET /api/file-info/:key` 查询文件信息

## 前端入口

- 代码位于 `src/react-app/`
- 路由、认证、API 请求已封装，支持移动端体验

## 其他

- 请确保 Cloudflare 账号已开通 D1 和 KV 服务

---

如需更详细的接口参数、数据结构或二次开发指引，请参考源码或联系作者。
