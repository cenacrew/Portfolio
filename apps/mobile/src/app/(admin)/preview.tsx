import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Eyebrow, tap } from "../../components/ui";
import { space, useTheme } from "../../lib/theme";

const PUBLIC_URL = "https://www.cenacrew.com/qrcode";

// One-tap real render (phase 4.5): shows the actual public dashboard inside the
// app via a WebView (bundled with Expo Go), no browser needed.
export default function Preview() {
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
          <Eyebrow>Rendu réel</Eyebrow>
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
          source={{ uri: PUBLIC_URL }}
          onLoadEnd={() => setLoading(false)}
          onLoadStart={() => setLoading(true)}
          startInLoadingState
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
