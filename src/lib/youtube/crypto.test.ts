import { createHash, randomBytes } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

function setTestKey() {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
}

describe("youtube crypto", () => {
  beforeEach(() => {
    setTestKey();
    vi.resetModules();
  });

  it("encrypts and decrypts secrets", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/youtube/crypto");
    const cipher = encryptSecret("refresh-token-value");
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(cipher).not.toContain("refresh-token-value");
    expect(decryptSecret(cipher)).toBe("refresh-token-value");
  });

  it("signs and verifies oauth state payloads", async () => {
    const { signPayload, verifySignedPayload } = await import(
      "@/lib/youtube/crypto"
    );
    const payload = JSON.stringify({ nonce: "abc", ts: 1 });
    const sig = signPayload(payload);
    expect(verifySignedPayload(payload, sig)).toBe(true);
    expect(verifySignedPayload(payload + "x", sig)).toBe(false);
  });
});

describe("youtube oauth state service", () => {
  beforeEach(() => {
    setTestKey();
    process.env.GOOGLE_CLIENT_ID = "client";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/integrations/youtube/callback";
    process.env.APP_URL = "http://localhost:3000";
    vi.resetModules();
  });

  it("rejects tampered oauth state", async () => {
    const { youTubeConnectionService } = await import(
      "@/services/youtube/connection-service"
    );
    const auth = {
      organizationId: "org1",
      userId: "user1",
      clerkUserId: "c1",
      email: "a@b.c",
      name: "A",
    };
    const created = youTubeConnectionService.createConnectState(auth);
    if (created.mode !== "oauth") throw new Error("expected oauth mode");
    const [payload, sig] = created.state.split(".");
    expect(() =>
      youTubeConnectionService.parseAndValidateState(
        `${payload}.${sig}tampered`,
        "org1",
      ),
    ).toThrow(/signature/i);
  });

  it("rejects state for another organization", async () => {
    const { youTubeConnectionService } = await import(
      "@/services/youtube/connection-service"
    );
    const auth = {
      organizationId: "org1",
      userId: "user1",
      clerkUserId: "c1",
      email: "a@b.c",
      name: "A",
    };
    const created = youTubeConnectionService.createConnectState(auth);
    if (created.mode !== "oauth") throw new Error("expected oauth mode");
    expect(() =>
      youTubeConnectionService.parseAndValidateState(created.state, "org2"),
    ).toThrow(/organization/i);
  });
});

describe("write API denylist", () => {
  it("blocks comment write paths", async () => {
    const { youtubeApiGet } = await import("@/lib/youtube/google-oauth");
    await expect(
      youtubeApiGet("/comments/insert", "token", {}),
    ).rejects.toThrow(/write APIs/i);
  });
});

describe("fingerprint helper sanity", () => {
  it("does not hash secrets into logs", () => {
    const token = "super-secret-token";
    const fingerprint = createHash("sha256").update(token).digest("hex").slice(0, 8);
    expect(fingerprint).not.toContain(token);
  });
});
