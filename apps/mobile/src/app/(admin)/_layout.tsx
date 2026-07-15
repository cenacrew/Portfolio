import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../lib/auth";
import { DashboardsProvider } from "../../lib/dashboards";
import { useTheme } from "../../lib/theme";

export default function AdminLayout() {
  const { session, loading } = useAuth();
  const t = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;

  // The whole admin operates on the selected dashboard version (phase 8).
  return (
    <DashboardsProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
    </DashboardsProvider>
  );
}
