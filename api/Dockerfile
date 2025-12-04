# ===========================================
# API サーバー (Express) 用 Dockerfile
# ===========================================

FROM node:20-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci

# ソースコードのコピー
COPY . .

# TypeScript のビルド
RUN npm run build

# アップロードディレクトリの作成
RUN mkdir -p /app/uploads/face /app/uploads/frontHair /app/uploads/backHair /app/uploads/bg /app/uploads/csm

EXPOSE 4000

CMD ["npm", "start"]
