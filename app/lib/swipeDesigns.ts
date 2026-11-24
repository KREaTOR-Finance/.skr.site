import { TINTS, identityBlock, type SiteBlock, type SiteBlockType, type SiteTheme } from "./siteBlocks";
import { homePage, updatePageBlocks, type StudioSite } from "./sitePages";

export const BLEND_UNLOCK_KEEPS = 3;
export const SWIPE_DECK_SIZE = 12;

export type { SiteTheme } from "./siteBlocks";

export type ClashKey = keyof SiteTheme | "tint" | "sectionOrder";

export type SwipeDesign = SiteTheme & {
  id: string;
  name: string;
  themeId: string;
  orderId: string;
  orderLabel: string;
  tint: string;
  sectionOrder: SiteBlockType[];
};

const THEMES: Array<SiteTheme & { id: string; label: string; tint: string }> = [
  { id: "teal-glass", label: "Teal glass", tint: TINTS[0].value, typography: "display", density: "comfortable", background: "glass", stampStyle: "grid", shopStyle: "rows" },
  { id: "violet-editorial", label: "Violet editorial", tint: TINTS[1].value, typography: "editorial", density: "comfortable", background: "flat", stampStyle: "stack", shopStyle: "featured" },
  { id: "chrome-mesh", label: "Chrome mesh", tint: TINTS[2].value, typography: "display", density: "compact", background: "mesh", stampStyle: "grid", shopStyle: "rows" },
  { id: "night-market", label: "Night market", tint: TINTS[0].value, typography: "sans", density: "comfortable", background: "nebula", stampStyle: "grid", shopStyle: "featured" },
];

const ORDERS: Array<{ id: string; label: string; sectionOrder: SiteBlockType[] }> = [
  { id: "passport-first", label: "Passport first", sectionOrder: ["identity", "stamps", "skr", "shop", "links", "about"] },
  { id: "shop-first", label: "Shop first", sectionOrder: ["identity", "shop", "stamps", "links", "skr", "about"] },
  { id: "shop-after-stamps", label: "Stamps then shop", sectionOrder: ["identity", "stamps", "shop", "links", "about", "skr"] },
];

export function generateSwipeDeck(): SwipeDesign[] {
  const designs: SwipeDesign[] = [];
  for (const theme of THEMES) {
    for (const order of ORDERS) {
      designs.push({
        id: `${theme.id}__${order.id}`,
        name: theme.label,
        themeId: theme.id,
        orderId: order.id,
        orderLabel: order.label,
        tint: theme.tint,
        typography: theme.typography,
        density: theme.density,
        background: theme.background,
        stampStyle: theme.stampStyle,
        shopStyle: theme.shopStyle,
        sectionOrder: [...order.sectionOrder],
      });
    }
  }
  return designs.slice(0, SWIPE_DECK_SIZE);
}

export function sameSectionOrder(a: SiteBlockType[], b: SiteBlockType[]): boolean {
  return a.length === b.length && a.every((type, index) => type === b[index]);
}

export function fieldValue(design: SwipeDesign, key: ClashKey): string {
  if (key === "sectionOrder") return design.sectionOrder.join(",");
  if (key === "tint") return design.tint;
  return String(design[key]);
}

export function clashKeys(kept: SwipeDesign[]): ClashKey[] {
  if (kept.length < 2) return [];
  const keys: ClashKey[] = ["tint", "typography", "density", "background", "stampStyle", "shopStyle", "sectionOrder"];
  return keys.filter((key) => kept.some((design) => fieldValue(design, key) !== fieldValue(kept[0], key)));
}

export function blendKeptDesigns(
  kept: SwipeDesign[],
  swaps: Partial<Record<ClashKey, string>> = {},
): SwipeDesign {
  if (!kept.length) throw new Error("Keep at least one design before blending");
  const latest = kept[kept.length - 1];
  const pick = (key: ClashKey): SwipeDesign => {
    const id = swaps[key];
    return (id && kept.find((design) => design.id === id)) || latest;
  };
  const tintSource = pick("tint");
  const typeSource = pick("typography");
  const densitySource = pick("density");
  const bgSource = pick("background");
  const stampSource = pick("stampStyle");
  const shopSource = pick("shopStyle");
  const orderSource = pick("sectionOrder");
  return {
    ...latest,
    id: "blend",
    name: "Your blend",
    themeId: "blend",
    orderId: orderSource.orderId,
    orderLabel: orderSource.orderLabel,
    tint: tintSource.tint,
    typography: typeSource.typography,
    density: densitySource.density,
    background: bgSource.background,
    stampStyle: stampSource.stampStyle,
    shopStyle: shopSource.shopStyle,
    sectionOrder: [...orderSource.sectionOrder],
  };
}

export function canBlend(kept: SwipeDesign[]): boolean {
  return kept.length >= BLEND_UNLOCK_KEEPS;
}

export function cycleSwap(
  kept: SwipeDesign[],
  key: ClashKey,
  currentDesignId?: string,
): string {
  if (!kept.length) return "";
  const unique = kept.filter((design, index) => kept.findIndex((other) => fieldValue(other, key) === fieldValue(design, key)) === index);
  const currentIndex = Math.max(0, unique.findIndex((design) => design.id === currentDesignId));
  return unique[(currentIndex + 1) % unique.length]?.id ?? unique[0].id;
}

export function themeFromDesign(design: SwipeDesign): SiteTheme {
  return {
    typography: design.typography,
    density: design.density,
    background: design.background,
    stampStyle: design.stampStyle,
    shopStyle: design.shopStyle,
  };
}

export function applyDesignToSite(site: StudioSite, design: SwipeDesign): StudioSite {
  const home = homePage(site);
  const identity = identityBlock(home.blocks);
  const used = new Set<string>();
  const ordered: SiteBlock[] = [];
  const push = (block?: SiteBlock) => {
    if (!block || used.has(block.id)) return;
    used.add(block.id);
    ordered.push(block.type === "identity" ? { ...block, tint: design.tint } : block);
  };
  push(identity);
  for (const type of design.sectionOrder) {
    if (type === "identity") continue;
    push(home.blocks.find((block) => block.type === type));
  }
  for (const block of home.blocks) push(block);
  return {
    ...updatePageBlocks(site, home.id, ordered),
    theme: themeFromDesign(design),
  };
}

export function applyTagline(site: StudioSite, tagline: string): StudioSite {
  const home = homePage(site);
  return updatePageBlocks(site, home.id, home.blocks.map((block) => (
    block.type === "identity" ? { ...block, tagline: tagline.slice(0, 140) } : block
  )));
}

export function applyTint(site: StudioSite, tint: string): StudioSite {
  const home = homePage(site);
  return updatePageBlocks(site, home.id, home.blocks.map((block) => (
    block.type === "identity" ? { ...block, tint } : block
  )));
}

export function applySectionOrder(site: StudioSite, sectionOrder: SiteBlockType[]): StudioSite {
  const dummy: SwipeDesign = {
    id: "tweak",
    name: "Tweak",
    themeId: "tweak",
    orderId: "tweak",
    orderLabel: "Custom",
    tint: identityBlock(homePage(site).blocks).tint,
    typography: site.theme?.typography ?? "display",
    density: site.theme?.density ?? "comfortable",
    background: site.theme?.background ?? "glass",
    stampStyle: site.theme?.stampStyle ?? "grid",
    shopStyle: site.theme?.shopStyle ?? "rows",
    sectionOrder,
  };
  return applyDesignToSite(site, dummy);
}

export function homeSectionOrder(site: StudioSite): SiteBlockType[] {
  return homePage(site).blocks.map((block) => block.type);
}
