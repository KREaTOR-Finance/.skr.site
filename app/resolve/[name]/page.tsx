import Image from "next/image";
import Link from "next/link";
import SeekerIdCard from "@/app/components/SeekerIdCard";
import SiteHeader from "@/app/components/SiteHeader";
import { resolveSkrDomain, studioUrl } from "@/app/lib/resolver";
import { loadSkrProfile } from "@/app/lib/skrProfile";

export default async function ResolvePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const result = await resolveSkrDomain(name);
  const title = result.status === "published"
    ? `${result.domain} is live`
    : result.status === "empty"
      ? result.domain
      : "This .skr needs a second look";

  if (result.status === "published" && result.url) {
    return (
      <main className="resolver-shell resolver-frame-shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        <SiteHeader />
        <section className="resolver-toolbar">
          <div>
            <span className="chip">Live .skr page</span>
            <h1>{result.domain}</h1>
          </div>
          <div className="row">
            <a className="btn btn-ghost btn-sm" href={studioUrl(result.domain)}>Open Studio</a>
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

  if (result.status === "empty" && result.owner) {
    const profile = await loadSkrProfile(result.owner).catch(() => ({
      wallet: result.owner!,
      liquid: 0,
      staked: 0,
      yieldEarned: 0,
      unstaking: 0,
      total: 0,
      guardian: null,
      cooldownEndsAt: null,
      isSeeker: false,
      updatedAt: Date.now(),
      unavailable: true,
    }));
    return (
      <main className="resolver-shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        <SiteHeader />
        <SeekerIdCard domain={result.domain} owner={result.owner} picture={result.picture} initial={profile} />
      </main>
    );
  }

  return (
    <main className="resolver-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <SiteHeader />
      <section className="panel card-glow resolver-card">
      <Image src="/brand/skr-logo.jpg" alt=".skr Studio chrome raven logo" width={86} height={86} className="hero-logo brand-logo" />
        <span className="chip">Find a .skr page</span>
        <h1>{title}</h1>
        <p>{result.message ?? "This name is ready for a Seeker ID card."}</p>
        <div className="wallet-box">
          <strong>{result.domain}</strong>
          {result.owner ? <span className="mono">{result.owner}</span> : <span>Not claimed yet</span>}
        </div>
        <div className="row">
          <a className="btn btn-primary" href={studioUrl(result.domain)}>Build this page</a>
          <Link className="btn btn-ghost" href="/reverse">Find a .skr by wallet</Link>
        </div>
      </section>
    </main>
  );
}
