import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Button, Eyebrow, TextField, success } from "../components/ui";
import { useAuth } from "../lib/auth";
import { radius, space, useTheme } from "../lib/theme";

export default function Login() {
  const { session, signIn } = useAuth();
  const t = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/(admin)/dashboard" />;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      success();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: space.lg, justifyContent: "center", gap: space.lg }}>
          <View style={{ gap: 8 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.md,
                backgroundColor: t.brand,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: space.sm,
              }}
            >
              <Text style={{ fontSize: 26 }}>🎛️</Text>
            </View>
            <Eyebrow>cenacrew.com / qrcode</Eyebrow>
            <Text style={{ color: t.text, fontSize: 34, fontWeight: "800", letterSpacing: -1 }}>QRCodeAdmin</Text>
            <Text style={{ color: t.textMuted, fontSize: 15, lineHeight: 21 }}>
              Pilote ton dashboard bento depuis ton téléphone. Connexion à ton compte Supabase.
            </Text>
          </View>

          <View style={{ gap: space.md }}>
            <TextField label="Email" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="toi@exemple.com" />
            <TextField label="Mot de passe" value={password} onChange={setPassword} placeholder="••••••••" autoCapitalize="none" secureTextEntry />
            {error ? <Banner text={error} /> : null}
            <Button label="Se connecter" onPress={submit} loading={busy} disabled={!email || !password} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
