# Solana Mobile dApp Store Release Checklist (v1)

## Build + Signing
- [ ] `RELEASE_STORE_FILE` points to production keystore path.
- [ ] `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD` set in secure CI/env.
- [ ] `./gradlew.bat validateReleaseSigning` passes.
- [ ] `./gradlew.bat bundleRelease` succeeds.
- [ ] `./gradlew.bat assembleRelease` succeeds (signed APK artifact).
- [ ] Keep `CHAIN_NETWORK=mainnet` for release.
- [ ] Confirm `ENABLE_DEVNET_TOGGLE=false` in release BuildConfig.

## Wallet + Chain
- [ ] MWA connect/disconnect tested on Seeker.
- [ ] Premium template purchase signs, submits, and confirms.
- [ ] Publish signs, submits, and confirms.
- [ ] Publish blocked when entitlement missing.
- [ ] RPC failover tested by disabling primary endpoint.

## Upload + Publish Safety
- [ ] Upload returns `contentUri`, `publicUrl`, `contentHash`, `provider`, `metadataRecords`.
- [ ] Hash verification matches local SHA-256.
- [ ] Invalid/malformed upload payload blocks publish.
- [ ] Retry and circuit-breaker behavior verified.

## Security
- [ ] No private keys, auth tokens, or secret values logged.
- [ ] User-provided links sanitized to `http(s)` only in rendered HTML.
- [ ] Error copy is user-safe; internal details remain diagnostics-only.
- [ ] Release minification and resource shrinking enabled.

## Analytics + Observability
- [ ] Funnel events verified:
  - wallet connect initiated/success/fail
  - upload start/success/fail
  - purchase sign/submitted/confirmed/fail
  - publish sign/submitted/confirmed/fail
- [ ] Session correlation id present in all analytics events.
- [ ] Crash reporting configured in production flavor.

## Store Submission Artifacts
- [ ] Signed release APK.
- [ ] App icon package.
- [ ] Screenshots of wallet connect -> buy -> publish -> receipt.
- [ ] Short description + long description.
- [ ] Privacy and data handling note.
- [ ] Known limitations list.
