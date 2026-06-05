import { describe, expect, it } from "vitest";
import { constantTimeEqual, createSessionValue, sha256Hex, verifySessionValue } from "@/lib/auth";

describe("auth helpers", () => {
  it("hashes passwords with SHA-256 hex", async () => {
    await expect(sha256Hex("senha-forte")).resolves.toBe(
      "195cf28bb55cf5bdde684cb543459a0aeace8548d2efb148fd2a8cbb4bf77589"
    );
  });

  it("creates and verifies signed session values", async () => {
    const session = await createSessionValue("murbi", "secret");

    await expect(verifySessionValue(session, "secret", "murbi")).resolves.toBe(true);
    await expect(verifySessionValue(session, "wrong-secret", "murbi")).resolves.toBe(false);
    await expect(verifySessionValue(session, "secret", "outro-user")).resolves.toBe(false);
  });

  it("compares strings without short-circuiting on length", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });
});
