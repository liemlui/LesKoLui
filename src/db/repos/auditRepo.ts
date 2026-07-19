// ── Audit Trail (L-1) ──────────────────────────────────────────────
// Catatan lokal aksi penting. Best-effort: kegagalan log TIDAK boleh
// menggagalkan operasi utama (dibungkus try/catch oleh pemanggil bila perlu).

import { db } from "../db";
import type { AuditAction, AuditEntry } from "../types";
import { timestamp } from "./helpers";

export async function logAudit(
  action: AuditAction, entityType: string, entityId?: string, details?: string,
): Promise<void> {
  try {
    await db.auditLog.add({
      id: crypto.randomUUID(), action, entityType, entityId,
      timestamp: timestamp(), details,
    });
  } catch (e: unknown) {
    console.warn("audit log failed (non-critical):", e);
  }
}

export async function listAuditLog(limit = 50): Promise<AuditEntry[]> {
  return db.auditLog.orderBy("timestamp").reverse().limit(limit).toArray();
}

export async function clearAuditLog(): Promise<void> {
  await db.auditLog.clear();
}
