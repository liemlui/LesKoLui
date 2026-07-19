import { describe, it, expect } from "vitest";
import { encryptJson, decryptJson, hashPin, verifyPin, isHashedPin } from "../lib/crypto";

async function encryptV1ForCompatibilityTest(
  value: unknown,
  passphrase: string,
  preHeaderFormat = false,
): Promise<Blob> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(value))));
  const output = new Uint8Array((preHeaderFormat ? 28 : 34) + ciphertext.length);
  if (preHeaderFormat) {
    output.set(salt, 0);
    output.set(iv, 16);
    output.set(ciphertext, 28);
  } else {
    output.set([0x4C, 0x4B, 0x55, 0x49, 0x00, 0x01], 0);
    output.set(salt, 6);
    output.set(iv, 22);
    output.set(ciphertext, 34);
  }
  return new Blob([output]);
}

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

  it("uses the versioned encryption header", async () => {
    const blob = await encryptJson({ x: 1 }, "header-test");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes.slice(0, 4)).toEqual(new Uint8Array([0x4C, 0x4B, 0x55, 0x49]));
    expect((bytes[4] << 8) | bytes[5]).toBe(2);
    expect(new DataView(bytes.buffer).getUint32(6, false)).toBe(600_000);
  });

  it("still decrypts v1 backup files", async () => {
    const data = { version: 1, data: { students: [] } };
    const blob = await encryptV1ForCompatibilityTest(data, "backup-lama");
    await expect(decryptJson(blob, "backup-lama")).resolves.toEqual(data);
  });

  it("still decrypts pre-header legacy backup files", async () => {
    const data = { legacy: true };
    const blob = await encryptV1ForCompatibilityTest(data, "backup-lama", true);
    await expect(decryptJson(blob, "backup-lama")).resolves.toEqual(data);
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
  }, 20_000);

  it("rejects wrong PIN", async () => {
    const hash = await hashPin("999999");
    const ok = await verifyPin("000000", hash);
    expect(ok).toBe(false);
  }, 20_000);

  it("different PINs produce different hashes", async () => {
    const h1 = await hashPin("111111");
    const h2 = await hashPin("222222");
    expect(h1).not.toBe(h2);
  }, 20_000);

  it("same PIN produces different hash each time (unique salt)", async () => {
    const h1 = await hashPin("123456");
    const h2 = await hashPin("123456");
    expect(h1).not.toBe(h2);
    // But both should verify
    expect(await verifyPin("123456", h1)).toBe(true);
    expect(await verifyPin("123456", h2)).toBe(true);
  }, 20_000);
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
