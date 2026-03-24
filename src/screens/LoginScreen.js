import { useContext, useRef, useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { AuthContext } from "../auth/authContext";
import { useTheme } from "../theme/ThemeContext";

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordRef = useRef(null);

  const handleLogin = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setError("");

      const e = email.trim();
      const p = password;

      if (!e || !p) {
        setError("Enter email and password");
        return;
      }

      await login(e, p);
      // ✅ No manual navigation here — AppNavigator will rerender based on auth state.
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>Log in</Text>

        <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
        <TextInput
          ref={passwordRef}
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleLogin}
        />

        {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

        <Pressable
          onPress={handleLogin}
          disabled={submitting}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent, borderColor: colors.accentBorder },
            submitting && styles.buttonDisabled,
            pressed && !submitting && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.bg }]}>
            {submitting ? "Logging in..." : "Login"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 18,
  },
  label: {
    fontWeight: "800",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  error: { fontWeight: "700", marginBottom: 12 },
  button: {
    borderWidth: 0.5,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { fontWeight: "900", fontSize: 16 },
});
