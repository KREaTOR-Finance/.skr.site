# skr.site Hackathon Submission

## One-Line Pitch

skr.site turns a `.skr` Solana name into a beautiful public page, a mobile Studio, and a wallet-first identity link.

## Problem

Solana builders have wallets, domains, links, shops, events, and communities spread across too many places. A `.skr` name should work like a portable identity page that is easy to publish, easy to discover, and clear enough to demo in seconds.

## Solution

skr.site gives every `.skr` owner a Seeker-styled Studio to choose a template, publish a public page, and let anyone find that page by name or by wallet.

## What Works Today

- Forward resolver: `name.skr.site` resolves a `.skr` name to its published page or a friendly default page.
- Reverse resolver: `/reverse` and `/api/reverse?wallet=` find the `.skr` identity connected to a Solana wallet.
- Studio: users can connect a wallet, unlock premium templates, edit template content, upload HTML, and publish records.
- Storage: published HTML uploads through the gateway to Arweave or IPFS.
- Mobile proof: signed Android APK is available for Seeker device testing.

## Demo Script

1. Open `https://skr.site` and show the Studio landing screen.
2. Open `https://<demo>.skr.site` and show the public resolver page.
3. Open `https://skr.site/reverse`, paste a demo wallet, and show wallet to `.skr` lookup.
4. Show the Studio template flow or Seeker APK preview.
5. End with: "Your wallet has an address. Your `.skr` gives it a home."

## Submission Links

- Live app: `https://skr.site`
- Demo forward page: `https://<demo>.skr.site`
- Reverse resolver: `https://skr.site/reverse`
- APK release: `v1.0.1` or newer release asset

## Vercel Test Links

Use these while testing on the generated Vercel domain:

- Studio: `https://<project>.vercel.app`
- Forward resolver: `https://<project>.vercel.app/resolve/<demo>`
- Reverse resolver: `https://<project>.vercel.app/reverse`
- Reverse API: `https://<project>.vercel.app/api/reverse?wallet=<demo-wallet>`

Wildcard behavior stays in the app for the real domain, but generic Vercel testing should use `/resolve/<demo>`.

## Final Checklist

- `npm run test`
- `npm run build`
- `npm run lint`
- Wildcard DNS points `*.skr.site` at the deployed gateway.
- Demo wallet has at least one `.skr` name for reverse lookup.
- Demo `.skr` has a published `url` record for forward lookup.
