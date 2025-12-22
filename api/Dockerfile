# ===========================================
# API サーバー (Express) 用 Dockerfile
# ===========================================

FROM node:20-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm install --legacy-peer-deps || npm install || true

# ソースコードのコピー
COPY . .

# TypeScript のビルド
RUN npx tsc || npm run build

EXPOSE 4000

CMD ["npm", "start"]
