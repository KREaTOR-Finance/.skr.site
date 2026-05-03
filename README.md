# .skr Studio Gateway (Web)

Seeker-branded web client rebuilt from the Omma prototype into typed Next.js modules.

## Run

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

## Environment

Set public chain values for the target network:

```bash
NEXT_PUBLIC_SKR_PROGRAM_ID=<deployed_program_pubkey>
NEXT_PUBLIC_SOLANA_CHAIN=mainnet
NEXT_PUBLIC_SOLANA_RPC_URLS=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SKR_MINT=<skr_mint_pubkey>
NEXT_PUBLIC_SKR_TREASURY=<treasury_wallet_pubkey>
```

For devnet testing, use devnet program, test mint, and treasury public keys only. Do not put wallet secrets in `.env`, Vercel, Android resources, or git.

Storage uploader configuration:

```bash
# optional: arweave or ipfs (defaults to arweave when ARWEAVE_JWK is present, else ipfs)
STORAGE_PROVIDER=ipfs

# for Pinata IPFS uploads
PINATA_JWT=<pinata_jwt>

# for Arweave uploads (JWK JSON)
ARWEAVE_JWK=<arweave_jwk_json>
```

## Current on-chain flow

- Build a template-specific draft.
- Premium templates check the matching template entitlement.
- If needed, build and submit `purchase_template` for that template.
- Upload sanitized page HTML through the gateway.
- Build and submit `record_publish` with domain, template, content URI, and page proof.
- Refresh chain state and render the receipt.

## Public resolver demo surfaces

- `https://skr.site` opens the Studio.
- `https://<name>.skr.site` resolves a published `.skr` page through wildcard routing.
- `https://skr.site/reverse` provides a wallet-to-.skr lookup page.
- `https://skr.site/api/reverse?wallet=<wallet>` returns the reverse lookup as JSON.

For production DNS, point `*.skr.site` to the deployed Next.js host and keep `skr.site` on the same deployment.

Before the wildcard domain is ready, use Vercel's generated domain for testing:

- Studio: `https://<project>.vercel.app`
- Forward resolver: `https://<project>.vercel.app/resolve/<name>`
- Find by wallet: `https://<project>.vercel.app/reverse`
- Reverse API: `https://<project>.vercel.app/api/reverse?wallet=<wallet>`

## Compliance note

- See `docs/compliance.md` for the v1 storage/resolver trust model and upload compliance decision.
