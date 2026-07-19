// ── Homework Repository ────────────────────────────────────────────

import { db } from "../db";
import type { Homework, HomeworkStatus } from "../types";
import { timestamp, todayWIB } from "./helpers";

function resolvedHomeworkStatus(h: Pick<Homework, "status" | "dueAt">): HomeworkStatus {
  return h.status === "assigned" && h.dueAt && h.dueAt < todayWIB()
    ? "overdue"
    : h.status;
}

export async function createHomework(
  input: Omit<Homework, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id  = crypto.randomUUID();
  const now = timestamp();
  await db.homeworks.add({ ...input, id, createdAt: now, updatedAt: now });
  return id;
}

export async function listPendingHomework(studentId: string): Promise<Homework[]> {
  const rows  = await db.homeworks
    .where({ studentId })
    .filter((h) => h.status === "assigned" || h.status === "overdue")
    .sortBy("dueAt");
  return rows.map((h) => ({
    ...h,
    status: resolvedHomeworkStatus(h),
  }));
}

export async function listAllPendingHomework(): Promise<(Homework & { studentName?: string })[]> {
  const rows  = await db.homeworks
    .filter((h) => h.status === "assigned" || h.status === "overdue")
    .toArray();
  const studentIds = [...new Set(rows.map((h) => h.studentId))];
  const studMap   = new Map(
    await Promise.all(studentIds.map(async (id) => [id, (await db.students.get(id))?.name ?? "—"] as const))
  );
  return rows
    .map((h) => ({
      ...h,
      status: resolvedHomeworkStatus(h),
      studentName: studMap.get(h.studentId),
    }))
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
}

export async function listAllHomeworkFull(): Promise<(Homework & { studentName?: string })[]> {
  const rows  = await db.homeworks.toArray();
  const studentIds = [...new Set(rows.map((h) => h.studentId))];
  const studMap    = new Map(
    await Promise.all(studentIds.map(async (id) => [id, (await db.students.get(id))?.name ?? "—"] as const))
  );
  return rows
    .map((h) => ({
      ...h,
      status: resolvedHomeworkStatus(h),
      studentName: studMap.get(h.studentId),
    }))
    .sort((a, b) => (b.assignedAt ?? "").localeCompare(a.assignedAt ?? ""));
}

export async function updateHomework(id: string, patch: Partial<Homework>): Promise<void> {
  await db.homeworks.update(id, { ...patch, updatedAt: timestamp() });
}

export async function deleteHomework(id: string): Promise<void> {
  await db.homeworks.delete(id);
}

export async function markHomeworkDone(id: string): Promise<void> {
  await db.homeworks.update(id, { status: "done", updatedAt: timestamp() });
}

export async function markHomeworkNotDone(id: string): Promise<void> {
  await db.homeworks.update(id, { status: "not_done", updatedAt: timestamp() });
}

export async function setHomeworkStatus(id: string, status: HomeworkStatus): Promise<void> {
  await db.homeworks.update(id, { status, updatedAt: timestamp() });
}

export interface HomeworkStats {
  total: number;
  done: number;
  notDone: number;
  pending: number;
  completionRate: number;
}

export async function getHomeworkStats(studentId: string): Promise<HomeworkStats> {
  const all = await db.homeworks.where({ studentId }).toArray();
  const statuses = all.map(resolvedHomeworkStatus);
  const done    = statuses.filter((status) => status === "done").length;
  const notDone = statuses.filter((status) => status === "not_done" || status === "overdue").length;
  const pending = statuses.filter((status) => status === "assigned").length;
  const judged  = done + notDone;
  return {
    total: all.length,
    done, notDone, pending,
    completionRate: judged > 0 ? Math.round((done / judged) * 100) : 0,
  };
}

export type { HomeworkStatus };
