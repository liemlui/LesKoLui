// ── IA / EE Projects Repository ───────────────────────────────────

import { db } from "../db";
import type { IaEeProject, IaEeMilestone } from "../types";
import { timestamp } from "./helpers";

export async function createIaEeProject(
  input: Omit<IaEeProject, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id = crypto.randomUUID();
  const now = timestamp();
  await db.iaeeProjects.add({ ...input, id, createdAt: now, updatedAt: now });
  return id;
}

/**
 * Menyunting proyek yang sudah ada (keputusan pemilik 2026-10-09, K3).
 *
 * Sebelum ini satu-satunya jalan memperbaiki judul yang salah ketik adalah
 * menghapus proyek — dan milestone-nya ikut hilang. Kosongkan patch kalau tidak
 * ada yang berubah supaya `updatedAt` tidak naik tanpa sebab.
 *
 * `studentId` sengaja TIDAK bisa diubah: memindahkan proyek ke murid lain
 * mengubah siapa yang punya data itu, bukan sekadar menyunting isinya.
 * `milestones` juga tidak lewat sini — ia punya fungsi sendiri supaya tidak ada
 * dua jalur yang bisa saling menimpa.
 */
export type IaEeProjectPatch = Partial<
  Pick<IaEeProject, "type" | "subject" | "title" | "deadline" | "notes">
>;

export async function updateIaEeProject(id: string, patch: IaEeProjectPatch): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await db.iaeeProjects.update(id, { ...patch, updatedAt: timestamp() });
}

export async function listIaEeProjects(studentId: string): Promise<IaEeProject[]> {
  return db.iaeeProjects.where({ studentId }).sortBy("createdAt");
}

export async function deleteIaEeProject(id: string): Promise<void> {
  await db.iaeeProjects.delete(id);
}

export async function addMilestone(projectId: string, milestone: IaEeMilestone): Promise<void> {
  const project = await db.iaeeProjects.get(projectId);
  if (!project) throw new Error("Project not found");
  await db.iaeeProjects.update(projectId, {
    milestones: [...project.milestones, milestone],
    updatedAt: timestamp(),
  });
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  patch: Partial<IaEeMilestone>
): Promise<void> {
  const project = await db.iaeeProjects.get(projectId);
  if (!project) throw new Error("Project not found");
  const updatedMilestones = project.milestones.map((m) =>
    m.id === milestoneId ? { ...m, ...patch } : m
  );
  await db.iaeeProjects.update(projectId, {
    milestones: updatedMilestones,
    updatedAt: timestamp(),
  });
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
  const project = await db.iaeeProjects.get(projectId);
  if (!project) throw new Error("Project not found");
  await db.iaeeProjects.update(projectId, {
    milestones: project.milestones.filter((m) => m.id !== milestoneId),
    updatedAt: timestamp(),
  });
}
