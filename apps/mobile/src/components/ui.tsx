import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { radius, space, useTheme, type Palette } from "../lib/theme";

export function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
export function success() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

// ---- Text ------------------------------------------------------------------

export function Eyebrow({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text style={{ color: t.accent, fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>{children}</Text>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm }}>
      <Text style={{ color: t.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 }}>{children}</Text>
      {right}
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <Text style={[{ color: t.textMuted, fontSize: 14, lineHeight: 20 }, style as never]}>{children}</Text>;
}

// ---- Containers ------------------------------------------------------------

export function Screen({ children, scroll = true, refreshControl }: { children: ReactNode; scroll?: boolean; refreshControl?: ReactNode }) {
  const t = useTheme();
  if (!scroll) {
    return <View style={{ flex: 1, backgroundColor: t.bg }}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl * 2, gap: space.md }}
      refreshControl={refreshControl as never}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    padding: space.md,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [base, style as never, pressed && { opacity: 0.8, transform: [{ scale: 0.995 }] }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style as never]}>{children}</View>;
}

// ---- Buttons ---------------------------------------------------------------

type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "accent";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = "primary", loading, disabled, style }: BtnProps) {
  const t = useTheme();
  const map = {
    primary: { bg: t.brand, fg: t.onBrand, border: t.brand },
    accent: { bg: t.accent, fg: t.onAccent, border: t.accent },
    ghost: { bg: "transparent", fg: t.text, border: t.border },
    danger: { bg: "transparent", fg: t.danger, border: t.danger },
  }[variant];
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: map.bg,
          borderColor: map.border,
          borderWidth: 1.5,
          borderRadius: radius.pill,
          paddingVertical: 14,
          paddingHorizontal: space.lg,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.45 : 1,
        },
        pressed && { opacity: 0.75 },
        style as never,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={map.fg} />
      ) : (
        <Text style={{ color: map.fg, fontWeight: "800", fontSize: 15, letterSpacing: 0.2 }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{
        backgroundColor: active ? t.brand : "transparent",
        borderColor: active ? t.brand : t.border,
        borderWidth: 1.5,
        borderRadius: radius.pill,
        paddingVertical: 8,
        paddingHorizontal: 14,
      }}
    >
      <Text style={{ color: active ? t.onBrand : t.textMuted, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// ---- Form fields -----------------------------------------------------------

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: t.text, fontWeight: "700", fontSize: 14 }}>{label}</Text>
      {children}
      {hint ? <Text style={{ color: t.textFaint, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

function inputStyle(t: Palette): ViewStyle {
  return {
    backgroundColor: t.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  };
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "url" | "numeric";
  autoCapitalize?: "none" | "sentences";
  secureTextEntry?: boolean;
}) {
  const t = useTheme();
  return (
    <Field label={label} hint={hint}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textFaint}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        autoCorrect={false}
        style={[
          inputStyle(t),
          { color: t.text, fontSize: 15, minHeight: multiline ? 90 : undefined, textAlignVertical: multiline ? "top" : "center" },
        ]}
      />
    </Field>
  );
}

export function NumberFieldRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const t = useTheme();
  return (
    <Field label={label} hint={hint}>
      <TextInput
        value={Number.isFinite(value) ? String(value) : ""}
        onChangeText={(v) => onChange(v === "" ? 0 : Number(v.replace(",", ".")))}
        keyboardType="numeric"
        placeholderTextColor={t.textFaint}
        style={[inputStyle(t), { color: t.text, fontSize: 15 }]}
      />
    </Field>
  );
}

export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} active={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </Field>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onChange(!value);
      }}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}
    >
      <View style={{ flex: 1, paddingRight: space.md }}>
        <Text style={{ color: t.text, fontWeight: "700", fontSize: 14 }}>{label}</Text>
        {hint ? <Text style={{ color: t.textFaint, fontSize: 12 }}>{hint}</Text> : null}
      </View>
      <View
        style={{
          width: 52,
          height: 30,
          borderRadius: radius.pill,
          backgroundColor: value ? t.accent : t.border,
          padding: 3,
          justifyContent: "center",
          alignItems: value ? "flex-end" : "flex-start",
        }}
      >
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.surface, ...shadow }} />
      </View>
    </Pressable>
  );
}

export function Banner({ text, tone = "danger" }: { text: string; tone?: "danger" | "success" }) {
  const t = useTheme();
  const color = tone === "danger" ? t.danger : t.success;
  return (
    <View style={{ backgroundColor: color + "22", borderRadius: radius.sm, padding: 12, borderWidth: 1, borderColor: color + "55" }}>
      <Text style={{ color, fontSize: 13, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

export const shadow = StyleSheet.create({
  s: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
}).s;
