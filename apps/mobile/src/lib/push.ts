import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { upsertAdminDevice } from "@portfolio/shared";
import { supabase } from "./supabase";

// Expo push registration (phase 15).
//
// ⚠️ Remote push does NOT work in Expo Go (SDK 53+ removed it from the Go
// client). We detect that cleanly and turn registration into a documented no-op
// so the Notifications screen still renders and NOTHING crashes in Expo Go. On
// an EAS build the flow requests the OS permission and stores the Expo push
// token in Supabase (upsert by token), under the signed-in admin session (RLS).

export type PushRegisterResult =
  | "registered" // token obtained + saved
  | "denied" // OS permission refused
  | "unsupported" // running in Expo Go (or web) — no remote push
  | "error"; // unexpected failure (token/network/db)

// True when the JS runs inside the Expo Go client, where remote push is
// unavailable. `executionEnvironment === 'storeClient'` is the SDK 57 signal;
// we also fall back to the (older) appOwnership flag for safety.
export function isExpoGo(): boolean {
  if (Constants.executionEnvironment === "storeClient") return true;
  // appOwnership is 'expo' in Go, 'standalone'/'guest' otherwise (legacy flag).
  return Constants.appOwnership === "expo";
}

// Whether push registration can possibly work on this runtime.
export function pushSupported(): boolean {
  return Platform.OS !== "web" && !isExpoGo();
}

function projectId(): string | undefined {
  // expoConfig carries the EAS projectId declared in app.json (extra.eas).
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

// Requests the notification permission (if not already granted) and stores the
// resulting Expo push token in Supabase. Safe to call repeatedly (upsert). In
// Expo Go / web it short-circuits to "unsupported" without touching the OS APIs.
export async function registerForPushNotifications(): Promise<PushRegisterResult> {
  if (!pushSupported()) return "unsupported";

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") return "denied";

    const token = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    if (!token?.data) return "error";

    await upsertAdminDevice(supabase, { token: token.data, platform: Platform.OS });
    return "registered";
  } catch {
    return "error";
  }
}
