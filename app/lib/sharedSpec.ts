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

export const BRAND = {
  bg: "#0A0A0A",
  teal: "#00C9A7",
  chrome: "#BEBEBE",
  chromeLight: "#E8E8E8",
  text: "#F0F0F0",
  muted: "#888888",
};

export const templates: TemplateDefinition[] = [
  { id: "personal-bio", title: "Personal Bio", description: "Free default profile", emoji: "👤", premium: false, screen: "home", image: "/seeker/13fac6c6-dfad-4c21-9719-9d36207341c5.jpg" },
  { id: "social-hub", title: "Social Hub", description: "Community links and socials", emoji: "🌐", premium: true, screen: "socialhub", image: "/seeker/23e396f4-d235-44aa-88d2-76a447661e92.jpg" },
  { id: "shop", title: "Shop", description: "Sell goods priced in SKR", emoji: "🛒", premium: true, screen: "shopstore", image: "/seeker/65d15055-54ce-4448-ae0c-81df21169c7b.jpg" },
  { id: "calendar", title: "Calendar", description: "Events and RSVPs", emoji: "📅", premium: true, screen: "calendarevents", image: "/seeker/7bacfb70-390e-4020-8f6e-14b4476ab332.jpg" },
  { id: "health", title: "Health & Fitness", description: "Metrics and streaks", emoji: "🏋️", premium: true, screen: "healthfitness", image: "/seeker/ae73a8c4-be73-4d6b-9d2c-c0c8853663d5.jpg" },
  { id: "portfolio", title: "Creator Portfolio", description: "Gallery and media", emoji: "🎨", premium: true, screen: "creatorportfolio", image: "/seeker/c1f20297-bc8f-432e-9109-52a156b33052.jpg" },
  { id: "organization", title: "DAO Governance", description: "Votes, delegations, treasury", emoji: "🏢", premium: true, screen: "daogovernance", image: "/seeker/cee457f5-fd04-4acd-bd4f-953053dcfaaf.jpg" },
  { id: "link-in-bio", title: "Link-in-Bio", description: "Tip jars and stacked links", emoji: "🔗", premium: true, screen: "linkbio", image: "/seeker/f45801fe-0371-44bb-9403-37968e647454.jpg" },
  { id: "bring-your-own", title: "Bring Your Own", description: "Upload custom template package", emoji: "🧩", premium: true, screen: "editor", image: "/seeker/image (1).jpg" },
];

export const freeTemplateIds = templates.filter((t) => !t.premium).map((t) => t.id);
export const premiumTemplateIds = templates.filter((t) => t.premium).map((t) => t.id);
