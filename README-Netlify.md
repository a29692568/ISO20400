# 違反勞動法令事業單位查詢系統 - Netlify 部署指南

## 📋 系統概述

本系統是一個整合勞動基準法、性別工作平等法、最低工資法裁處資料的查詢平台，採用現代化的 Serverless 架構部署在 Netlify 平台上。

## 🚀 部署到 Netlify

### 方法一：GitHub 自動部署（推薦）

1. **準備檔案結構**
   ```
   ISO20400/
   ├── index.html                    # 主頁面
   ├── labor-violation-query-netlify.html  # 查詢系統頁面
   ├── labor-violation-query-netlify.js    # 查詢系統邏輯
   ├── styles.css                    # 樣式檔案
   ├── netlify.toml                  # Netlify 配置
   ├── netlify-functions/            # Serverless Functions
   │   ├── proxy-labor-data.js       # 資料代理 Function
   │   └── health-check.js           # 健康檢查 Function
   └── README-Netlify.md             # 本說明文件
   ```

2. **上傳到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Netlify deployment"
   git branch -M main
   git remote add origin https://github.com/your-username/ISO20400.git
   git push -u origin main
   ```

3. **在 Netlify 部署**
   - 登入 [Netlify](https://netlify.com)
   - 點擊 "New site from Git"
   - 選擇 GitHub 並授權
   - 選擇您的專案倉庫
   - 部署設定：
     - Build command: 留空（靜態網站）
     - Publish directory: `.`（根目錄）
   - 點擊 "Deploy site"

### 方法二：手動上傳

1. **準備檔案**
   - 確保所有檔案都在正確的目錄結構中
   - 確認 `netlify.toml` 配置正確

2. **上傳到 Netlify**
   - 登入 Netlify
   - 點擊 "New site from Git" → "Deploy manually"
   - 將整個專案資料夾拖拽到上傳區域
   - 等待部署完成

## ⚙️ 配置說明

### netlify.toml 配置

```toml
[build]
  publish = "."                    # 發布目錄
  functions = "netlify-functions"  # Functions 目錄

[build.environment]
  NODE_VERSION = "18"              # Node.js 版本

# 路由規則
[[redirects]]
  from = "/api/labor-data/*"       # API 路由
  to = "/.netlify/functions/proxy-labor-data"
  status = 200

[[redirects]]
  from = "/api/health"             # 健康檢查
  to = "/.netlify/functions/health-check"
  status = 200

[[redirects]]
  from = "/*"                      # SPA 路由
  to = "/index.html"
  status = 200
```

### Functions 配置

#### proxy-labor-data.js
- 代理勞動部 CSV 資料
- 解決 CORS 問題
- 提供資料快取機制

#### health-check.js
- 提供系統健康檢查
- 用於監控服務狀態

## 🔧 本地測試

### 使用 Netlify CLI

1. **安裝 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **本地測試**
   ```bash
   netlify dev
   ```

3. **測試 Functions**
   ```bash
   # 測試健康檢查
   curl http://localhost:8888/.netlify/functions/health-check
   
   # 測試資料代理
   curl http://localhost:8888/.netlify/functions/proxy-labor-data/a0101
   ```

## 📊 系統功能

### 查詢功能
- ✅ 事業單位名稱模糊搜尋
- ✅ 裁處日期範圍篩選
- ✅ 主管機關篩選
- ✅ 法規類型篩選
- ✅ 分頁顯示
- ✅ 每頁筆數調整

### 匯出功能
- ✅ CSV 格式匯出
- ✅ Excel 格式匯出

### 技術特色
- ✅ Serverless 架構
- ✅ 自動快取機制
- ✅ 響應式設計
- ✅ 跨域問題解決
- ✅ 效能優化

## 🔍 故障排除

### 常見問題

1. **Functions 部署失敗**
   - 檢查 Node.js 版本設定
   - 確認 Functions 目錄結構正確
   - 查看 Netlify 部署日誌

2. **資料載入失敗**
   - 檢查勞動部網站連線狀態
   - 確認 Functions 路由配置
   - 查看瀏覽器開發者工具錯誤

3. **CORS 錯誤**
   - 確認 Functions 正確設定 CORS 標頭
   - 檢查 API 路由配置

### 監控與日誌

1. **Netlify Functions 日誌**
   - 在 Netlify 控制台查看 Functions 日誌
   - 使用 `netlify functions:logs` 命令

2. **網站分析**
   - 使用 Netlify Analytics 監控流量
   - 查看 Functions 執行統計

## 🚀 效能優化

### 快取策略
- Functions 回應快取 1 小時
- 靜態資源長期快取
- 瀏覽器快取優化

### 載入優化
- 分批處理大量資料
- 虛擬滾動支援
- 搜尋防抖機制

## 🔒 安全性

### 安全標頭
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### 資料安全
- 僅代理公開資料
- 不儲存敏感資訊
- 使用 HTTPS 傳輸

## 📞 支援

如有問題或建議，請：
1. 檢查本說明文件
2. 查看 Netlify 部署日誌
3. 聯繫系統維護者

---

**版本：** Netlify 部署版本  
**更新日期：** 2024年6月  
**維護者：** 系統開發團隊 