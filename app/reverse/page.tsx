import Image from "next/image";
import Link from "next/link";
import { reverseResolveWallet } from "@/app/lib/resolver";

export default async function ReversePage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  const { wallet = "" } = await searchParams;
  const result = wallet.trim() ? await reverseResolveWallet(wallet) : null;

  return (
    <main className="resolver-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="panel card-glow resolver-card">
        <Image src="/brand/skr-logo.jpg" alt=".skr Studio chrome raven logo" width={78} height={78} className="hero-logo brand-logo" />
        <span className="chip">Find by wallet</span>
        <h1>Find a .skr by wallet</h1>
        <p>Paste a Solana wallet address to find its .skr name and open the public page.</p>

        <form className="reverse-form" action="/reverse">
          <label className="field">
            Wallet address
            <input name="wallet" defaultValue={wallet} placeholder="Paste a Solana wallet address" />
          </label>
          <button className="btn btn-primary" type="submit">Find .skr name</button>
        </form>

        {result && (
          <div className="resolver-result">
            {result.status === "found" ? (
              <>
                <span className="chip">Name found</span>
                <h2>{result.domain}</h2>
                <p>This wallet is connected to a .skr identity.</p>
                <div className="wallet-box">
                  <strong>Wallet</strong>
                  <span className="mono">{result.wallet}</span>
                  {result.domains.length > 1 ? <small>{result.domains.length} .skr names found</small> : <small>Primary profile ready</small>}
                </div>
                <div className="row">
                  {result.profileUrl ? <a className="btn btn-primary" href={result.profileUrl}>Open public page</a> : null}
                  <Link className="btn btn-ghost" href="/">Open Studio</Link>
                </div>
              </>
            ) : (
              <>
                <span className="chip">No match yet</span>
                <h2>Nothing published for this wallet</h2>
                <p>{result.message}</p>
                <div className="row">
                  <Link className="btn btn-primary" href="/">Create a .skr page</Link>
                  <Link className="btn btn-ghost" href="/reverse">Try another wallet</Link>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
