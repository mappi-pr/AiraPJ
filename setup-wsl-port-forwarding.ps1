# WSL2ポートフォワーディング自動設定スクリプト
# 管理者権限で実行してください

# WSL2のIPアドレスを取得
$wsl_ip = (wsl hostname -I).trim()
Write-Host "WSL IP: $wsl_ip" -ForegroundColor Cyan

# 既存のポートフォワーディング設定を削除（エラーを無視）
Write-Host "`nRemoving existing port forwarding rules..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=4000 listenaddress=0.0.0.0 2>$null

# 新しいポートフォワーディング設定を追加
Write-Host "Adding new port forwarding rules..." -ForegroundColor Yellow
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wsl_ip
netsh interface portproxy add v4tov4 listenport=4000 listenaddress=0.0.0.0 connectport=4000 connectaddress=$wsl_ip

# 設定確認
Write-Host "`nPort forwarding configured:" -ForegroundColor Green
netsh interface portproxy show v4tov4

# ファイアウォール規則の確認・追加
Write-Host "`nChecking firewall rules..." -ForegroundColor Yellow

$viteRule = Get-NetFirewallRule -DisplayName "Vite Dev Server" -ErrorAction SilentlyContinue
if (-not $viteRule) {
    New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
    Write-Host "Firewall rule added for Vite (port 5173)" -ForegroundColor Green
} else {
    Write-Host "Firewall rule for Vite already exists" -ForegroundColor Cyan
}

$apiRule = Get-NetFirewallRule -DisplayName "Express API Server" -ErrorAction SilentlyContinue
if (-not $apiRule) {
    New-NetFirewallRule -DisplayName "Express API Server" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
    Write-Host "Firewall rule added for API (port 4000)" -ForegroundColor Green
} else {
    Write-Host "Firewall rule for API already exists" -ForegroundColor Cyan
}

# ホストマシンのIPアドレスを取得
$hostIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty IPAddress)
if (-not $hostIP) {
    # Wi-Fiインターフェースが見つからない場合は、イーサネットを試す
    $hostIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'イーサネット*' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty IPAddress)
}
if (-not $hostIP) {
    # それでも見つからない場合は、すべてのインターフェースから最初のプライベートIPを取得
    $hostIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)' } | Select-Object -First 1 -ExpandProperty IPAddress)
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nYou can access from your smartphone:" -ForegroundColor White
if ($hostIP) {
    Write-Host "  Frontend: http://${hostIP}:5173" -ForegroundColor Cyan
    Write-Host "  API: http://${hostIP}:4000" -ForegroundColor Cyan
} else {
    Write-Host "  Please check your network adapter IP address manually" -ForegroundColor Yellow
}
Write-Host "`nMake sure your smartphone is connected to the same Wi-Fi network." -ForegroundColor Yellow
