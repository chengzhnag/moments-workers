
# moments-workers

基於 Cloudflare Workers + Hono + React 的全棧開箱即用項目，用於記錄和分享美好瞬間 ✨

## 功能特點

- 📝 支持用戶註冊、登入、權限管理（管理員/普通用戶）
- 📸 圖片/文件上傳，文件存儲於 Cloudflare KV，支持 Telegram 雲端備份
- 🗂️ 記錄（posts）增刪改查，支持分頁
- 🔒 RESTful API，基於 Basic Auth 驗證
- ⚡ 前後端分離，前端基於 React + antd-mobile，後端基於 Hono 框架
- 🌍 跨域支持，適合多端部署
- 🛠️ 支持 Cloudflare D1 數據庫

## 技術棧

- Cloudflare Workers
- Hono (API 路由)
- React 18 / antd-mobile
- Cloudflare KV / D1 Database
- Vite 構建
- Telegram Bot API（文件備份）

## 快速開始

### 1. 克隆並安裝依賴

```bash
git clone https://github.com/chengzhnag/moments-workers.git
cd moments-workers
npm install
```

### 2. 配置環境

- 修改 `wrangler.json`，設置你的 Cloudflare 賬號、KV、D1、Telegram Bot Token 等。
- 主要環境變量：
	- `TG_BOT_TOKEN`：Telegram Bot Token
	- `TG_CHAT_ID`：Telegram 群組/用戶ID
	- `DOMAIN`：你的域名
	- `DB`：Cloudflare D1 數據庫綁定
	- `IMAGE`：Cloudflare KV 綁定

### 3. 本地開發

```bash
npm run dev
```

- 前端訪問：http://localhost:5173
- Worker API 本地訪問：http://localhost:8787/api/...

### 4. 構建與部署

```bash
npm run build
npx wrangler deploy
```

## API 說明

### 用戶相關

- `POST /api/auth` 用戶登錄（Basic Auth）
- `GET /api/users` 用戶列表（管理員）
- `POST /api/users` 新增用戶（管理員）
- `PUT /api/users/:id` 更新用戶（管理員）
- `DELETE /api/users/:id` 刪除用戶（管理員）

### 記錄（posts）

- `GET /api/records` 查詢記錄
- `POST /api/records` 新增記錄（管理員）
- `PUT /api/records/:id` 更新記錄（普通用戶）
- `DELETE /api/records/:id` 刪除記錄（管理員）

### 文件上傳

- `POST /api/upload-file` 上傳文件（支持圖片/視頻/音頻）
- `GET /api/file/:key` 下載文件
- `GET /api/file-info/:key` 查詢文件信息

## 前端入口

- 代碼位於 `src/react-app/`
- 路由、認證、API 請求已封裝，支持移動端體驗

## 其他

- 請確保 Cloudflare 賬號已開通 D1 和 KV 服務
- 所有 API 錯誤提示均為中文

---

如需更詳細的接口參數、數據結構或二次開發指引，請參考源碼或聯繫作者。
