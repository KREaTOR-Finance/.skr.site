# Instruction Invariants

`unlock_and_record_publish(args)`

1. `domain`, `template_id`, and `content_uri` must fit max lengths.
2. `mint` account must equal hardcoded SKR mint.
3. `treasury_owner` must equal hardcoded treasury wallet.
4. `payer_token_account` authority must be signer `payer`.
5. If premium and unlock not initialized/unlocked:
   - CPI transfer_checked sends exact unlock amount to treasury token account.
   - unlock account marked unlocked.
6. If already unlocked and premium template changes:
   - system transfer moves exact `10_000_000` lamports (`0.01 SOL`) to treasury owner.
7. For non-unlocked free users:
   - first free template publish is allowed.
   - switching to a different free template is rejected.
8. Publish receipt is initialized at deterministic PDA; duplicate hash replay fails.
