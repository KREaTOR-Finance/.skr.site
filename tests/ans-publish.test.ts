import { describe, expect, it } from "vitest";
import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  assembleAnsOnlyPublishInstructions,
  assertAnsOnlyPublishInstructions,
  buildRecordEntries,
} from "../app/lib/chain";
import { ANS_PROGRAM_ID } from "../app/lib/sharedSpec";
import { BLOCK_PAGE_TEMPLATE_ID } from "../app/lib/siteBlocks";

const SKR_PROGRAM = new PublicKey("8krPuBvS8nKkQ5fhqeHAAhY47Y9b6iG6XU4Ut5xtf1fH");
const ANS = new PublicKey(ANS_PROGRAM_ID);

function ansWrite(): TransactionInstruction {
  return new TransactionInstruction({
    programId: ANS,
    keys: [
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1, 2, 3]),
  });
}

describe("ANS-only free publish", () => {
  it("builds a transaction with compute budget + AllDomains writes and no custom program", () => {
    const instructions = assembleAnsOnlyPublishInstructions([ansWrite(), ansWrite()]);
    expect(instructions[0]?.programId.equals(ComputeBudgetProgram.programId)).toBe(true);
    expect(instructions.filter((ix) => ix.programId.equals(ANS)).length).toBe(2);
    expect(instructions.some((ix) => ix.programId.equals(SKR_PROGRAM))).toBe(false);
    expect(() => assertAnsOnlyPublishInstructions(instructions, SKR_PROGRAM)).not.toThrow();
  });

  it("rejects a set that includes the SKR publish program", () => {
    const mixed = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      new TransactionInstruction({ programId: SKR_PROGRAM, keys: [], data: Buffer.from([0]) }),
      ansWrite(),
    ];
    expect(() => assertAnsOnlyPublishInstructions(mixed, SKR_PROGRAM)).toThrow(/must not include the custom SKR program/);
  });

  it("still writes url and template records for a free block page", () => {
    expect(buildRecordEntries({
      domain: "you.skr",
      templateId: BLOCK_PAGE_TEMPLATE_ID,
      contentUri: "ar://page",
      contentHash: "ab",
      isPremium: false,
      metadata: { url: "https://arweave.net/page" },
    })).toEqual([
      { record: "url", value: "https://arweave.net/page" },
      { record: "template", value: "studio" },
    ]);
  });
});
