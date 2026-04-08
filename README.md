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

Set the deployed custom program ID:

```bash
NEXT_PUBLIC_SKR_PROGRAM_ID=<deployed_program_pubkey>
```

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

- Build publish payload (domain/template/hash/uri).
- Build atomic transaction with:
  1. `unlock_and_record_publish` custom program instruction.
  2. ANS `.skr` record writes using live mainnet `Create`/`Update` instruction shape.
- Sign/send through wallet provider.

## Compliance note

- See `docs/compliance.md` for the v1 storage/resolver trust model and upload compliance decision.
