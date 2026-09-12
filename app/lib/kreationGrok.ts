import {
  extractKreationHtmlFromModel,
  type KreationInput,
  sanitizeKreationColor,
  sanitizeKreationHref,
} from "./kreation";

const XAI_CHAT_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-4-fast-non-reasoning";

export function grokConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

function grokModel(): string {
  return process.env.XAI_MODEL?.trim() || DEFAULT_MODEL;
}

function systemPrompt(): string {
  return [
    "You generate one complete static HTML document for a .skr Seeker ID page.",
    "Return HTML only. No markdown. No explanation.",
    "Glass/teal/chrome on #0A0A0A. Mobile-first. Unique layout from the prompt.",
    "No <script>, no iframe, no onclick, no javascript: URLs, no wallet connect UI, no Seed Vault copy, no fake payments.",
    "Use the provided name, pitch, tint, photo, and links. HTTPS links only.",
    "Keep under 40k characters.",
  ].join(" ");
}

export async function generateKreationWithGrok(input: KreationInput): Promise<string> {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) throw new Error("Grok is not configured");

  const name = input.name.trim() || "your";
  const tint = sanitizeKreationColor(input.tint);
  const links = input.links
    .filter((item) => item.label.trim())
    .slice(0, 5)
    .map((item) => `${item.label.trim()}: ${sanitizeKreationHref(item.url)}`)
    .join("\n");

  const user = [
    `Name: ${name}`,
    `Domain: ${name.replace(/\.skr$/i, "")}.skr`,
    `Pitch: ${input.pitch.trim() || "Seeker ID"}`,
    `Tint: ${tint}`,
    `Photo: ${input.photoUrl.trim() || "(none)"}`,
    `Links:\n${links || "(none)"}`,
    `Site build prompt:\n${input.prompt.trim()}`,
  ].join("\n");

  const res = await fetch(XAI_CHAT_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: grokModel(),
      temperature: 0.7,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: user },
      ],
    }),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Grok request failed (${res.status})`);
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Grok returned an empty page");
  return extractKreationHtmlFromModel(content);
}
