import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

// Entry gate: restores the persisted session (auto-login) then routes to the
// admin or the login screen.
export default function Index() {
  const { session, loading } = useAuth();
  const t = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }
  return <Redirect href={session ? "/(admin)/dashboard" : "/login"} />;
}
