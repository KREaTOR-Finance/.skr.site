# Security Pass v1 (Kotlin Mobile Core Loop)

Date: 2026-04-08

## Scope
- `app/src/main/java/com/skrstudio/app/chain/`
- publish flow wiring in `SkrStudioApp.kt`
- release config in `app/build.gradle.kts`

## High-risk checks
- Verified no client-side secret material persisted in app state.
- Verified no signing key material committed in source.
- Verified wallet auth token is only held in-memory session state.
- Verified publish is blocked on upload schema/hash failures.
- Verified premium publish requires on-chain entitlement confirmation path.

## Findings and actions
1. Build memory instability caused dex merge failures.
Action: raised Gradle JVM heap and wrapper defaults; enabled multidex.

2. Potential HTML/link injection from user customization.
Action: added HTML escaping and URL scheme sanitization (`http/https` only) in template renderer.

3. Release signing could be skipped accidentally.
Action: added `validateReleaseSigning` task and made `assembleRelease`/`bundleRelease` depend on it.

4. Devnet behavior could leak into release.
Action: release BuildConfig forces `ENABLE_DEVNET_TOGGLE=false` and defaults to `CHAIN_NETWORK=mainnet`.

## Residual risk
- Logs currently use `Log.i` analytics stubs; replace with production telemetry backend and log redaction policy.
- Crash reporting provider is not yet integrated in this pass.
- No cert pinning yet for gateway/RPC HTTPS endpoints.

## Recommended next security steps
- Add cert pinning for gateway domain.
- Add production crash reporting with PII scrubbing.
- Add release lint gate for exported components and network security policy.
- Add dependency vulnerability scan in CI for release pipeline.
