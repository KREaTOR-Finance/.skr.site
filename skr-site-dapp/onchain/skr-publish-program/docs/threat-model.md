# Threat Model (V1)

## Assets
- Wallet unlock state (premium entitlement)
- Publish receipts (wallet/domain/content hash linkage)
- Treasury SKR inflows
- Treasury SOL change-fee inflows

## Trust Boundaries
- Untrusted clients (web/android)
- Solana runtime and token program
- Domain resolver record writers

## Abuse Paths
- Forged mint account
- Underpayment / wrong decimals
- Wrong treasury recipient
- Bypassing post-unlock premium template change fee
- Free-user template rotation without unlock
- Replay of identical receipt hash
- Non-signer authority trying to transfer funds

## Mitigations
- Hard-address check for SKR mint and treasury owner
- Fixed amount and decimals in CPI transfer_checked
- Fixed lamports amount (`0.01 SOL`) for premium template change fee
- Signer requirement on payer authority
- Template policy check (`is_premium` must match hardcoded template map)
- Free-template lock for non-unlocked wallets after first publish
- Receipt PDA seeded by wallet+hash blocks duplicate hash replay
- Account constraints validate token mint/authority alignment
