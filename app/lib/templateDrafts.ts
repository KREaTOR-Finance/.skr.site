import { templates } from "./sharedSpec";

export type LinkItem = { label: string; url: string };
export type MetricItem = { label: string; value: string };
export type ProductItem = { name: string; price: string; category: string };
export type EventItem = { title: string; time: string; cta: string };
export type WorkoutItem = { name: string; duration: string; level: string };
export type ProposalItem = { title: string; status: string; category: string };
export type SupporterItem = { name: string; amount: string };
export type CoachItem = { name: string; session: string; price: string };
export type SessionItem = { name: string; price: string; duration: string };

type DraftBase = {
  templateId: string;
  headline: string;
  subtext: string;
  themeAccent: string;
  fontStyle: "Default" | "Bold" | "Italic";
  profileMark: string;
};

export type PersonalBioDraft = DraftBase & {
  templateId: "personal-bio";
  bio: string;
  links: LinkItem[];
};

export type SocialHubDraft = DraftBase & {
  templateId: "social-hub";
  socialLinks: LinkItem[];
  web3Links: LinkItem[];
  creatorLinks: LinkItem[];
  stats: MetricItem[];
  featuredCta: string;
};

export type ShopStoreDraft = DraftBase & {
  templateId: "shop";
  featuredDrop: ProductItem;
  products: ProductItem[];
  stats: MetricItem[];
  dropEndsIn: string;
};

export type CalendarDraft = DraftBase & {
  templateId: "calendar";
  events: EventItem[];
  bookingSlots: string[];
  sessions: SessionItem[];
  livestreamTitle: string;
  livestreamStartsIn: string;
};

export type HealthDraft = DraftBase & {
  templateId: "health";
  workouts: WorkoutItem[];
  metrics: MetricItem[];
  coaches: CoachItem[];
};

export type PortfolioDraft = DraftBase & {
  templateId: "portfolio";
  projects: LinkItem[];
  press: LinkItem[];
  contactCta: string;
};

export type DaoDraft = DraftBase & {
  templateId: "organization";
  treasury: string;
  proposals: ProposalItem[];
  delegates: LinkItem[];
};

export type LinkBioDraft = DraftBase & {
  templateId: "link-in-bio";
  links: LinkItem[];
  tipAmounts: string[];
  supporters: SupporterItem[];
  analytics: MetricItem[];
};

export type TemplateDraft =
  | PersonalBioDraft
  | SocialHubDraft
  | ShopStoreDraft
  | CalendarDraft
  | HealthDraft
  | PortfolioDraft
  | DaoDraft
  | LinkBioDraft;

export type DraftSummary = {
  title: string;
  subtitle: string;
  badge: string;
  stats: MetricItem[];
  modules: Array<{ title: string; desc: string }>;
  cta: string;
};

export function defaultDraftFor(templateId: string): TemplateDraft {
  switch (templateId) {
    case "social-hub":
      return {
        templateId: "social-hub",
        headline: "nakamura.skr",
        subtext: "Builder - Artist - Seeker native",
        themeAccent: "#00C9A7",
        fontStyle: "Default",
        profileMark: "S",
        socialLinks: [
          { label: "Twitter / X", url: "@nakamura_sol" },
          { label: "Instagram", url: "@nakamura.art" },
          { label: "TikTok", url: "@nakamura.builds" },
        ],
        web3Links: [
          { label: "Magic Eden", url: "12 NFTs" },
          { label: "GitHub", url: "34 repos" },
          { label: "Mirror", url: "7 essays" },
        ],
        creatorLinks: [
          { label: "Collaborate", url: "Open for projects" },
          { label: "Newsletter", url: "Weekly build notes" },
        ],
        stats: [
          { label: "Links", value: "12 live" },
          { label: "Clicks", value: "2,486" },
          { label: "CTR", value: "18.4%" },
        ],
        featuredCta: "Open for collaborations",
      };
    case "shop":
      return {
        templateId: "shop",
        headline: "nakamura.store",
        subtext: "NFTs - Merch - Digital Assets",
        themeAccent: "#FF9432",
        fontStyle: "Default",
        profileMark: "M",
        featuredDrop: { name: "Seeker Genesis #001", price: "2.5 SOL", category: "nft" },
        products: [
          { name: "Seeker Genesis #001", price: "2.5 SOL", category: "nft" },
          { name: "Shader Pack Vol.1", price: "0.3 SOL", category: "digital" },
          { name: ".skr Tee", price: "38 USDC", category: "merch" },
        ],
        stats: [
          { label: "Volume", value: "24 SOL" },
          { label: "Royalties", value: "3.2 SOL" },
          { label: "Sales", value: "47" },
        ],
        dropEndsIn: "02:47:18",
      };
    case "calendar":
      return {
        templateId: "calendar",
        headline: "Events",
        subtext: "Live sessions and bookings",
        themeAccent: "#6366F1",
        fontStyle: "Default",
        profileMark: "C",
        events: [
          { title: "Anchor Deep Dive", time: "Wed 10:00 AM", cta: "RSVP" },
          { title: "NFT Art Stream", time: "Thu 08:00 PM", cta: "RSVP" },
          { title: "Builders Meetup", time: "Fri 07:30 PM", cta: "Ticket" },
        ],
        bookingSlots: ["09:00", "10:00", "14:00", "16:00"],
        sessions: [
          { name: "Strategy Session", price: "0.5 SOL", duration: "45 min" },
          { name: "Code Review", price: "0.8 SOL", duration: "60 min" },
          { name: "Creator Mentoring", price: "0.4 SOL", duration: "30 min" },
        ],
        livestreamTitle: "Next creator livestream",
        livestreamStartsIn: "04:23:45",
      };
    case "health":
      return {
        templateId: "health",
        headline: "Fitness",
        subtext: "Goals, workouts and coaching",
        themeAccent: "#50DC64",
        fontStyle: "Default",
        profileMark: "F",
        workouts: [
          { name: "Upper Body Strength", duration: "45 min", level: "Intermediate" },
          { name: "HIIT Cardio Blast", duration: "30 min", level: "Advanced" },
          { name: "Evening Flow Yoga", duration: "40 min", level: "All levels" },
        ],
        metrics: [
          { label: "Move", value: "842/1000" },
          { label: "Exercise", value: "42/60" },
          { label: "Stand", value: "10/12" },
        ],
        coaches: [
          { name: "Coach Nova", session: "Strength", price: "0.5 SOL" },
          { name: "Coach Astra", session: "Mobility", price: "0.4 SOL" },
          { name: "Coach Vale", session: "Nutrition", price: "0.3 SOL" },
        ],
      };
    case "portfolio":
      return {
        templateId: "portfolio",
        headline: "Creator Portfolio",
        subtext: "Featured work and press",
        themeAccent: "#9945FF",
        fontStyle: "Default",
        profileMark: "A",
        projects: [
          { label: "Solana Generative Art Engine v2", url: "Featured" },
          { label: "Vortex Shader", url: "GLSL - WebGL" },
          { label: "SolGrid SDK", url: "TypeScript" },
        ],
        press: [
          { label: "Solana Compass", url: "Best generative art on Solana this year" },
          { label: "helius_xyz", url: "Exactly what builders needed" },
        ],
        contactCta: "Start a collaboration",
      };
    case "organization":
      return {
        templateId: "organization",
        headline: "VOID DAO",
        subtext: "Governance and treasury",
        themeAccent: "#7C83FF",
        fontStyle: "Default",
        profileMark: "D",
        treasury: "24,847 SOL",
        proposals: [
          { title: "Fund Solana SDK v3 Development", status: "Active", category: "funding" },
          { title: "Upgrade Governance Quorum to 60%", status: "Active", category: "protocol" },
          { title: "Elect Council Seat #4", status: "Voting", category: "election" },
        ],
        delegates: [
          { label: "Astra", url: "Protocol steward" },
          { label: "Nova", url: "Treasury lead" },
          { label: "Vale", url: "Community council" },
        ],
      };
    case "link-in-bio":
      return {
        templateId: "link-in-bio",
        headline: "kira.skr",
        subtext: "creator - builder - collector",
        themeAccent: "#F5A623",
        fontStyle: "Default",
        profileMark: "L",
        links: [
          { label: "Creator Portfolio", url: "kira.skr/portfolio" },
          { label: "NFT Collection", url: "magiceden.io/kira-genesis" },
          { label: "YouTube Channel", url: "youtube.com/@kira_builds" },
        ],
        tipAmounts: ["0.1 SOL", "0.5 SOL", "1 SOL", "Custom"],
        supporters: [
          { name: "vex.sol", amount: "1.0 SOL" },
          { name: "astra.sol", amount: "0.5 SOL" },
        ],
        analytics: [
          { label: "Views", value: "8,247" },
          { label: "Clicks", value: "5,628" },
        ],
      };
    default:
      return {
        templateId: "personal-bio",
        headline: "nakamura.skr",
        subtext: "Builder - Artist - Seeker",
        themeAccent: "#00C9A7",
        fontStyle: "Default",
        profileMark: "P",
        bio: "Building on Solana. Creating with pixels. Living on-chain.",
        links: [
          { label: "X", url: "https://x.com/nakamura_sol" },
          { label: "GitHub", url: "https://github.com/nakamura" },
        ],
      };
  }
}

export function createInitialTemplateDrafts(): Record<string, TemplateDraft> {
  return Object.fromEntries(
    templates
      .filter((template) => template.id !== "bring-your-own")
      .map((template) => [template.id, defaultDraftFor(template.id)]),
  );
}

export function validateDraft(draft: TemplateDraft): string[] {
  const errors: string[] = [];
  if (!draft.headline.trim()) errors.push("Add a page title");
  if (!draft.subtext.trim()) errors.push("Add a short intro");
  switch (draft.templateId) {
    case "personal-bio":
      if (!draft.bio.trim()) errors.push("Add your bio");
      if (!draft.links.some((item) => item.label.trim() && item.url.trim())) errors.push("Add at least one link");
      break;
    case "social-hub":
      if (!draft.socialLinks.some((item) => item.label.trim())) errors.push("Add at least one social link");
      break;
    case "shop":
      if (!draft.products.some((item) => item.name.trim())) errors.push("Add at least one product");
      break;
    case "calendar":
      if (!draft.events.some((item) => item.title.trim())) errors.push("Add at least one event");
      if (!draft.bookingSlots.some((item) => item.trim())) errors.push("Add at least one booking slot");
      break;
    case "health":
      if (!draft.workouts.some((item) => item.name.trim())) errors.push("Add at least one workout");
      break;
    case "portfolio":
      if (!draft.projects.some((item) => item.label.trim())) errors.push("Add at least one project");
      break;
    case "organization":
      if (!draft.proposals.some((item) => item.title.trim())) errors.push("Add at least one proposal");
      break;
    case "link-in-bio":
      if (!draft.links.some((item) => item.label.trim() && item.url.trim())) errors.push("Add at least one link");
      break;
  }
  return errors;
}

export function draftSummary(draft: TemplateDraft): DraftSummary {
  switch (draft.templateId) {
    case "personal-bio":
      return {
        title: draft.headline,
        subtitle: draft.subtext,
        badge: "Personal page",
        stats: [
          { label: "Links", value: String(draft.links.length) },
          { label: "Profile", value: "Live-ready" },
          { label: "Theme", value: draft.profileMark },
        ],
        modules: [
          { title: "About section", desc: draft.bio },
          { title: "Social links", desc: draft.links.map((item) => item.label).join(", ") },
        ],
        cta: "Publish profile",
      };
    case "social-hub":
      return {
        title: draft.headline,
        subtitle: draft.subtext,
        badge: draft.featuredCta,
        stats: draft.stats,
        modules: [
          { title: "Social links", desc: draft.socialLinks.map((item) => item.label).join(", ") },
          { title: "Web3 links", desc: draft.web3Links.map((item) => item.label).join(", ") },
          { title: "Creator links", desc: draft.creatorLinks.map((item) => item.label).join(", ") },
        ],
        cta: "Publish social hub",
      };
    case "shop":
      return {
        title: draft.headline,
        subtitle: draft.subtext,
        badge: `Featured drop: ${draft.featuredDrop.name}`,
        stats: draft.stats,
        modules: [
          { title: "Featured drop", desc: `${draft.featuredDrop.name} - ${draft.featuredDrop.price}` },
          { title: "Products", desc: draft.products.map((item) => item.name).join(", ") },
          { title: "Drop timer", desc: draft.dropEndsIn },
        ],
        cta: "Publish storefront",
      };
    case "calendar":
      return {
        title: draft.headline,
        subtitle: draft.subtext,
        badge: draft.livestreamTitle,
        stats: [
          { label: "Events", value: String(draft.events.length) },
          { label: "Slots", value: String(draft.bookingSlots.length) },
          { label: "Sessions", value: String(draft.sessions.length) },
        ],
        modules: [
          { title: "Events", desc: draft.events.map((item) => item.title).join(", ") },
          { title: "Booking slots", desc: draft.bookingSlots.join(", ") },
          { title: "Livestream", desc: draft.livestreamStartsIn },
        ],
        cta: "Publish events page",
      };
    case "health":
      return {
        title: draft.headline,
        subtitle: draft.subtext,
        badge: "Fitness page",
        stats: draft.metrics,
        modules: [
          { title: "Workouts", desc: draft.workouts.map((item) => item.name).join(", ") },
          { title: "Coaches", desc: draft.coaches.map((item) => item.name).join(", ") },
        ],
        cta: "Publish fitness page",
      };
    case "portfolio":
      return {
        title: draft.headline,
        subtitle: draft.subtext,
        badge: draft.contactCta,
        stats: [
          { label: "Projects", value: String(draft.projects.length) },
          { label: "Press", value: String(draft.press.length) },
          { label: "CTA", value: "Active" },
        ],
        modules: [
          { title: "Featured projects", desc: draft.projects.map((item) => item.label).join(", ") },
          { title: "Press", desc: draft.press.map((item) => item.label).join(", ") },
        ],
        cta: "Publish portfolio",
      };
    case "organization":
      return {
        title: draft.headline,
        subtitle: draft.subtext,
        badge: `Treasury ${draft.treasury}`,
        stats: [
          { label: "Treasury", value: draft.treasury },
          { label: "Proposals", value: String(draft.proposals.length) },
          { label: "Delegates", value: String(draft.delegates.length) },
        ],
        modules: [
          { title: "Proposals", desc: draft.proposals.map((item) => item.title).join(", ") },
          { title: "Delegates", desc: draft.delegates.map((item) => item.label).join(", ") },
        ],
        cta: "Publish governance hub",
      };
    case "link-in-bio":
      return {
        title: draft.headline,
        subtitle: draft.subtext,
        badge: "Supporter-ready page",
        stats: draft.analytics,
        modules: [
          { title: "Links", desc: draft.links.map((item) => item.label).join(", ") },
          { title: "Tip amounts", desc: draft.tipAmounts.join(", ") },
          { title: "Recent supporters", desc: draft.supporters.map((item) => item.name).join(", ") },
        ],
        cta: "Publish link page",
      };
  }
}
