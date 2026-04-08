# PDA Map

- `unlock_pda = ["unlock", wallet_pubkey]`
  - Stores one-time premium unlock status.
- `receipt_pda = ["receipt", wallet_pubkey, content_hash_32]`
  - Stores immutable publish receipt for a specific content hash.

## Program constants
- `SKR_MINT = SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
- `SKR_TREASURY = 7NQnWRziGPj3XWRwyEZzqqfYhvPZjCHBtJ3g96QQXbDH`
- `UNLOCK_AMOUNT = 1_000_000_000` (1000 SKR with 6 decimals)
