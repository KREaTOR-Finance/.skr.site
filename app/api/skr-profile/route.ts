import { NextRequest, NextResponse } from "next/server";
import { isSolanaPubkey } from "@/app/lib/resolver";
import { loadSkrProfile } from "@/app/lib/skrProfile";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet") ?? "";
  if (!isSolanaPubkey(wallet)) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }
  try {
    const profile = await loadSkrProfile(wallet);
    return NextResponse.json(profile, {
      headers: { "Cache-Control": "public, s-maxage=12, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ error: "profile unavailable" }, { status: 502 });
  }
}
