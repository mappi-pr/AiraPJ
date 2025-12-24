# ===========================================
# フロントエンド (Vite + React) 用 Dockerfile
# ===========================================

# ビルドステージ
FROM node:20 AS builder

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
# Disable strict SSL for npm to work around certificate issues in Docker
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
