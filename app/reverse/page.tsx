import Image from "next/image";
import Link from "next/link";
import { normalizeSkrDomain, resolveSkrDomain, reverseResolveWallet } from "@/app/lib/resolver";

export default async function ReversePage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  const { wallet = "" } = await searchParams;
  const query = wallet.trim();
  const nameQuery = query ? normalizeSkrDomain(query) : null;
  const nameResult = nameQuery ? await resolveSkrDomain(query) : null;
  const result = query && !nameQuery ? await reverseResolveWallet(query) : null;

  return (
    <main className="resolver-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="panel card-glow resolver-card">
        <Image src="/brand/skr-logo.jpg" alt=".skr Studio chrome raven logo" width={78} height={78} className="hero-logo brand-logo" />
        <span className="chip">Find a .skr</span>
        <h1>Find a .skr profile</h1>
        <p>Search by Solana wallet or by a .skr name to open the public profile.</p>

        <form className="reverse-form" action="/reverse">
          <label className="field">
            Wallet or .skr name
            <input name="wallet" defaultValue={wallet} placeholder="Wallet address or name.skr" />
          </label>
          <button className="btn btn-primary" type="submit">Find profile</button>
        </form>

        {nameResult && (
          <div className="resolver-result">
            {nameResult.status === "published" ? (
              <>
                <span className="chip">Profile found</span>
                <h2>{nameResult.domain}</h2>
                <p>This .skr has a published public page.</p>
                <div className="wallet-box">
                  <strong>Name</strong>
                  <span>{nameResult.domain}</span>
                  {nameResult.owner ? <small className="mono">{nameResult.owner}</small> : null}
                </div>
                <div className="row">
                  <Link className="btn btn-primary" href={`/resolve/${nameResult.label}`}>Open profile</Link>
                  <Link className="btn btn-ghost" href="/">Open Studio</Link>
                </div>
              </>
            ) : nameResult.status === "empty" && nameResult.owner ? (
              <>
                <span className="chip">Default profile</span>
                <h2>{nameResult.domain}</h2>
                <p>This name is owned. A custom page has not been published yet, so we are showing the plain profile.</p>
                <div className="wallet-box">
                  <strong>Name</strong>
                  <span>{nameResult.domain}</span>
                  <strong>Wallet</strong>
                  <span className="mono">{nameResult.owner}</span>
                </div>
                <div className="row">
                  <Link className="btn btn-primary" href={`/resolve/${nameResult.label}`}>Open default profile</Link>
                  <Link className="btn btn-ghost" href="/reverse">Search again</Link>
                </div>
              </>
            ) : (
              <>
                <span className="chip">No profile yet</span>
                <h2>{nameResult.domain}</h2>
                <p>{nameResult.message ?? "We could not find a public profile for this name yet."}</p>
                <div className="row">
                  <Link className="btn btn-primary" href="/">Create a .skr page</Link>
                  <Link className="btn btn-ghost" href="/reverse">Search again</Link>
                </div>
              </>
            )}
          </div>
        )}

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
