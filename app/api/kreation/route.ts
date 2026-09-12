import { NextRequest, NextResponse } from "next/server";
import { buildKreationHtml, type KreationInput } from "@/app/lib/kreation";
import { generateKreationWithGrok, grokConfigured } from "@/app/lib/kreationGrok";
import { KREATION_GENERATE_SKR_UI } from "@/app/lib/sharedSpec";
import { verifyKreationPaymentTx } from "@/app/lib/chain";

export const maxDuration = 60;

function kreationInput(body: Partial<KreationInput> & { prompt: string }): KreationInput {
  return {
    name: typeof body.name === "string" ? body.name : "",
    pitch: typeof body.pitch === "string" ? body.pitch : "",
    photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : "",
    tint: typeof body.tint === "string" ? body.tint : "#00C9A7",
    links: Array.isArray(body.links) ? body.links.slice(0, 5) : [],
    prompt: body.prompt,
  };
}

export async function GET() {
  return NextResponse.json({
    previewFree: true,
    generateCostSkr: KREATION_GENERATE_SKR_UI,
    grok: grokConfigured(),
  });
}

export async function POST(request: NextRequest) {
  let body: Partial<KreationInput> & { signature?: string; wallet?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const input = kreationInput({ ...body, prompt });
  const signature = typeof body.signature === "string" ? body.signature.trim() : "";
  const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";

  if (!signature) {
    return NextResponse.json({ html: buildKreationHtml(input), source: "studio-generator" });
  }

  if (!wallet) {
    return NextResponse.json({ error: "wallet required for Grok generate" }, { status: 400 });
  }
  if (!grokConfigured()) {
    return NextResponse.json({ error: "Grok is not configured on the server" }, { status: 503 });
  }

  const paid = await verifyKreationPaymentTx({ signature, wallet, prompt });
  if (!paid.ok) {
    return NextResponse.json({ error: paid.error }, { status: 402 });
  }

  try {
    const html = await generateKreationWithGrok(input);
    return NextResponse.json({ html, source: "grok", paidSkr: KREATION_GENERATE_SKR_UI, signature });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Grok generate failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
