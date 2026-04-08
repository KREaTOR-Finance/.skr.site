# Release Runbook (Signed APK/AAB)

## 1) Set signing variables
Use environment variables (recommended) or local Gradle properties.

PowerShell:
```powershell
$env:RELEASE_STORE_FILE="C:\path\to\release-keystore.jks"
$env:RELEASE_STORE_PASSWORD="***"
$env:RELEASE_KEY_ALIAS="***"
$env:RELEASE_KEY_PASSWORD="***"
```

Optional chain config:
```powershell
$env:CHAIN_NETWORK="mainnet"
$env:SOLANA_RPC_URLS="https://api.mainnet-beta.solana.com,https://solana-mainnet.g.alchemy.com/v2/demo"
```

## 2) Validate signing config
```powershell
.\gradlew.bat validateReleaseSigning
```

## 3) Build release artifacts
```powershell
.\gradlew.bat clean bundleRelease assembleRelease
```

Outputs:
- AAB: `app/build/outputs/bundle/release/`
- APK: `app/build/outputs/apk/release/`

## 4) Verify APK signature
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\34.0.0\apksigner.bat" verify --print-certs app\build\outputs\apk\release\app-release.apk
```

## 5) Submission readiness
Use:
- `docs/dapp-store-release-checklist.md`
- `docs/security-pass-v1.md`
