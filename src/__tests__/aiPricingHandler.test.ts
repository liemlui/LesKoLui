/**
 * Penjaga handler endpoint tarif (`api/deepseek-pricing`).
 *
 * Yang diuji di sini **bukan** parsing — itu sudah dijaga
 * `aiPricing.test.ts` terhadap fixture yang sama. Yang belum pernah diuji
 * adalah lapisan pembungkusnya: kode status, header cache, dan janji bahwa
 * kegagalan **tidak** dibalas dengan 200 berisi data separuh. Status itu yang
 * menentukan apakah klien menimpa tarif baik atau tidak.
 *
 * `fetch` diganti tiruan supaya tes tidak menyentuh jaringan.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/deepseek-pricing.js";
import { halamanTarif, TARIF_NORMAL } from "./tarifContoh";

interface ResBuatan {
  code: number;
  body: unknown;
  headers: Record<string, string>;
  status(code: number): ResBuatan;
  json(body: unknown): ResBuatan;
  setHeader(key: string, value: string): ResBuatan;
}

function resBuatan(): ResBuatan {
  const res: ResBuatan = {
    code: 0,
    body: undefined,
    headers: {},
    status(code) {
      res.code = code;
      return res;
    },
    json(body) {
      res.body = body;
      return res;
    },
    setHeader(key, value) {
      res.headers[key] = value;
      return res;
    },
  };
  return res;
}

function tiruFetch(perilaku: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(perilaku));
}

const HTML_BAGUS = halamanTarif(TARIF_NORMAL);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("endpoint tarif DeepSeek", () => {
  it("menolak metode selain GET", async () => {
    const res = resBuatan();
    await handler({ method: "POST" }, res);
    expect(res.code).toBe(405);
  });

  it("membalas 200 dengan provenance docs-live dan header cache saat tarif terbaca", async () => {
    tiruFetch(async () => new Response(HTML_BAGUS, { status: 200 }));
    const res = resBuatan();

    await handler({ method: "GET" }, res);

    expect(res.code).toBe(200);
    expect(res.headers["Cache-Control"]).toContain("s-maxage=21600");
    const body = res.body as { provenance: string; warnings: unknown[]; models: Record<string, unknown> };
    expect(body.provenance).toBe("docs-live");
    expect(body.warnings).toEqual([]);
    expect(body.models["deepseek-flash"]).toBeDefined();
  });

  it("membalas 422 — bukan 200 berisi data separuh — saat tabel berubah bentuk", async () => {
    tiruFetch(async () => new Response(halamanTarif({ ...TARIF_NORMAL, tanpaMiss: true }), { status: 200 }));
    const res = resBuatan();

    await handler({ method: "GET" }, res);

    expect(res.code).toBe(422);
    expect(res.headers["Cache-Control"]).toBeUndefined();
    expect((res.body as { error: string }).error).toMatch(/tidak/i);
  });

  it("membalas 502 saat dokumentasi membalas galat", async () => {
    tiruFetch(async () => new Response("nope", { status: 500 }));
    const res = resBuatan();

    await handler({ method: "GET" }, res);

    expect(res.code).toBe(502);
  });

  it("membalas 504 saat waktu habis", async () => {
    tiruFetch(async () => {
      const galat = new Error("timeout");
      galat.name = "TimeoutError";
      throw galat;
    });
    const res = resBuatan();

    await handler({ method: "GET" }, res);

    expect(res.code).toBe(504);
  });
});
