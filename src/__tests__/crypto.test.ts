import { describe, it, expect } from "vitest";
import { encryptJson, decryptJson, hashPin, verifyPin, isHashedPin } from "../lib/crypto";

describe("encryptJson / decryptJson roundtrip", () => {
  it("encrypts and decrypts JSON data", async () => {
    const data = { name: "Test Murid", sessions: [{ id: "1", cost: 150000 }] };
    const passphrase = "kuda-lari-ke-sawah";

    const blob = await encryptJson(data, passphrase);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(34); // header + salt + iv + ciphertext

    const decrypted = await decryptJson(blob, passphrase);
    expect(decrypted).toEqual(data);
  });

  it("rejects wrong passphrase", async () => {
    const blob = await encryptJson({ x: 1 }, "pass-a");
    await expect(decryptJson(blob, "pass-b")).rejects.toThrow();
  });

  it("handles empty objects", async () => {
    const blob = await encryptJson({}, "test");
    const decrypted = await decryptJson(blob, "test");
    expect(decrypted).toEqual({});
  });

  it("handles arrays", async () => {
    const blob = await encryptJson([1, "dua", { tiga: true }], "test");
    const decrypted = await decryptJson(blob, "test");
    expect(decrypted).toEqual([1, "dua", { tiga: true }]);
  });

  it("handles unicode passphrases", async () => {
    const pass = "küda-lari-ke-sāwāh-日本語";
    const blob = await encryptJson({ msg: "halo" }, pass);
    const decrypted = await decryptJson(blob, pass);
    expect(decrypted).toEqual({ msg: "halo" });
  });
});

describe("hashPin / verifyPin", () => {
  it("hashes and verifies correctly", async () => {
    const hash = await hashPin("123456");
    expect(hash).toMatch(/^pbkdf2v2:[a-f0-9]{32}:[a-f0-9]{64}$/);

    const ok = await verifyPin("123456", hash);
    expect(ok).toBe(true);
  });

  it("rejects wrong PIN", async () => {
    const hash = await hashPin("999999");
    const ok = await verifyPin("000000", hash);
    expect(ok).toBe(false);
  });

  it("different PINs produce different hashes", async () => {
    const h1 = await hashPin("111111");
    const h2 = await hashPin("222222");
    expect(h1).not.toBe(h2);
  });

  it("same PIN produces different hash each time (unique salt)", async () => {
    const h1 = await hashPin("123456");
    const h2 = await hashPin("123456");
    expect(h1).not.toBe(h2);
    // But both should verify
    expect(await verifyPin("123456", h1)).toBe(true);
    expect(await verifyPin("123456", h2)).toBe(true);
  });
});

describe("isHashedPin", () => {
  it("identifies PBKDF2 hashes", () => {
    expect(isHashedPin("pbkdf2v2:1234567890abcdef1234567890abcdef:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")).toBe(true);
  });

  it("identifies legacy SHA-256 hashes", () => {
    expect(isHashedPin("a".repeat(64))).toBe(true);
  });

  it("rejects plaintext", () => {
    expect(isHashedPin("123456")).toBe(false);
  });

  it("rejects empty/undefined", () => {
    expect(isHashedPin(undefined)).toBe(false);
    expect(isHashedPin("")).toBe(false);
  });
});
