import type { TemplateDefinition } from "./types";

export const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
export const SKR_DECIMALS = 6;
export const SKR_UNLOCK_AMOUNT_UI = 1000;
export const SKR_UNLOCK_AMOUNT_RAW = 1_000_000_000;
export const SKR_TREASURY = "7NQnWRziGPj3XWRwyEZzqqfYhvPZjCHBtJ3g96QQXbDH";
export const TEMPLATE_CHANGE_FEE_SOL = 0.01;
export const TEMPLATE_CHANGE_FEE_LAMPORTS = 10_000_000;

export const ANS_PROGRAM_ID = "ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK";
export const ANS_CREATE_DISCRIMINATOR_HEX = "181ec828051c0777";
export const ANS_UPDATE_DISCRIMINATOR_HEX = "dbc858b09e3ffd7f";
export const DEFAULT_RECORD_SPACE = 512;

export const STUDIO_TEMPLATE_ID = "studio";
export const HTML_TEMPLATE_ID = "bring-your-own";
export const STUDIO_ALIAS_IDS = [STUDIO_TEMPLATE_ID, HTML_TEMPLATE_ID] as const;

export const STUDIO_TINTS = [
  { id: "teal", value: "#00C9A7", label: "Teal" },
  { id: "violet", value: "#8B7CFF", label: "Violet" },
  { id: "gold", value: "#D4AF37", label: "Gold" },
] as const;

export const BRAND = {
  bg: "#0A0A0A",
  teal: "#00C9A7",
  chrome: "#BEBEBE",
  chromeLight: "#E8E8E8",
  text: "#F0F0F0",
  muted: "#888888",
};

export const templates: TemplateDefinition[] = [
  {
    id: STUDIO_TEMPLATE_ID,
    title: "Studio",
    description: "Theme your Seeker ID card. Custom HTML is optional and paid.",
    mark: "S",
    premium: false,
    screen: "editor",
    image: "/seeker/image (1).jpg",
  },
];

export const freeTemplateIds = templates.filter((t) => !t.premium).map((t) => t.id);
export const premiumTemplateIds = [HTML_TEMPLATE_ID];

export function isStudioEntitlementId(templateId: string): boolean {
  return (STUDIO_ALIAS_IDS as readonly string[]).includes(templateId);
}

export function isHtmlEntitlementId(templateId: string): boolean {
  return templateId === HTML_TEMPLATE_ID;
}
