# skr-site-dapp

- `skr-studio/`: Kotlin Compose app scaffold for Solana Mobile dApp flow.
- `onchain/skr-publish-program/`: Anchor program enforcing one-time SKR unlock + publish receipts.

## Notes

- Kotlin app includes all Omma screen routes, MWA signing flow, per-template purchase/publish encoding, and shared upload adapter contract.
- Release pipeline now enforces signing vars through `validateReleaseSigning` before `assembleRelease` or `bundleRelease`.
- Domain record updates (`url/arweave/ipfs`) remain expected to be signed on-chain as part of publish flow.
- Mobile upload config is injected with Gradle properties (`STORAGE_PROVIDER`, `UPLOAD_API_BASE_URL`, optional `ARWEAVE_JWK`, `PINATA_JWT`).
- Release readiness docs:
  - `skr-studio/docs/dapp-store-release-checklist.md`
  - `skr-studio/docs/security-pass-v1.md`
