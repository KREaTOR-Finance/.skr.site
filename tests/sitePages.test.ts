import { describe, expect, it } from "vitest";
import {
  addPage,
  createDefaultSite,
  demoCreatorSite,
  homePage,
  joinPublishedUrl,
  movePage,
  navPages,
  pageFilePath,
  relativeHref,
  removePage,
  renamePage,
  renderSiteBundle,
  resolvePublishedAssetPath,
  setPageInNav,
  siteDomainName,
  uniqueSlug,
  updatePageSlug,
  validateSite,
} from "../app/lib/sitePages";
import { buildArweavePathManifest, manifestRootUrl } from "../app/lib/siteManifest";
import { identityBlock } from "../app/lib/siteBlocks";

describe("multi-page site model", () => {
  it("pins a card-seeded Home page at /", () => {
    const site = createDefaultSite("creator");
    const home = homePage(site);
    expect(home.kind).toBe("home");
    expect(home.slug).toBe("");
    expect(home.title).toBe("Home");
    expect(home.blocks.map((block) => block.type)).toEqual(["identity", "skr", "links", "about"]);
    expect(siteDomainName(site)).toBe("creator.skr");
    expect(identityBlock(home.blocks).name).toBe("creator");
  });

  it("adds, slugs, renames, hides, and reorders pages without moving Home", () => {
    let site = createDefaultSite("you");
    site = addPage(site, { starterId: "about" });
    site = addPage(site, { starterId: "projects" });
    site = addPage(site, { title: "About" });
    expect(site.pages.map((page) => page.slug)).toEqual(["", "about", "projects", "about-2"]);
    site = renamePage(site, site.pages[1].id, "Our story");
    expect(site.pages[1]).toMatchObject({ title: "Our story", slug: "our-story" });
    const projectsId = site.pages[2].id;
    site = movePage(site, projectsId, -1);
    expect(site.pages[1].slug).toBe("projects");
    expect(site.pages[0].kind).toBe("home");
    site = setPageInNav(site, projectsId, false);
    expect(navPages(site).map((page) => page.slug)).toEqual(["", "our-story", "about-2"]);
    site = removePage(site, site.pages[0].id);
    expect(site.pages[0].kind).toBe("home");
    expect(uniqueSlug(site.pages, "projects")).toBe("projects-2");
    expect(updatePageSlug(site, site.pages[0].id, "nope").pages[0].slug).toBe("");
  });

  it("renders a site bundle with top-bar nav, relative links, SEO, favicon, and mailto contact", () => {
    const site = demoCreatorSite();
    const files = renderSiteBundle(site, { wallet: "8U2K3VZuXXV6wGrVEbAXFYfVZFEoRBApYpMjDuzCgPM2", isSeeker: true });
    const paths = files.map((file) => file.path);
    expect(paths).toEqual(expect.arrayContaining([
      "index.html",
      "about/index.html",
      "projects/index.html",
      "blog/index.html",
      "contact/index.html",
      "blog/hello-seeker/index.html",
      "favicon.svg",
    ]));
    const home = files.find((file) => file.path === "index.html")!.content;
    const projects = files.find((file) => file.path === "projects/index.html")!.content;
    const contact = files.find((file) => file.path === "contact/index.html")!.content;
    const blog = files.find((file) => file.path === "blog/index.html")!.content;
    expect(home).toContain('class="site-nav"');
    expect(home).toContain("creator");
    expect(home).toContain('href="projects/"');
    expect(home).not.toContain('site-nav collapse');
    expect(home).toContain("SEEKER");
    expect(projects).toContain("<title>Projects · creator.skr</title>");
    expect(projects).toContain('rel="canonical" href="https://creator.skr.site/projects"');
    expect(projects).toContain('href="../contact/"');
    expect(projects).toContain('href="../"');
    expect(projects).toContain("Get in touch");
    expect(projects).not.toContain("Live .skr page");
    expect(projects).not.toContain("resolver-toolbar");
    expect(contact).toContain('href="mailto:hello@skr.site"');
    expect(blog).toContain("Hello Seeker");
    expect(blog).toContain("blog/hello-seeker/");
    expect(files.find((file) => file.path === "favicon.svg")!.content).toContain("<svg");
  });

  it("collapses the top nav after four links", () => {
    let site = createDefaultSite("you");
    for (const title of ["About", "Projects", "Blog", "Contact", "Notes"]) {
      site = addPage(site, { title });
    }
    const html = renderSiteBundle(site).find((file) => file.path === "index.html")!.content;
    expect(html).toContain("site-nav collapse");
    expect(html).toContain('for="nav-toggle">Menu');
  });

  it("maps public paths onto a published manifest root", () => {
    expect(resolvePublishedAssetPath("/")).toBe("index.html");
    expect(resolvePublishedAssetPath("/about")).toBe("about/index.html");
    expect(resolvePublishedAssetPath("/about/")).toBe("about/index.html");
    expect(resolvePublishedAssetPath("/favicon.svg")).toBe("favicon.svg");
    expect(resolvePublishedAssetPath("/../secret")).toBeNull();
    expect(joinPublishedUrl("https://arweave.net/MANIFESTID", "/projects")).toBe(
      "https://arweave.net/MANIFESTID/projects/index.html",
    );
    expect(pageFilePath("blog/hello")).toBe("blog/hello/index.html");
    expect(relativeHref("blog/hello", "about")).toBe("../../about/");
    expect(validateSite(createDefaultSite(""))[0]).toMatch(/Identity/i);
  });
});

describe("Arweave path manifest", () => {
  it("builds a path manifest whose root serves index.html", () => {
    const manifest = buildArweavePathManifest([
      { path: "index.html", txId: "AAA" },
      { path: "about/index.html", txId: "BBB" },
      { path: "favicon.svg", txId: "CCC" },
    ]);
    expect(manifest).toEqual({
      manifest: "arweave/paths",
      version: "0.2.0",
      index: { path: "index.html" },
      paths: {
        "index.html": { id: "AAA" },
        "about/index.html": { id: "BBB" },
        "favicon.svg": { id: "CCC" },
      },
    });
    expect(manifestRootUrl("MANIFEST")).toBe("https://arweave.net/MANIFEST/");
    expect(() => buildArweavePathManifest([{ path: "about/index.html", txId: "BBB" }])).toThrow(/index.html/);
  });
});

describe("wildcard path mapping", () => {
  it("sends every name.skr.site path to /resolve/label/path", () => {
    const rewrite = (pathname: string, label = "creator") => `/resolve/${label}${pathname === "/" ? "" : pathname}`;
    expect(rewrite("/")).toBe("/resolve/creator");
    expect(rewrite("/about")).toBe("/resolve/creator/about");
    expect(rewrite("/blog/hello-seeker")).toBe("/resolve/creator/blog/hello-seeker");
  });
});
