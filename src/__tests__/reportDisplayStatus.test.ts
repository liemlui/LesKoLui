import { describe, expect, it } from "vitest";
import { reportDisplayStatus, reportStatus } from "../db/types";

describe("reportDisplayStatus", () => {
  it("menampilkan Draft untuk laporan draft", () => {
    expect(reportDisplayStatus({ status: "draft" })).toBe("draft");
  });

  it("menampilkan Final untuk laporan confirmed yang belum diekspor/dibagikan", () => {
    expect(reportDisplayStatus({ status: "confirmed" })).toBe("final");
    expect(reportDisplayStatus({ status: "confirmed", pdfGeneratedAt: undefined })).toBe("final");
  });

  it("menampilkan Sudah dibagikan bila pdfGeneratedAt terisi", () => {
    expect(reportDisplayStatus({ status: "confirmed", pdfGeneratedAt: "2026-08-27T10:00:00.000Z" })).toBe("shared");
  });

  it("laporan lama tanpa status tetap dianggap final (bukan draft)", () => {
    expect(reportStatus({})).toBe("confirmed");
    expect(reportDisplayStatus({})).toBe("final");
  });
});
