# Syncs selected keys from repo-root `.env` into the linked Vercel project.
# Run from repo root after `cd frontierx-web && vercel link`.
# Usage: .\scripts\push-vercel-env.ps1

$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $repoRoot "frontierx-web"
$envFile = Join-Path $repoRoot ".env"
$sepoliaEnv = Join-Path $repoRoot "frontierx-contracts\deployments\frontend-env.sepolia.env"

if (-not (Test-Path $webDir)) {
  throw "Missing frontierx-web directory."
}

function Read-DotEnv([string]$path) {
  $map = @{}
  if (-not (Test-Path $path)) { return $map }
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $map[$key] = $value
  }
  return $map
}

$vars = Read-DotEnv $envFile
$sepolia = Read-DotEnv $sepoliaEnv
foreach ($key in $sepolia.Keys) {
  if (-not $vars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($vars[$key])) {
    $vars[$key] = $sepolia[$key]
  }
}

$keys = @(
  "NEXT_PUBLIC_WC_PROJECT_ID",
  "NEXT_PUBLIC_SEPOLIA_RPC_URL",
  "NEXT_PUBLIC_SEPOLIA_FRX_TOKEN_ADDRESS",
  "NEXT_PUBLIC_SEPOLIA_FRONTIER_PASS_ADDRESS",
  "NEXT_PUBLIC_SEPOLIA_FRX_STAKING_ADDRESS",
  "NEXT_PUBLIC_SEPOLIA_FRX_LOTTERY_ADDRESS",
  "NEXT_PUBLIC_SEPOLIA_CRYSTAL_FORGE_ADDRESS",
  "NEXT_PUBLIC_PINATA_GATEWAY_URL",
  "NEXT_PUBLIC_POLYGON_RPC_URL",
  "NEXT_PUBLIC_BASE_RPC_URL",
  "SEPOLIA_RPC_URL",
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "DEEPSEEK_MODEL",
  "MINIMAX_API_KEY",
  "MINIMAX_BASE_URL",
  "MINIMAX_MODEL"
)

# Production first (required for --prod). Add preview/development in Vercel UI if needed.
$targets = @("production")
$missing = @()

Push-Location $webDir
try {
  foreach ($name in $keys) {
    if (-not $vars.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($vars[$name])) {
      $missing += $name
      continue
    }
    $value = $vars[$name]
    $sensitive = $name -notmatch "^NEXT_PUBLIC_"
    foreach ($target in $targets) {
      $args = @(
        "env", "add", $name, $target,
        "--value", $value,
        "--yes",
        "--force",
        "--non-interactive"
      )
      if ($sensitive) { $args += "--sensitive" }
      $null = & vercel @args 2>&1
    }
    Write-Host "OK  $name"
  }
}
finally {
  Pop-Location
}

if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "Skipped (empty in .env):" -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host "  - $_" }
}

Write-Host ""
Write-Host "Done. Redeploy production after env changes: cd frontierx-web; vercel --prod"
