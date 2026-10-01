$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root '.runtime\pids.json'
if (Test-Path -LiteralPath $PidFile) {
  $Pids = Get-Content -Raw -LiteralPath $PidFile | ConvertFrom-Json
  @($Pids.service,$Pids.workflow) | ForEach-Object { Stop-Process -Id $_ -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $PidFile -Force
}
Write-Host '实验 6 服务已停止'

