"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { settingsSchema } from "@/lib/validation/admin";
import { firstError, formObject, type ActionState } from "@/lib/action-state";

export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const parsed = settingsSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await prisma.setting.update({ where: { id: 1 }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

export async function toggleEnquiryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const id = String(fd.get("id") ?? "");
  const resolved = fd.get("resolved") === "true";
  await prisma.contactEnquiry.update({ where: { id }, data: { resolved } });
  revalidatePath("/admin/enquiries");
  return { ok: true, message: resolved ? "Marked as resolved." : "Marked as open." };
}
