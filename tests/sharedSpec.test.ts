import { describe, expect, it } from "vitest";
import { HTML_TEMPLATE_ID, premiumTemplateIds, templates } from "../app/lib/sharedSpec";
import { defaultDraftFor } from "../app/lib/templateDrafts";

describe("studio pricing", () => {
  it("keeps card theme free and HTML as the only paid option", () => {
    expect(templates[0]?.premium).toBe(false);
    expect(premiumTemplateIds).toEqual([HTML_TEMPLATE_ID]);
  });

  it("starts studio with no personal name", () => {
    const draft = defaultDraftFor("studio");
    expect(draft.headline).toBe("");
    expect(draft.subtext).toBe("Seeker ID");
  });
});
