# SKR Publish Program

Anchor program for `.skr Studio` fully on-chain premium unlock + publish receipt recording.

## Invariants

- SKR mint must be `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`.
- Treasury owner must be `7NQnWRziGPj3XWRwyEZzqqfYhvPZjCHBtJ3g96QQXbDH`.
- First premium publish transfers exactly `1000 SKR` (`1_000_000_000` base units).
- After unlock, changing premium template charges `0.01 SOL` (`10_000_000` lamports).
- Free users (not unlocked) cannot rotate between free templates after first publish.
- Unlock state is wallet-scoped PDA.
- Publish receipt PDA is derived by wallet + content hash to block replay of identical content hash.
