# Netlify.toml 配置詳細教學

## 📋 概述

`netlify.toml` 是 Netlify 的核心配置檔案，使用 TOML (Tom's Obvious, Minimal Language) 格式。它控制網站的建置、部署、路由、安全性等所有行為。

## 🏗️ 建置配置 (Build Configuration)

### 基本建置設定

```toml
[build]
  # 發布目錄：指定要部署的檔案位置
  publish = "."  # 當前目錄
  
  # Functions 目錄：Serverless 函數位置
  functions = "netlify-functions"
  
  # 建置命令（可選）
  command = "npm run build"
```

### 環境變數設定

```toml
[build.environment]
  # Node.js 版本
  NODE_VERSION = "18"
  
  # 其他環境變數
  NPM_FLAGS = "--version"
  YARN_FLAGS = "--version"
```

## 🔀 路由規則 (Redirects)

### 基本語法

```toml
[[redirects]]
  from = "來源路徑"
  to = "目標路徑"
  status = 狀態碼
```

### 常見路由模式

#### 1. API 路由
```toml
[[redirects]]
  from = "/api/labor-data/*"  # 匹配所有 /api/labor-data/ 開頭的路徑
  to = "/.netlify/functions/proxy-labor-data"
  status = 200
```

#### 2. 健康檢查
```toml
[[redirects]]
  from = "/api/health"
  to = "/.netlify/functions/health-check"
  status = 200
```

#### 3. SPA 路由
```toml
[[redirects]]
  from = "/*"  # 匹配所有路徑
  to = "/index.html"  # 導向主頁面
  status = 200
```

#### 4. 強制 HTTPS
```toml
[[redirects]]
  from = "http://:host/*"
  to = "https://:host/:splat"
  status = 301
```

#### 5. 自訂域名重定向
```toml
[[redirects]]
  from = "https://old-domain.com/*"
  to = "https://new-domain.com/:splat"
  status = 301
```

### 狀態碼說明

- **200**: 正常重定向（保持原始 URL）
- **301**: 永久重定向（SEO 友好）
- **302**: 臨時重定向
- **404**: 自訂 404 頁面

## 🔒 安全性標頭 (Security Headers)

### 基本安全標頭

```toml
[[headers]]
  for = "/*"  # 適用於所有頁面
  [headers.values]
    # 防止點擊劫持
    X-Frame-Options = "DENY"
    
    # XSS 防護
    X-XSS-Protection = "1; mode=block"
    
    # 防止 MIME 嗅探
    X-Content-Type-Options = "nosniff"
    
    # Referrer 政策
    Referrer-Policy = "strict-origin-when-cross-origin"
    
    # 內容安全政策
    Content-Security-Policy = "default-src 'self'"
    
    # 強制 HTTPS
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

### 進階安全配置

```toml
[[headers]]
  for = "/admin/*"  # 僅適用於管理頁面
  [headers.values]
    # 更嚴格的安全標頭
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "no-referrer"
    Content-Security-Policy = "default-src 'none'; script-src 'self'"
```

## 💾 快取策略 (Caching Strategy)

### 檔案類型快取

```toml
# API 資料快取（短期）
[[headers]]
  for = "/api/labor-data/*"
  [headers.values]
    Cache-Control = "public, max-age=3600"  # 1小時

# JavaScript 檔案快取（長期）
[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000"  # 1年

# CSS 檔案快取（長期）
[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000"  # 1年

# 圖片快取（中期）
[[headers]]
  for = "*.{jpg,jpeg,png,gif,webp}"
  [headers.values]
    Cache-Control = "public, max-age=2592000"  # 30天
```

### 快取指令說明

- **public**: 允許公開快取（CDN、代理伺服器）
- **private**: 僅允許瀏覽器快取
- **no-cache**: 每次都要驗證快取
- **no-store**: 不儲存快取
- **max-age**: 快取過期時間（秒）

## 🌍 環境配置 (Environment Configuration)

### 不同環境的變數

```toml
# 生產環境
[context.production.environment]
  API_URL = "https://api.production.com"
  DEBUG = "false"

# 預覽環境
[context.deploy-preview.environment]
  API_URL = "https://api.staging.com"
  DEBUG = "true"

# 分支部署環境
[context.branch-deploy.environment]
  API_URL = "https://api.dev.com"
  DEBUG = "true"
```

## 🖼️ 圖片處理 (Image Processing)

### 圖片優化配置

```toml
[build.processing]
  skip_processing = false

[build.processing.images]
  compress = true
  quality = 85
  format = "webp"
```

## 📝 表單處理 (Form Handling)

### 表單提交配置

```toml
[[redirects]]
  from = "/contact"
  to = "/.netlify/functions/contact-form"
  status = 200

[[redirects]]
  from = "/newsletter"
  to = "/.netlify/functions/newsletter-signup"
  status = 200
```

## 🔧 進階配置

### 自訂建置命令

```toml
[build]
  command = "npm run build && npm run optimize"
  publish = "dist"
  functions = "functions"
```

### 多語言支援

```toml
[[redirects]]
  from = "/zh/*"
  to = "/zh/index.html"
  status = 200

[[redirects]]
  from = "/en/*"
  to = "/en/index.html"
  status = 200
```

### API 版本控制

```toml
[[redirects]]
  from = "/api/v1/*"
  to = "/.netlify/functions/api-v1/:splat"
  status = 200

[[redirects]]
  from = "/api/v2/*"
  to = "/.netlify/functions/api-v2/:splat"
  status = 200
```

## 🧪 測試配置

### 本地測試

```bash
# 安裝 Netlify CLI
npm install -g netlify-cli

# 本地測試
netlify dev

# 測試特定配置
netlify dev --config netlify.toml
```

### 配置驗證

```bash
# 驗證配置語法
netlify build --dry-run

# 檢查 Functions
netlify functions:list
```

## 📊 監控與分析

### 效能監控

```toml
# 啟用效能監控
[build.processing]
  skip_processing = false

[build.processing.css]
  bundle = true
  minify = true

[build.processing.js]
  bundle = true
  minify = true
```

### 分析配置

```toml
# Google Analytics
[[headers]]
  for = "/*"
  [headers.values]
    X-Analytics-Id = "GA_TRACKING_ID"
```

## 🚨 常見問題與解決方案

### 1. Functions 無法載入

**問題**: Functions 返回 404 錯誤
**解決**: 檢查 `functions` 目錄設定和檔案路徑

```toml
[build]
  functions = "netlify-functions"  # 確保目錄存在
```

### 2. 路由不生效

**問題**: 重定向規則沒有作用
**解決**: 檢查路由順序和匹配模式

```toml
# 特定路由要放在通用路由之前
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. 快取問題

**問題**: 檔案更新後仍顯示舊版本
**解決**: 調整快取策略或使用版本號

```toml
# 開發環境禁用快取
[context.deploy-preview]
  [[context.deploy-preview.headers]]
    for = "/*"
    [context.deploy-preview.headers.values]
      Cache-Control = "no-cache, no-store, must-revalidate"
```

## 📚 參考資源

- [Netlify 官方文件](https://docs.netlify.com/)
- [TOML 語法指南](https://toml.io/)
- [HTTP 狀態碼](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [快取策略最佳實踐](https://web.dev/caching-best-practices/)

---

**版本**: 1.0  
**更新日期**: 2024年6月  
**適用於**: Netlify 部署的勞動法令查詢系統 