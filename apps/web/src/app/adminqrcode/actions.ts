"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Widget, WidgetBreakpointLayout, WidgetType } from "@portfolio/shared";
import {
  deleteGuestbookMessage,
  deleteWidget,
  reorderWidgets,
  updateWidget,
  upsertWidget,
} from "@portfolio/shared";
import { getServerSupabase } from "@/lib/supabase/server";

// All admin writes run as the signed-in admin (RLS enforces authentication).
async function requireClient() {
  const client = await getServerSupabase();
  if (!client) throw new Error("Supabase non configuré.");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Session expirée.");
  return client;
}

export interface AdminWidgetInput {
  id?: string;
  type: WidgetType;
  config: unknown;
  layout: WidgetBreakpointLayout;
  visible: boolean;
  position: number;
}

export async function saveWidgetAction(input: AdminWidgetInput): Promise<Widget> {
  const client = await requireClient();
  const row = await upsertWidget(client, {
    id: input.id,
    type: input.type,
    config: input.config,
    layout: input.layout,
    visible: input.visible,
    position: input.position,
  });
  revalidatePath("/qrcode");
  return {
    id: row.id,
    type: row.type,
    config: row.config,
    layout: row.layout,
    visible: row.visible,
    position: row.position,
    createdAt: row.created_at,
  };
}

export async function patchWidgetAction(
  id: string,
  patch: Partial<Pick<AdminWidgetInput, "config" | "layout" | "visible" | "position">>,
): Promise<void> {
  const client = await requireClient();
  await updateWidget(client, id, patch);
  revalidatePath("/qrcode");
}

export async function deleteWidgetAction(id: string): Promise<void> {
  const client = await requireClient();
  await deleteWidget(client, id);
  revalidatePath("/qrcode");
}

export async function reorderWidgetsAction(order: { id: string; position: number }[]): Promise<void> {
  const client = await requireClient();
  await reorderWidgets(client, order);
  revalidatePath("/qrcode");
}

export async function deleteMessageAction(id: string): Promise<void> {
  const client = await requireClient();
  await deleteGuestbookMessage(client, id);
  revalidatePath("/qrcode");
}

export async function signOutAction(): Promise<void> {
  const client = await getServerSupabase();
  if (client) await client.auth.signOut();
  redirect("/adminqrcode/login");
}
