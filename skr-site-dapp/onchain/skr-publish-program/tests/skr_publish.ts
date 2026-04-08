import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";

describe("skr_publish_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SkrPublishProgram as Program;

  it("derives unlock PDA deterministically", async () => {
    const [unlockPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("unlock"), provider.publicKey.toBuffer()],
      program.programId,
    );
    assert.isTrue(anchor.web3.PublicKey.isOnCurve(unlockPda.toBytes()) === false);
  });
});
