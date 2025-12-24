# ===========================================
# フロントエンド (Vite + React) 用 Dockerfile
# ===========================================

# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
# Note: strict-ssl=false is used to work around SSL certificate issues in certain
# Docker build environments (e.g., corporate proxies, CI/CD systems).
# This only affects package installation at build time, not runtime security.
# In production environments with proper SSL certificates, this can be removed.
RUN npm config set strict-ssl false && npm ci

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 本番ステージ
FROM nginx:alpine

# nginx設定ファイルのコピー
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# ビルド済みファイルのコピー
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
