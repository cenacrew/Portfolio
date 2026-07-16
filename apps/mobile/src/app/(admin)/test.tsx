import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Eyebrow, tap } from "../../components/ui";
import { space, useTheme } from "../../lib/theme";

// The web QA console (phase 9). It's a web page (it renders the real public web
// Renderers to audit), so the app opens it in a WebView — same approach as the
// "Rendu réel" preview. Auth is NOT shared with the app's Supabase session: the
// WebView shows the admin login on first open, then keeps its own session
// cookies. Assumed and documented.
//
// ?bp=mobile (phase 18): from the app, the console audits ONLY the mobile
// 3-column context — fewer tiles (WebView memory) and exactly what this device
// can show. The desktop 9-column context is audited from a PC (no param).
const QA_URL = "https://www.cenacrew.com/adminqrcode/test?bp=mobile";

export default function TestWidgets() {
  const t = useTheme();
  const router = useRouter();
  const web = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingVertical: space.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>‹ Retour</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Eyebrow>Test widgets</Eyebrow>
        </View>
        <Pressable
          onPress={() => {
            tap();
            web.current?.reload();
          }}
          hitSlop={10}
        >
          <Text style={{ color: t.accent, fontWeight: "800", fontSize: 13 }}>↻ Recharger</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          ref={web}
          source={{ uri: QA_URL }}
          onLoadEnd={() => setLoading(false)}
          onLoadStart={() => setLoading(true)}
          startInLoadingState
          sharedCookiesEnabled
          style={{ flex: 1, backgroundColor: t.bg }}
        />
        {loading ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
            <ActivityIndicator color={t.brand} size="large" />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
