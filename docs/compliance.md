# AllDomains Upload Compliance (v1)

## Decision

- Content storage is handled by **Arweave/IPFS** uploads.
- `.skr` resolution is handled by **AllDomains ANS records** on Solana.
- Public AllDomains docs currently document records/programs, not a hosted content-upload API.

References:

- https://docs.alldomains.id/protocol/developer-guide/records-api
- https://docs.alldomains.id/protocol/developer-guide/records-svm
- https://docs.alldomains.id/protocol/developer-guide/programs-svm-and-smart-contracts-evm

## Trust Model

- Unlock/payment enforcement is fully on-chain in `unlock_and_record_publish`.
- Backend upload endpoint is not trusted for payment state or premium entitlement.
- Backend upload endpoint only submits bytes to Arweave/IPFS and returns resulting URI metadata.

## Web Publish Sequence

1. Render HTML from template customization.
2. Upload HTML via storage adapter (`/api/upload`) to Arweave or IPFS.
3. Build and sign atomic transaction:
   - custom program instruction (`unlock_and_record_publish`)
   - ANS record writes (`url` required, optional `ARWV`/`IPFS`/`pic`/`template`)
4. Confirm transaction and persist publish receipt.

## Android Alignment

- Android uses the same upload contract shape:
  - input: `html`, `domain`, `templateId`, optional `provider`
  - output: `contentUri`, `publicUrl`, `contentHash`, `provider`, `metadataRecords`
- Provider selection and optional credentials are injected through build config for controlled environments.

## Future Swap Path

- If AllDomains publishes an official content-upload API, only the storage adapter implementation changes.
- On-chain instruction flow and UI publish flow stay unchanged.
