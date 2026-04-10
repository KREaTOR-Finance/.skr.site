# Seeker Device Test Checklist

## Build Preconditions
- [ ] Set release signing vars: `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`
- [x] `:app:compileDebugKotlin` passes
- [x] `testDebugUnitTest` passes

## Core Flow
- [ ] Launch app -> Splash -> About -> Home
- [ ] Template gallery opens all 8 template routes
- [ ] Premium template shows unlock gate when not purchased
- [ ] Wallet connect works (MWA session)
- [ ] Purchase flow completes and unlock state refreshes
- [ ] Publish flow completes and receipt renders signature/hash/link

## Template Parity
- [ ] Social Hub filters and sections behave correctly
- [ ] Shop filters/cart/buy-now/countdown work
- [ ] Calendar month nav/RSVP/ticket/booking/countdown work
- [ ] Health day selector/workout timer/coach sheet work
- [ ] Portfolio contact and view-all sheets open correctly
- [ ] DAO vote/delegate/create sheets work
- [ ] Link-in-Bio add-link/tip confirm/analytics toggles work

## Editor & Inputs
- [ ] Style controls update accent/font/icon and persist
- [ ] Typed input tables allow add/edit/reorder/delete where provided
- [ ] Validation blocks publish when required fields missing

## Navigation
- [ ] Top/bottom nav parity aligns with matrix
- [ ] Back-stack behavior is deterministic across template routes

## Release Sanity
- [ ] `:app:assembleRelease` succeeds with signing vars present
- [ ] Install signed APK on Seeker device
- [ ] Full core funnel tested once on physical device
