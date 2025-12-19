# 開発ガイド - スマートフォン実機からのアクセス手順

このドキュメントでは、Windows + WSL2環境で開発する際に、スマートフォン実機から開発サーバーにアクセスする手順を説明します。

> **関連ドキュメント**: CSSファイルの設計・管理方針については **[CSS.md](./CSS.md)** を参照してください。

## 目次
- [概要](#概要)
- [前提条件](#前提条件)
- [Windows + WSL2環境でのセットアップ](#windows--wsl2環境でのセットアップ)
- [Mac/Linux環境でのセットアップ](#maclinux環境でのセットアップ)
- [トラブルシューティング](#トラブルシューティング)

## 概要

AiraPJプロジェクトでは以下の2つのサーバーが起動します：
- **Viteフロントエンド開発サーバー**: ポート `5173`
- **Express APIサーバー**: ポート `4000`

スマートフォン実機からこれらのサーバーにアクセスするには、開発環境のネットワーク設定を調整する必要があります。

## 前提条件

- スマートフォンと開発PCが同じネットワーク（Wi-Fi）に接続されていること
- 開発PCのファイアウォール設定を変更する権限があること

## Windows + WSL2環境でのセットアップ

### 1. Viteの設定変更

`vite.config.ts` を編集し、すべてのネットワークインターフェースでリッスンするように設定します：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // すべてのネットワークインターフェースでリッスン
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
})
```

### 2. APIサーバーの設定

#### 開発環境用の設定

`api/.env` ファイルで `HOST` 環境変数を設定します：

```env
# 開発環境：スマホ実機からアクセスする場合
HOST=0.0.0.0
PORT=4000
```

この設定により、APIサーバーがすべてのネットワークインターフェースでリッスンします。

**セキュリティ注意事項：**
- `HOST=0.0.0.0` は**開発環境専用**の設定です
- 本番環境では `HOST` を未設定（デフォルト: `localhost`）にするか、リバースプロキシ（nginx等）経由でのアクセスを推奨します
- 本番環境で `0.0.0.0` を使用する場合は、必ずファイアウォールやセキュリティグループで適切にアクセス制限を行ってください

#### コード確認（参考）

`api/index.ts` では以下のように環境変数で制御されています：

```typescript
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`API server running on ${HOST}:${PORT}`);
});
```

### 3. WSL2のIPアドレスを確認

WSL2ターミナルで以下のコマンドを実行し、WSL2のIPアドレスを確認します：

```bash
ip addr show eth0 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1
```

または：

```bash
hostname -I | awk '{print $1}'
```

このIPアドレス（例: `172.x.x.x`）をメモしておきます。

### 4. Windowsホストマシンのポートフォワーディング設定

**PowerShell（管理者権限）** で以下のコマンドを実行し、WSL2のポートをWindowsホストに転送します：

#### Vite（ポート5173）のポートフォワーディング

```powershell
# WSL2のIPアドレスを確認（自動取得）
$wsl_ip = (wsl hostname -I).trim()
Write-Host "WSL IP: $wsl_ip"

# ポート5173のフォワーディング設定
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wsl_ip

# 設定確認
netsh interface portproxy show v4tov4
```

#### API（ポート4000）のポートフォワーディング

```powershell
# ポート4000のフォワーディング設定
netsh interface portproxy add v4tov4 listenport=4000 listenaddress=0.0.0.0 connectport=4000 connectaddress=$wsl_ip

# 設定確認
netsh interface portproxy show v4tov4
```

#### ポートフォワーディングの削除（不要になった場合）

```powershell
# ポート5173のフォワーディング削除
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0

# ポート4000のフォワーディング削除
netsh interface portproxy delete v4tov4 listenport=4000 listenaddress=0.0.0.0
```

### 5. Windowsファイアウォールの設定

**Windows Defender ファイアウォール** で、ポート5173と4000への受信接続を許可します：

#### GUIで設定する場合

1. 「Windows セキュリティ」→「ファイアウォールとネットワーク保護」→「詳細設定」を開く
2. 「受信の規則」→「新しい規則」をクリック
3. 「ポート」を選択し、「次へ」
4. 「TCP」を選択し、「特定のローカルポート」に `5173` を入力
5. 「接続を許可する」を選択
6. すべてのプロファイル（ドメイン、プライベート、パブリック）にチェック
7. 名前を「Vite Dev Server」などに設定
8. **ポート4000についても同様の手順を繰り返す**（名前は「Express API Server」など）

#### PowerShell（管理者権限）で設定する場合

```powershell
# Viteポート5173のファイアウォール許可
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow

# APIポート4000のファイアウォール許可
New-NetFirewallRule -DisplayName "Express API Server" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

### 6. WindowsホストマシンのIPアドレスを確認

**PowerShell**:
```powershell
ipconfig
```

接続済みのネットワークアダプター（Wi-Fi または イーサネット）の「IPv4 アドレス」を確認します（例: `192.168.1.100`）。

または、PowerShellで自動取得：
```powershell
# プライベートIPアドレスを自動取得
(Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp,Manual | 
    Where-Object { $_.IPAddress -match '^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)' } | 
    Select-Object -First 1).IPAddress
```

### 7. サーバーの起動（WSL2ターミナルで実行）

**重要**: ViteとAPIサーバーの両方をWSL2ターミナルで起動する必要があります。

#### APIサーバーの起動

```bash
cd /path/to/AiraPJ/api
HOST=0.0.0.0 PORT=4000 npm run dev
```

起動後、以下のようなログが表示されることを確認：
```
API server running on 0.0.0.0:4000
```

#### Viteサーバーの起動（別のWSL2ターミナル）

```bash
cd /path/to/AiraPJ
npm run dev
```

起動後、以下のようなログが表示されることを確認：
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://172.x.x.x:5173/
  ➜  Network: http://192.168.x.x:5173/
```

**注意**: 
- ViteがAPIサーバーにプロキシする際、WSL2内部では `localhost:4000` で通信します
- 外部からのアクセス（Windows PCやスマホ）は、WindowsホストIPを経由してWSL2に転送されます

### 8. スマートフォンからアクセス

スマートフォンのブラウザで以下のURLにアクセスします（`192.168.1.100` は実際のWindowsホストIPに置き換えてください）：

- **フロントエンド**: `http://192.168.1.100:5173`
- **API直接**: `http://192.168.1.100:4000/api/health`

### 8. 環境変数の設定

**api/.env ファイル**（APIサーバー用）：

```env
# APIサーバー用の環境変数
HOST=0.0.0.0
PORT=4000
```

**重要**: 
- プロジェクトルート（Vite用）には `.env` ファイルは不要です
- ViteのプロキシはWSL2内部で `localhost:4000` を使用して動作します
- 外部からのアクセス（Windows PCやスマホ）のみWindowsホストIP経由になります

### 9. 自動化スクリプト（WSL2再起動時に便利）

WSL2を再起動するとIPアドレスが変わる可能性があるため、PowerShellスクリプトを作成すると便利です：

`setup-wsl-port-forwarding.ps1`：

```powershell
# 管理者権限で実行すること
$wsl_ip = (wsl hostname -I).trim()
Write-Host "WSL IP: $wsl_ip"

# 既存のフォワーディング削除
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=4000 listenaddress=0.0.0.0 2>$null

# 新しいフォワーディング設定
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wsl_ip
netsh interface portproxy add v4tov4 listenport=4000 listenaddress=0.0.0.0 connectport=4000 connectaddress=$wsl_ip

# 設定確認
Write-Host "`nPort forwarding configured:"
netsh interface portproxy show v4tov4

# ファイアウォール規則の確認・追加
$viteRule = Get-NetFirewallRule -DisplayName "Vite Dev Server" -ErrorAction SilentlyContinue
if (-not $viteRule) {
    New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
    Write-Host "`nFirewall rule added for Vite (port 5173)"
} else {
    Write-Host "`nFirewall rule for Vite already exists"
}

$apiRule = Get-NetFirewallRule -DisplayName "Express API Server" -ErrorAction SilentlyContinue
if (-not $apiRule) {
    New-NetFirewallRule -DisplayName "Express API Server" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
    Write-Host "Firewall rule added for API (port 4000)"
} else {
    Write-Host "Firewall rule for API already exists"
}

Write-Host "`nSetup complete! You can access:"
Write-Host "  Frontend: http://$(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*' | Select-Object -First 1 -ExpandProperty IPAddress):5173"
Write-Host "  API: http://$(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*' | Select-Object -First 1 -ExpandProperty IPAddress):4000"
```

実行方法（PowerShellを管理者権限で開く）：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\setup-wsl-port-forwarding.ps1
```

## Mac/Linux環境でのセットアップ

Mac/Linuxではポートフォワーディングの設定が不要です。

### 1. Viteの設定変更

`vite.config.ts` を編集し、すべてのネットワークインターフェースでリッスンするように設定します：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
})
```

### 2. APIサーバーの設定

#### 開発環境用の設定

`api/.env` ファイルで `HOST` 環境変数を設定します：

```env
# 開発環境：スマホ実機からアクセスする場合
HOST=0.0.0.0
PORT=4000
```

この設定により、APIサーバーがすべてのネットワークインターフェースでリッスンします。

**セキュリティ注意事項：**
- `HOST=0.0.0.0` は**開発環境専用**の設定です
- 本番環境では `HOST` を未設定（デフォルト: `localhost`）にするか、リバースプロキシ（nginx等）経由でのアクセスを推奨します

#### コード確認（参考）

`api/index.ts` では以下のように環境変数で制御されています：

```typescript
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`API server running on ${HOST}:${PORT}`);
});
```

### 3. IPアドレスを確認

ターミナルで以下のコマンドを実行：

**Mac**:
```bash
ipconfig getifaddr en0
```

**Linux**:
```bash
hostname -I | awk '{print $1}'
```

### 4. ファイアウォール設定（必要に応じて）

**Mac**:
通常、開発用途では特別な設定は不要です。必要に応じてシステム環境設定でファイアウォールを確認してください。

**Linux（Ubuntu等）**:
```bash
sudo ufw allow 5173/tcp
sudo ufw allow 4000/tcp
```

### 5. スマートフォンからアクセス

スマートフォンのブラウザで以下のURLにアクセスします（IPアドレスは実際のものに置き換えてください）：

- **フロントエンド**: `http://192.168.1.100:5173`
- **API直接**: `http://192.168.1.100:4000/api/health`

## トラブルシューティング

### 問題1: ViteがAPIサーバーにポート4000ではなく5173でアクセスしてしまう

**原因**: Viteのプロキシ設定が正しく機能していない可能性があります。

**解決方法**:

1. **両方のサーバーがWSL2で起動していることを確認**
   ```bash
   # WSL2ターミナルで確認
   ps aux | grep node
   ```
   ViteとAPIサーバーの両方のプロセスが表示されるはずです。

2. **APIサーバーがポート4000で起動していることを確認**
   ```bash
   # WSL2ターミナルで確認
   curl http://localhost:4000/api/health
   ```
   `{"status":"ok"}` が返ってくることを確認してください。

3. **Viteのプロキシ設定を確認**
   `vite.config.ts` で以下のように設定されているか確認：
   ```typescript
   proxy: {
     '/api': 'http://localhost:4000',
     '/uploads': 'http://localhost:4000',
   },
   ```

4. **Viteサーバーを再起動**
   ```bash
   # Ctrl+C でViteを停止してから再起動
   npm run dev
   ```

### 問題2: スマートフォンから端末IP:5173に到達できない

**原因**: WSL2のポートフォワーディングまたはWindowsファイアウォールの設定が不完全です。

**解決方法**:

1. **自動化スクリプトを管理者権限で実行**
   ```powershell
   # PowerShellを管理者権限で開いて実行
   .\setup-wsl-port-forwarding.ps1
   ```

2. **ポートフォワーディングが設定されているか確認**
   ```powershell
   # PowerShellで確認
   netsh interface portproxy show v4tov4
   ```
   
   以下のような出力が表示されるはずです：
   ```
   Listen on ipv4:             Connect to ipv4:
   Address         Port        Address         Port
   --------------- ----------  --------------- ----------
   0.0.0.0         5173        172.x.x.x       5173
   0.0.0.0         4000        172.x.x.x       4000
   ```

3. **Windowsファイアウォール規則を確認**
   ```powershell
   # PowerShellで確認
   Get-NetFirewallRule -DisplayName "Vite Dev Server"
   Get-NetFirewallRule -DisplayName "Express API Server"
   ```
   
   両方の規則が存在し、Enabled=True になっているか確認してください。

4. **WSL2のIPアドレスを確認**
   ```powershell
   # PowerShellで確認
   wsl hostname -I
   ```
   
   表示されたIPアドレスが、ポートフォワーディング設定の「Connect to ipv4」と一致しているか確認してください。

5. **WindowsホストのIPアドレスを確認**
   ```powershell
   # PowerShellで確認
   ipconfig
   ```
   
   Wi-FiアダプターのIPv4アドレス（例: 192.168.1.100）をメモしてください。

6. **スマートフォンから接続テスト**
   - スマートフォンのブラウザで `http://192.168.1.100:5173` にアクセス
   - もしアクセスできない場合は、Windowsでブラウザを開いて同じURLでアクセスできるか確認

7. **サーバーが0.0.0.0でリッスンしていることを確認**
   ```bash
   # WSL2ターミナルで確認
   # APIサーバーのログに "API server running on 0.0.0.0:4000" と表示されているか
   # Viteのログに "Network: http://172.x.x.x:5173/" が表示されているか確認
   ```

### アクセスできない場合

1. **ファイアウォールの確認**
   - Windowsファイアウォールでポート5173と4000が許可されているか確認
   - セキュリティソフトがブロックしていないか確認

2. **ポートフォワーディングの確認（WSL2のみ）**
   ```powershell
   netsh interface portproxy show v4tov4
   ```

3. **サーバーの起動確認**
   - ViteとAPIサーバーが両方起動しているか確認
   - WSL2内で `curl http://localhost:5173` が応答するか確認

4. **ネットワーク接続の確認**
   - スマートフォンと開発PCが同じWi-Fiネットワークに接続されているか確認
   - 企業ネットワークなどでクライアント間通信が制限されていないか確認

5. **IPアドレスの確認**
   - WSL2のIPアドレスが変わっていないか確認（再起動後など）
   - WindowsホストのIPアドレスが正しいか確認

### WSL2のIPアドレスが変わる問題

WSL2を再起動するとIPアドレスが変わることがあります。この場合は、上記の「自動化スクリプト」を使用して再設定してください。

### CORSエラーが発生する場合

APIサーバーの `api/index.ts` でCORS設定が有効になっているか確認：

```typescript
import cors from 'cors';
app.use(cors());
```

### HTTPSでアクセスしたい場合

一部のWebAPI（カメラアクセスなど）はHTTPSが必要です。その場合は、Viteのhttps設定を有効にしてください：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: fs.readFileSync('path/to/key.pem'),
      cert: fs.readFileSync('path/to/cert.pem'),
    },
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
})
```

自己署名証明書の作成（ホストのIPアドレスを指定）：

```bash
# WSL2/Linux/Mac
# YOUR_IP_ADDRESSを実際のIPアドレスに置き換えてください（例: 192.168.1.100）
YOUR_IP_ADDRESS="192.168.1.100"
openssl req -x509 -newkey rsa:2048 -nodes -sha256 \
  -subj "/CN=${YOUR_IP_ADDRESS}" \
  -addext "subjectAltName=IP:${YOUR_IP_ADDRESS},IP:127.0.0.1,DNS:localhost" \
  -keyout localhost-key.pem -out localhost-cert.pem -days 365
```

注意: スマートフォンでHTTPSアクセスする場合、自己署名証明書では警告が表示されます。開発用途では警告を無視して進めるか、証明書をスマートフォンにインストールする必要があります。

## セキュリティに関する重要な注意事項

### 開発環境と本番環境の設定の違い

このドキュメントで説明している設定は**開発環境専用**です。本番環境では以下の点に注意してください：

#### Vite開発サーバー（vite.config.ts）
- `vite.config.ts` の `server` 設定は**開発環境のみ**で使用されます
- 本番環境では `npm run build` で静的ファイルを生成し、nginx等のWebサーバーで配信します
- したがって、`host: '0.0.0.0'` の設定は本番環境には影響しません

#### APIサーバー（api/index.ts）
- APIサーバーは本番環境でも実行されるため、`HOST` 環境変数の設定が重要です
- **開発環境**: `HOST=0.0.0.0` を `.env` に設定してスマホからアクセス
- **本番環境**: `HOST` を未設定（デフォルト: `localhost`）にするか、以下のいずれかを推奨：
  - リバースプロキシ（nginx、Apache等）経由でのアクセス
  - ファイアウォール、セキュリティグループで適切にアクセス制限
  - VPC内のプライベートネットワークでの運用

#### 本番環境でのベストプラクティス

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Internet  │ →   │ nginx (443)  │ →   │ API Server  │
│             │     │ SSL/TLS終端  │     │ localhost:  │
│             │     │ リバース     │     │ 4000        │
│             │     │ プロキシ     │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
```

- 外部からは nginx にアクセス
- nginx がローカルホストの API サーバーにリクエストを転送
- API サーバーは `localhost` でのみリッスン（外部から直接アクセス不可）

### 環境変数の管理

開発環境と本番環境で異なる `.env` ファイルを使用することを推奨します：

**開発環境（`api/.env.development`）**:
```env
HOST=0.0.0.0
PORT=4000
```

**本番環境（`api/.env.production`）**:
```env
# HOST は未設定（デフォルト: localhost）
PORT=4000
```

## まとめ

- **Windows + WSL2**: ポートフォワーディング + ファイアウォール設定が必要
- **Mac/Linux**: `host: '0.0.0.0'` の設定のみで基本的にOK
- 同じWi-Fiネットワークに接続していることが前提
- 開発用途では自己署名証明書でも動作可能
- **本番環境では必ずセキュリティ設定を見直してください**

これらの設定により、スマートフォン実機でUI/UXを確認しながら開発できます。
