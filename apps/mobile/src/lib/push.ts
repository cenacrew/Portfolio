import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { upsertAdminDevice } from "@portfolio/shared";
import { supabase } from "./supabase";

// Expo push registration (phase 15, hardened phase 20).
//
// ⚠️ Remote push does NOT work in Expo Go (SDK 53+ removed it from the Go
// client). We detect that cleanly and turn registration into a documented no-op
// so the Notifications screen still renders and NOTHING crashes in Expo Go. On
// an EAS build the flow requests the OS permission and stores the Expo push
// token in Supabase (upsert by token), under the signed-in admin session (RLS).
//
// Every failure path now carries a human-readable `reason` so the screen can
// show WHY registration failed (Expo Go / emulator / permission refused /
// missing projectId / the raw token or DB error) instead of a blind
// "impossible on this device" — the phase-20 diagnostic fix.

export type PushStatus =
  | "registered" // token obtained + saved
  | "denied" // OS permission refused
  | "unsupported" // running in Expo Go (or web) — no remote push
  | "error"; // unexpected failure (device/token/network/db)

export interface PushResult {
  status: PushStatus;
  // Present on every non-registered outcome: the concrete reason, surfaced in
  // the UI so a future failure is never diagnosed blind.
  reason?: string;
}

// True when the JS runs inside the Expo Go client, where remote push is
// unavailable. `executionEnvironment === 'storeClient'` is the Go signal; an EAS
// build reports 'standalone' or 'bare' (NOT 'storeClient'), so an installed APK
// is never misread as Expo Go. We also honour the (legacy) appOwnership flag.
export function isExpoGo(): boolean {
  if (Constants.executionEnvironment === "storeClient") return true;
  // appOwnership is 'expo' in Go, null/'standalone' otherwise (legacy flag).
  return Constants.appOwnership === "expo";
}

// Whether push registration can possibly work on this runtime (installed build
// on a non-web platform). An EAS APK satisfies this; Expo Go and web do not.
export function pushSupported(): boolean {
  return Platform.OS !== "web" && !isExpoGo();
}

// The EAS projectId getExpoPushTokenAsync needs to mint a token. Declared in
// app.json under extra.eas.projectId; easConfig is the runtime fallback.
function projectId(): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
    ?.projectId;
  const fromEas = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return fromExtra ?? fromEas;
}

// Requests the notification permission (if not already granted) and stores the
// resulting Expo push token in Supabase. Safe to call repeatedly (upsert). Each
// early return names the concrete blocker so the UI can explain it.
export async function registerForPushNotifications(): Promise<PushResult> {
  if (Platform.OS === "web") {
    return { status: "unsupported", reason: "Le web ne reçoit pas de notifications push." };
  }
  if (isExpoGo()) {
    return {
      status: "unsupported",
      reason: "Expo Go ne reçoit pas de push distantes (SDK 53+). Installe le build APK.",
    };
  }
  // Remote push needs real hardware; an emulator can't register a token.
  if (!Device.isDevice) {
    return { status: "error", reason: "Un appareil physique est nécessaire (émulateur détecté)." };
  }
  const pid = projectId();
  if (!pid) {
    return {
      status: "error",
      reason: "projectId EAS introuvable (extra.eas.projectId manquant dans app.json).",
    };
  }

  try {
    // Lazy import: expo-notifications logs a warning the moment it loads inside
    // Expo Go (remote push unsupported there). Importing only past the guard
    // keeps Expo Go sessions completely silent.
    const Notifications = await import("expo-notifications");
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") {
      return { status: "denied", reason: "Autorisation des notifications refusée." };
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId: pid });
    if (!token?.data) {
      return { status: "error", reason: "Expo n'a renvoyé aucun token push." };
    }

    await upsertAdminDevice(supabase, { token: token.data, platform: Platform.OS });
    return { status: "registered" };
  } catch (e) {
    // Surface the ACTUAL failure (e.g. missing FCM credentials, network, RLS)
    // rather than a generic message — this is what makes future push issues
    // diagnosable from the screen itself.
    return {
      status: "error",
      reason: e instanceof Error ? e.message : "Erreur inconnue lors de l'enregistrement du token.",
    };
  }
}
