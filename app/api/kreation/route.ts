import { NextRequest, NextResponse } from "next/server";
import { buildKreationHtml, type KreationInput } from "@/app/lib/kreation";

export async function POST(request: NextRequest) {
  let body: Partial<KreationInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const html = buildKreationHtml({
    name: typeof body.name === "string" ? body.name : "",
    pitch: typeof body.pitch === "string" ? body.pitch : "",
    photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : "",
    tint: typeof body.tint === "string" ? body.tint : "#00C9A7",
    links: Array.isArray(body.links) ? body.links.slice(0, 5) : [],
    prompt,
  });

  return NextResponse.json({ html, source: "studio-generator" });
}
