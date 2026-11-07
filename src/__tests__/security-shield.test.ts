import { describe, it, expect } from "vitest";
import { isScannerOrTestProbe, verifyDomainHasDeliverableMx } from "@/lib/email-shield";
import { generateShieldChallenge, verifyShieldSolution } from "@/lib/bot-shield";
import crypto from "crypto";

describe("Email Shield & Bot Protection", () => {
  it("identifies scanner and probe test emails", () => {
    expect(isScannerOrTestProbe("test@example.com")).toBe(true);
    expect(isScannerOrTestProbe("probe.123@domain.org")).toBe(true);
    expect(isScannerOrTestProbe("scanner@domain.com")).toBe(true);
    expect(isScannerOrTestProbe("vuln-test@domain.com")).toBe(true);
    expect(isScannerOrTestProbe("legit.user@gmail.com")).toBe(false);
  });

  it("identifies trusted email provider domains immediately", async () => {
    expect(await verifyDomainHasDeliverableMx("gmail.com")).toBe(true);
    expect(await verifyDomainHasDeliverableMx("yahoo.com")).toBe(true);
    expect(await verifyDomainHasDeliverableMx("outlook.com")).toBe(true);
  });

  it("generates and verifies static difficulty 4 bot challenge", () => {
    const challenge = generateShieldChallenge("192.168.1.1");
    expect(challenge.targetDifficulty).toBe(4);
    expect(challenge.salt).toBeDefined();

    // Solve the challenge (find nonce producing 4 leading zeroes)
    const prefix = "0000";
    let nonce = 0;
    let foundSolution = "";
    while (nonce < 1_000_000) {
      const hash = crypto
        .createHash("sha256")
        .update(`${challenge.salt}:${nonce}`)
        .digest("hex");
      if (hash.startsWith(prefix)) {
        foundSolution = nonce.toString();
        break;
      }
      nonce++;
    }

    expect(foundSolution).not.toBe("");

    // Verify valid solution
    const isValid = verifyShieldSolution(
      challenge.salt,
      challenge.timestamp,
      challenge.targetDifficulty,
      challenge.signature,
      foundSolution,
      "192.168.1.1"
    );
    expect(isValid).toBe(true);

    // Replay attack prevention: same solution should fail on second attempt
    const isReplay = verifyShieldSolution(
      challenge.salt,
      challenge.timestamp,
      challenge.targetDifficulty,
      challenge.signature,
      foundSolution,
      "192.168.1.1"
    );
    expect(isReplay).toBe(false);
  });
});
