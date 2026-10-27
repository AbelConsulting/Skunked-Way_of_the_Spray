param(
    [string]$BundlePath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (-not $BundlePath) {
    $root = Split-Path -Parent $PSScriptRoot
    $gradle = Get-Content -LiteralPath (Join-Path $root 'android\app\build.gradle') -Raw
    $versionName = [regex]::Match($gradle, 'versionName\s+"([^"]+)"').Groups[1].Value
    $versionCode = [regex]::Match($gradle, 'versionCode\s+(\d+)').Groups[1].Value
    if (-not $versionName -or -not $versionCode) { throw 'Cannot determine Android release version.' }
    $BundlePath = Join-Path $root "android\app\build\outputs\bundle\release\skunkfu-$versionName-$versionCode-release.aab"
}
$resolved = (Resolve-Path -LiteralPath $BundlePath).Path
$archive = [System.IO.Compression.ZipFile]::OpenRead($resolved)
try {
    $registration = $archive.GetEntry('base/res/xml/config.xml')
    if (-not $registration) {
        throw 'Release AAB is missing Cordova config.xml. Billing cannot find its native plugin.'
    }
    $stream = $registration.Open()
    $buffer = New-Object System.IO.MemoryStream
    try {
        $stream.CopyTo($buffer)
        $config = [System.Text.Encoding]::UTF8.GetString($buffer.ToArray())
    } finally {
        $stream.Dispose()
        $buffer.Dispose()
    }
    foreach ($required in @('InAppBillingPlugin', 'android-package', 'cc.fovea.PurchasePlugin')) {
        if (-not $config.Contains($required)) {
            throw "Release AAB Cordova registration is missing: $required"
        }
    }
    $nativeClassFound = $false
    foreach ($entry in $archive.Entries) {
        if ($entry.FullName -notmatch '^base/dex/classes\d*\.dex$') { continue }
        $stream = $entry.Open()
        $buffer = New-Object System.IO.MemoryStream
        try {
            $stream.CopyTo($buffer)
            $dex = [System.Text.Encoding]::UTF8.GetString($buffer.ToArray())
            if ($dex.Contains('Lcc/fovea/PurchasePlugin;')) { $nativeClassFound = $true }
        } finally {
            $stream.Dispose()
            $buffer.Dispose()
        }
    }
    if (-not $nativeClassFound) {
        throw 'Release AAB is missing the native cc.fovea.PurchasePlugin class.'
    }
    Write-Output 'PASS release AAB retains Cordova billing registration and native plugin class.'
} finally {
    $archive.Dispose()
}
