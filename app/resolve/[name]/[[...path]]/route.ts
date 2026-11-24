import { NextRequest, NextResponse } from "next/server";
import { resolveSkrDomain } from "@/app/lib/resolver";
import { joinPublishedUrl } from "@/app/lib/sitePages";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string; path?: string[] }> },
) {
  const { name, path } = await context.params;
  const result = await resolveSkrDomain(name);
  const pathname = `/${(path ?? []).join("/")}`;

  if (result.status === "published" && result.url) {
    const target = joinPublishedUrl(result.url, pathname);
    if (!target) {
      return new NextResponse("Not found", { status: 404 });
    }
    try {
      const upstream = await fetch(target, { redirect: "follow", cache: "no-store" });
      if (!upstream.ok) {
        return new NextResponse("This published page could not be loaded.", { status: upstream.status === 404 ? 404 : 502 });
      }
      const contentType = upstream.headers.get("content-type") ?? "text/html; charset=utf-8";
      const body = await upstream.arrayBuffer();
      return new NextResponse(body, {
        status: 200,
        headers: {
          "content-type": contentType,
          "x-skr-source": "published-proxy",
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    } catch {
      return new NextResponse("This published page could not be loaded.", { status: 502 });
    }
  }

  if (!path?.length) {
    const url = request.nextUrl.clone();
    url.pathname = `/card/${name}`;
    url.search = "";
    return NextResponse.rewrite(url);
  }

  return new NextResponse("This .skr has no page at this path yet.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
