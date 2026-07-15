"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Widget, WidgetBreakpointLayout, WidgetType } from "@portfolio/shared";
import {
  deleteGuestbookMessage,
  deleteWidget,
  extractMediaPaths,
  type MediaWidget,
  pruneWidgetMedia,
  reorderWidgets,
  updateWidget,
  upsertWidget,
} from "@portfolio/shared";
import type { DbClient } from "@portfolio/shared";
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

// Prune media the widget's OLD config referenced but the new config no longer
// does, unless another widget still uses it. Best-effort — never fails the
// primary write. Call AFTER the config was written to the DB.
async function pruneReplacedMedia(client: DbClient, oldPaths: string[]): Promise<void> {
  if (oldPaths.length === 0) return;
  try {
    await pruneWidgetMedia(client, oldPaths);
  } catch {
    /* storage cleanup is best-effort */
  }
}

async function mediaPathsOf(client: DbClient, id: string | undefined): Promise<string[]> {
  if (!id) return [];
  const { data } = await client.from("widgets").select("id,type,config").eq("id", id).maybeSingle();
  return data ? extractMediaPaths(data as MediaWidget) : [];
}

export async function saveWidgetAction(input: AdminWidgetInput): Promise<Widget> {
  const client = await requireClient();
  const oldPaths = await mediaPathsOf(client, input.id);
  const row = await upsertWidget(client, {
    id: input.id,
    type: input.type,
    config: input.config,
    layout: input.layout,
    visible: input.visible,
    position: input.position,
  });
  await pruneReplacedMedia(client, oldPaths);
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
  // Only a config change can orphan media; capture the old paths first.
  const oldPaths = "config" in patch ? await mediaPathsOf(client, id) : [];
  await updateWidget(client, id, patch);
  await pruneReplacedMedia(client, oldPaths);
  revalidatePath("/qrcode");
}

export async function deleteWidgetAction(id: string): Promise<void> {
  const client = await requireClient();
  const { data } = await client.from("widgets").select("id,type,config").eq("id", id).maybeSingle();
  const removed = data as MediaWidget | null;
  await deleteWidget(client, id);
  if (removed) await pruneReplacedMedia(client, extractMediaPaths(removed));
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
