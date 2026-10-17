/**
 * Penjaga endpoint kurs (`api/kurs-usd-idr`).
 *
 * Dua hal yang menentukan benar-tidaknya angka rupiah di aplikasi:
 * 1. sumber utama dipakai, sumber kedua memeriksa silang;
 * 2. kalau sumber utama mati, kurs **tetap** didapat dari pembanding — atau
 *    ditolak dengan status galat, tidak pernah ditebak.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/kurs-usd-idr.js";

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

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Tiruan `fetch` per potongan URL; URL tak dikenal = galat. */
function tiruFetch(peta: Record<string, () => Response | Promise<Response>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const cocok = Object.entries(peta).find(([kunci]) => String(url).includes(kunci));
      if (!cocok) throw new Error(`URL tak terduga: ${url}`);
      return cocok[1]();
    }),
  );
}

const PRIMER_OK = () => json({ amount: 1, base: "USD", date: "2026-10-16", rates: { IDR: 18_031 } });
const PEMBANDING_OK = () =>
  json({
    result: "success",
    time_last_update_utc: "Sat, 17 Oct 2026 00:02:32 +0000",
    rates: { IDR: 18_014.6 },
  });

afterEach(() => vi.unstubAllGlobals());

describe("endpoint kurs USD→IDR", () => {
  it("menolak metode selain GET", async () => {
    const res = resBuatan();
    await handler({ method: "POST" }, res);
    expect(res.code).toBe(405);
  });

  it("memakai sumber utama dan melaporkan tanggal kursnya", async () => {
    tiruFetch({ frankfurter: PRIMER_OK, "open.er-api": PEMBANDING_OK });
    const res = resBuatan();

    await handler({ method: "GET" }, res);

    expect(res.code).toBe(200);
    expect(res.headers["Cache-Control"]).toContain("s-maxage=3600");
    const body = res.body as { usdIdr: number; source: string; rateDate: string; warnings: string[] };
    expect(body.usdIdr).toBe(18_031);
    expect(body.source).toBe("frankfurter");
    expect(body.rateDate).toBe("2026-10-16");
    expect(body.warnings).toEqual([]);
  });

  it("memberi peringatan saat kedua sumber berbeda jauh", async () => {
    tiruFetch({
      frankfurter: PRIMER_OK,
      "open.er-api": () =>
        json({ result: "success", time_last_update_utc: "Sat, 17 Oct 2026 00:02:32 +0000", rates: { IDR: 19_500 } }),
    });
    const res = resBuatan();

    await handler({ method: "GET" }, res);

    expect(res.code).toBe(200);
    const body = res.body as { warnings: string[] };
    expect(body.warnings.join(" ")).toMatch(/berbeda/i);
  });

  it("memakai sumber pembanding saat sumber utama mati", async () => {
    tiruFetch({
      frankfurter: async () => {
        throw new Error("jaringan mati");
      },
      "open.er-api": PEMBANDING_OK,
    });
    const res = resBuatan();

    await handler({ method: "GET" }, res);

    expect(res.code).toBe(200);
    const body = res.body as { source: string; usdIdr: number; warnings: string[] };
    expect(body.source).toBe("exchangerate-api");
    expect(body.usdIdr).toBeCloseTo(18_014.6, 1);
    expect(body.warnings.join(" ")).toMatch(/utama gagal/i);
  });

  it("membalas 502 saat kedua sumber gagal — tidak menebak kurs", async () => {
    tiruFetch({
      frankfurter: async () => {
        throw new Error("mati");
      },
      "open.er-api": async () => {
        throw new Error("mati juga");
      },
    });
    const res = resBuatan();

    await handler({ method: "GET" }, res);

    expect(res.code).toBe(502);
    expect(res.body as { error: string }).toHaveProperty("error");
  });

  it("menolak sumber yang angkanya di luar rentang wajar", async () => {
    tiruFetch({
      frankfurter: () => json({ amount: 1, base: "USD", date: "2026-10-16", rates: { IDR: 999 } }),
      "open.er-api": () => json({ result: "success", rates: { IDR: 1 } }),
    });
    const res = resBuatan();

    await handler({ method: "GET" }, res);

    expect(res.code).toBe(502);
  });
});
