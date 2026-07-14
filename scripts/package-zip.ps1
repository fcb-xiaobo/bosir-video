$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$packageJson = Get-Content -LiteralPath (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$releaseDir = Join-Path $root "release"
$sourceDir = Join-Path $releaseDir "win-unpacked"
$packageName = "XiaoBo-Windows-$($packageJson.version)"
$stagingDir = Join-Path $releaseDir $packageName
$zipPath = Join-Path $releaseDir "$packageName.zip"

if (-not (Test-Path -LiteralPath $sourceDir)) {
  throw "Missing package folder: $sourceDir. Run npm run package first."
}

if (Test-Path -LiteralPath $stagingDir) {
  Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $stagingDir | Out-Null
Copy-Item -Path (Join-Path $sourceDir "*") -Destination $stagingDir -Recurse -Force

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipStream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
try {
  $archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
  try {
    $basePath = Split-Path -Parent $stagingDir
    Get-ChildItem -LiteralPath $stagingDir -Recurse -File | ForEach-Object {
      $entryName = $_.FullName.Substring($basePath.Length + 1).Replace("\", "/")
      $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
      $entryStream = $entry.Open()
      try {
        $inputStream = [System.IO.File]::Open($_.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        try {
          $inputStream.CopyTo($entryStream)
        } finally {
          $inputStream.Dispose()
        }
      } finally {
        $entryStream.Dispose()
      }
    }
  } finally {
    $archive.Dispose()
  }
} finally {
  $zipStream.Dispose()
}

Write-Host "Created $zipPath"
