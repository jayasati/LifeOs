"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireDbUserId } from "@/features/tasks/server/queries";
import { bumpTag } from "@/lib/cache-tags";
import {
  createEntrySchema,
  updateEntrySchema,
  type CreateEntryInput,
  type UpdateEntryInput,
} from "@/features/journal/schema";

async function syncTags(userId: string, tags: string[]) {
  if (tags.length === 0) return;
  await db.tag.createMany({
    data: tags.map((name) => ({ userId, name })),
    skipDuplicates: true,
  });
}

export async function createEntry(input: CreateEntryInput): Promise<string> {
  const userId = await requireDbUserId();
  const data = createEntrySchema.parse(input);
  const entry = await db.journalEntry.create({
    data: {
      userId,
      title: data.title?.trim() || null,
      content: data.content,
      mood: data.mood ?? null,
      imageUrl: data.imageUrl ?? null,
      tags: data.tags,
      date: new Date(),
    },
    select: { id: true },
  });
  await syncTags(userId, data.tags);
  bumpTag("analytics", "tags");
  revalidatePath("/journal");
  return entry.id;
}

export async function updateEntry(input: UpdateEntryInput) {
  const userId = await requireDbUserId();
  const data = updateEntrySchema.parse(input);
  await db.journalEntry.update({
    where: { id: data.id, userId },
    data: {
      title: data.title?.trim() || null,
      content: data.content,
      mood: data.mood ?? null,
      imageUrl: data.imageUrl ?? null,
      tags: data.tags,
    },
  });
  await syncTags(userId, data.tags);
  bumpTag("analytics", "tags");
  revalidatePath("/journal");
  revalidatePath(`/journal/${data.id}`);
}

export async function deleteEntry(id: string) {
  const userId = await requireDbUserId();
  await db.journalEntry.delete({ where: { id, userId } });
  bumpTag("analytics");
  revalidatePath("/journal");
  redirect("/journal");
}

export async function addTag(name: string) {
  const userId = await requireDbUserId();
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return;
  await db.tag.upsert({
    where: { userId_name: { userId, name: trimmed } },
    update: {},
    create: { userId, name: trimmed },
  });
}
