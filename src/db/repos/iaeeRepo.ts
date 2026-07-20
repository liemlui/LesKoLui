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

export async function listIaEeProjects(studentId: string): Promise<IaEeProject[]> {
  return db.iaeeProjects.where({ studentId }).sortBy("createdAt");
}

export async function updateIaEeProject(id: string, patch: Partial<IaEeProject>): Promise<void> {
  await db.iaeeProjects.update(id, { ...patch, updatedAt: timestamp() });
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
