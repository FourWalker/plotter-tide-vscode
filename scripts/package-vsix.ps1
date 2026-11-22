# Builds dist\plotter-tide-<version>.vsix with no npm tools: a .vsix is a zip with a manifest.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File scripts\package-vsix.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$pkg = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$version = $pkg.version

# Files that go into the extension, relative to the project root.
$include = @('package.json', 'extension.js', 'README.md', 'LICENSE', 'NOTICE') +
  (Get-ChildItem (Join-Path $root 'themes') -Filter '*.json' | ForEach-Object { "themes/$($_.Name)" }) +
  (Get-ChildItem (Join-Path $root 'media') -Filter '*.svg' | ForEach-Object { "media/$($_.Name)" })

foreach ($file in $include) {
  if (-not (Test-Path (Join-Path $root $file))) { throw "Missing $file (run: node scripts/build-scenes.mjs)" }
}

$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="$($pkg.name)" Version="$version" Publisher="$($pkg.publisher)" />
    <DisplayName>$($pkg.displayName)</DisplayName>
    <Description xml:space="preserve">$($pkg.description)</Description>
    <Tags>theme,color-theme,background</Tags>
    <Categories>Themes,Other</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="$($pkg.engines.vscode)" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui" />
    </Properties>
    <License>extension/LICENSE</License>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true" />
  </Assets>
</PackageManifest>
"@

$contentTypes = @'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension=".json" ContentType="application/json" /><Default Extension=".js" ContentType="application/javascript" /><Default Extension=".svg" ContentType="image/svg+xml" /><Default Extension=".md" ContentType="text/markdown" /><Default Extension=".vsixmanifest" ContentType="text/xml" /><Default Extension="." ContentType="text/plain" /></Types>
'@

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$out = Join-Path $dist "$($pkg.name)-$version.vsix"
if (Test-Path $out) { Remove-Item $out -Force }

$utf8 = New-Object System.Text.UTF8Encoding($false)
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
  # Entry names must use forward slashes, which is why this does not use Compress-Archive.
  foreach ($pair in @(@('[Content_Types].xml', $contentTypes), @('extension.vsixmanifest', $manifest))) {
    $entry = $zip.CreateEntry($pair[0])
    $writer = New-Object System.IO.StreamWriter($entry.Open(), $utf8)
    $writer.Write($pair[1]); $writer.Dispose()
  }
  foreach ($file in $include) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $root $file), "extension/$file") | Out-Null
  }
} finally { $zip.Dispose() }

Write-Host "Built $out"
