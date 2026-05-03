import { NextRequest, NextResponse } from "next/server";
import { normalizeSkrDomain, resolveSkrDomain, reverseResolveWallet } from "@/app/lib/resolver";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet") ?? "";
  if (normalizeSkrDomain(wallet)) {
    const result = await resolveSkrDomain(wallet);
    const status = result.status === "invalid" ? 400 : result.status === "error" ? 502 : 200;
    return NextResponse.json(result, { status });
  }
  const result = await reverseResolveWallet(wallet);
  const status = result.status === "invalid" ? 400 : result.status === "error" ? 502 : 200;
  return NextResponse.json(result, { status });
}
