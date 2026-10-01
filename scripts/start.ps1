$Root = Split-Path -Parent $PSScriptRoot
$Runtime = Join-Path $Root '.runtime'
New-Item -ItemType Directory -Force -Path $Runtime | Out-Null
$Service = Start-Process -FilePath 'node' -ArgumentList 'service/server.js' -WorkingDirectory $Root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $Runtime 'service.log') -RedirectStandardError (Join-Path $Runtime 'service-error.log')
$Workflow = Start-Process -FilePath 'node' -ArgumentList @('node_modules/node-red/red.js','--userDir','data/node-red','--settings','settings.js','flows/flows.json') -WorkingDirectory $Root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $Runtime 'workflow.log') -RedirectStandardError (Join-Path $Runtime 'workflow-error.log')
@{ service=$Service.Id; workflow=$Workflow.Id } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Runtime 'pids.json')
Write-Host "库存服务：http://127.0.0.1:8001  工作流页面：http://127.0.0.1:1880/orders"

