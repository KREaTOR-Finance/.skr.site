import Image from "next/image";
import Link from "next/link";
import { resolveSkrDomain } from "@/app/lib/resolver";

export default async function ResolvePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const result = await resolveSkrDomain(name);
  const title = result.status === "published"
    ? `${result.domain} is live`
    : result.status === "empty"
      ? `${result.domain} is waiting for its page`
      : "This .skr needs a second look";

  if (result.status === "published" && result.url) {
    return (
      <main className="resolver-shell resolver-frame-shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        <section className="resolver-toolbar">
          <div>
            <span className="chip">Live .skr page</span>
            <h1>{result.domain}</h1>
          </div>
          <div className="row">
            <Link className="btn btn-ghost btn-sm" href="/">Open Studio</Link>
            <a className="btn btn-primary btn-sm" href={result.url} target="_blank" rel="noopener noreferrer">Open page</a>
          </div>
        </section>
        <iframe
          title={`${result.domain} public page`}
          className="resolver-frame"
          src={result.url}
          sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
        />
      </main>
    );
  }

  return (
    <main className="resolver-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <section className="panel card-glow resolver-card">
        <Image src="/brand/skr-logo.jpg" alt=".skr Studio chrome raven logo" width={86} height={86} className="hero-logo brand-logo" />
        <span className="chip">.skr resolver</span>
        <h1>{title}</h1>
        <p>{result.message ?? "This name is ready for a beautiful Seeker-native public page."}</p>
        <div className="wallet-box">
          <strong>{result.domain}</strong>
          {result.owner ? <span className="mono">{result.owner}</span> : <span>Not published yet</span>}
          {result.template ? <small>Template: {result.template}</small> : <small>Create the first public page in Studio.</small>}
        </div>
        <div className="row">
          <Link className="btn btn-primary" href="/">Build this page</Link>
          <Link className="btn btn-ghost" href="/reverse">Find a .skr by wallet</Link>
        </div>
      </section>
    </main>
  );
}
