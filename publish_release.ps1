# ==============================================================
# T-Cal GitHub Release Automation Script
# ==============================================================

# 1. Update this version number every time you run the script!
$VERSION = "v1.10"

# 2. Add some notes about what changed in this release
$NOTES = "Initial stable release of T-Cal containing the Excel Exporter."

# ==============================================================

$APK_SOURCE = "application\app\build\outputs\apk\debug\app-debug.apk"
$RENAME_DEST = "TCal_$VERSION.apk"

Write-Host "🚀 Starting T-Cal Release Process for $VERSION" -ForegroundColor Cyan

# Check if the APK exists
if (-Not (Test-Path $APK_SOURCE)) {
    Write-Host "❌ Error: Could not find the APK at $APK_SOURCE" -ForegroundColor Red
    Write-Host "Make sure you build the APK in Android Studio first!" -ForegroundColor Yellow
    exit 1
}

# Copy and rename the APK
Write-Host "📁 Renaming APK to $RENAME_DEST..."
Copy-Item $APK_SOURCE -Destination $RENAME_DEST -Force

# Create the release using GitHub CLI
Write-Host "🌐 Uploading $RENAME_DEST to GitHub..."
gh release create $VERSION $RENAME_DEST -t "T-Cal Release $VERSION" -n "$NOTES" --repo "namanjain6767/tcal-application"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Success! Release $VERSION is now live on GitHub." -ForegroundColor Green
    Write-Host "Users on older versions can now use the 'Check for Updates' button in the app." -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create the GitHub release. Ensure you are logged into 'gh' CLI." -ForegroundColor Red
}

Write-Host "🧹 Cleaning up..."
Remove-Item $RENAME_DEST -Force
