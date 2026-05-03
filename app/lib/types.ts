export type ScreenId =
  | "splash"
  | "art"
  | "home"
  | "wallet"
  | "profile"
  | "settings"
  | "social"
  | "templates"
  | "editor"
  | "preview"
  | "socialhub"
  | "shopstore"
  | "creatorportfolio"
  | "calendarevents"
  | "healthfitness"
  | "daogovernance"
  | "linkbio"
  | "publish";

export interface WalletSession {
  provider: "Phantom" | "Backpack" | "Solflare" | "SeedVault" | "Unknown";
  address: string;
  unlocked: boolean;
}

export interface TemplateLink {
  label: string;
  url: string;
}

export interface TemplateCustomization {
  headline: string;
  subtext: string;
  accentColor: string;
  mark: string;
  links: TemplateLink[];
}

export interface TemplateDefinition {
  id: string;
  title: string;
  description: string;
  mark: string;
  premium: boolean;
  screen: ScreenId;
  image: string;
}

export interface PublishPayload {
  domain: string;
  templateId: string;
  contentUri: string;
  contentHash: string;
  isPremium: boolean;
  metadata?: Record<string, string>;
}

export interface PublishResult {
  signature: string;
  contentUri: string;
  contentHash: string;
  publicUrl?: string;
}
