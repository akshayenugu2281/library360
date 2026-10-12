$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ApiDir = Join-Path $ProjectRoot 'library360-api'
$EnvFile = Join-Path $ApiDir '.env'
if (-not (Test-Path $EnvFile)) {
  $EnvFile = Join-Path $ProjectRoot '.env'
}

if (-not (Test-Path $EnvFile)) {
  throw "Missing .env file in $ApiDir or $ProjectRoot. Copy .env.example to .env and replace all placeholders first."
}

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $parts = $line -split '=', 2
  if ($parts.Count -ne 2) { return }
  $name = $parts[0].Trim()
  $value = $parts[1].Trim()
  if ($value -match 'REPLACE_WITH') {
    throw "Environment variable '$name' still has a placeholder value in .env. Replace it before starting the API."
  }
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

if (-not $env:DB_PASSWORD -or -not $env:ADMIN_PASSWORD -or -not $env:LIBRARIAN_PASSWORD -or -not $env:JWT_SECRET -or -not $env:APP_SETTINGS_ENCRYPTION_KEY) {
  throw 'DB_PASSWORD, ADMIN_PASSWORD, LIBRARIAN_PASSWORD, JWT_SECRET and APP_SETTINGS_ENCRYPTION_KEY must all be configured in .env.'
}

Push-Location $ApiDir
try { mvn spring-boot:run }
finally { Pop-Location }
