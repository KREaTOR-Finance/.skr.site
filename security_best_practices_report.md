# Security Best Practices Report

## Executive Summary
A focused security pass was completed for the on-chain purchase and publish flow in the Next.js gateway and Anchor program. The main in-app risks around HTML injection and unsafe URL handling were remediated in this pass. One dependency-level high-severity advisory remains in the Solana token dependency tree and requires a breaking change path to fully remediate.

## Critical Findings
No open critical findings.

## High Findings

### SBP-001: Transitive dependency advisory in Solana token stack (open)
- Severity: High
- Location: dependency graph (`@solana/spl-token` -> `@solana/buffer-layout-utils` -> `bigint-buffer`)
- Evidence:
  - `npm audit --omit=dev` reports `GHSA-3gc7-fjrx-p6mg` against `bigint-buffer`.
  - `npm audit fix` cannot remediate without `--force` and a breaking dependency change.
- Impact: Potential vulnerability exposure through transitive parsing utility if exploitable paths are reachable via library usage.
- Fix:
  1. Evaluate and test upgrade path for Solana stack versions that remove vulnerable transitive dependency.
  2. If no non-breaking path exists, schedule controlled breaking upgrade and regression test blockchain flows.
- Mitigation:
  - Keep package lock pinned.
  - Avoid processing untrusted binary buffers outside expected Solana RPC payload formats.
  - Re-run `npm audit` during CI and block new critical/high advisories.
- False positive notes: exploitability depends on runtime reachability and exact vulnerable code path usage, but advisory should still be treated as a release gate risk.

## Medium Findings
No open medium findings.

## Low Findings

### SBP-002: HTML/content injection risk in published template output (fixed in this pass)
- Severity: Low (after fix)
- Location:
  - `app/lib/publish.ts:4`
  - `app/lib/publish.ts:20`
  - `app/components/StudioApp.tsx:843`
- Evidence:
  - User-controlled fields are now escaped before insertion into generated HTML.
  - Links are URL-sanitized to allow only `http/https` or relative paths.
- Impact: Prior to fix, crafted input could have produced scriptable HTML in generated profile content.
- Fix applied:
  - Added `escapeHtml`, `sanitizeHref`, and `sanitizeCssColor` in publish path.
  - Escaped dynamic template section fields in editor section builder.
- Mitigation: Keep generated HTML assembly centralized and avoid new unescaped raw string insertion paths.
- False positive notes: if future callers pass raw HTML directly via `extraSections`, this risk can reappear.

### SBP-003: Insecure RPC transport configuration risk (fixed in this pass)
- Severity: Low (after fix)
- Location: `app/lib/chain.ts:70`
- Evidence:
  - RPC list normalization now filters to `https` endpoints (or localhost `http` for local development only).
- Impact: Prevents accidental cleartext transport in production RPC configuration.
- Fix applied: RPC URL validation + failover filtering.
- Mitigation: keep production env values in `NEXT_PUBLIC_SOLANA_RPC_URLS` strictly `https`.

## Security Enhancements Implemented In This Pass
1. RPC failover strategy with retry behavior across configured providers (`app/lib/chain.ts:113`).
2. Purchase preflight checks for unlock flow (token account existence and SKR balance) (`app/lib/chain.ts:520`).
3. User-safe chain error decoding for wallet/program errors (`app/lib/chain.ts:149`).
4. Input/output hardening in publish HTML generation (`app/lib/publish.ts:4`, `app/lib/publish.ts:20`).

## Validation Run
- `npm run lint` (gateway): pass
- `npm run build` (gateway): pass
- `npm audit fix`: executed (moderate issue removed)
- `npm audit --omit=dev`: still reports one high advisory (`bigint-buffer` transitive)
