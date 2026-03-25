import { Connection } from "@solana/web3.js";
import { TldParser } from "@onsol/tldparser";

const RPC_URL = "https://api.mainnet-beta.solana.com";

async function resolveSkrName(subdomain: string) {
  if (!subdomain || subdomain === "www") {
    return { success: false, error: "No subdomain" };
  }

  const fullDomain = `${subdomain}.skr`;
  const connection = new Connection(RPC_URL, "confirmed");
  const parser = new TldParser(connection);

  try {
    const nameRecord = await parser.getNameRecordFromDomainTld(fullDomain);

    if (!nameRecord) {
      return { success: false, domain: fullDomain };
    }

    const records = nameRecord.records || {};
    const contentUrl = records.url || records.ipfs || records.arweave || records.redirect || records.website;

    return {
      success: true,
      domain: fullDomain,
      owner: nameRecord.owner?.toString(),
      content: contentUrl,
      pic: records.pic,
    };
  } catch (err) {
    console.error("Resolve error:", err);
    return { success: false, domain: fullDomain };
  }
}

export default async function SKRResolver({
  params,
}: {
  params?: { slug?: string[] };
}) {
  const subdomain = params?.slug?.[0] || 
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("name") : null) || 
    "demo";

  const result = await resolveSkrName(subdomain);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 text-white">.{subdomain}.skr</h1>
          <p className="text-zinc-400">This name is not registered yet.</p>
        </div>
      </div>
    );
  }

  if (result.content) {
    return <meta httpEquiv="refresh" content={`0; url=${result.content}`} />;
  }

  // Upgraded branded default profile
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-700">
        {/* Header */}
        <div className="h-40 bg-gradient-to-br from-emerald-950 to-zinc-900 relative">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="w-28 h-28 bg-zinc-800 rounded-2xl flex items-center justify-center text-7xl shadow-xl border-4 border-zinc-900">
              🐦‍⬛
            </div>
          </div>
        </div>

        <div className="pt-20 pb-10 px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tighter mb-3">{result.domain}</h1>
          <p className="text-emerald-400 flex items-center justify-center gap-2 mb-8">
            🐦‍⬛ Seeker Verified • On-chain • Live
          </p>

          <div className="bg-zinc-950 rounded-2xl p-6 mb-8 text-left">
            <div className="text-zinc-400 text-xs mb-1.5">OWNER WALLET</div>
            <p className="font-mono text-sm break-all text-emerald-300">{result.owner}</p>
          </div>

          <div className="space-y-3">
            <a
              href="https://alldomains.id"
              target="_blank"
              className="block w-full py-4 bg-white hover:bg-zinc-100 text-black font-semibold rounded-2xl transition active:scale-[0.98]"
            >
              Set your website / IPFS / link-in-bio now →
            </a>
          </div>

          <p className="text-xs text-zinc-500 mt-10">
            Powered by <span className="text-white font-medium">BuidlerLabsLLC</span> • .skr.site for Colosseum Hackathon
          </p>
        </div>
      </div>
    </div>
  );
}
