import { useContext, useRef, useState } from "react";
import { Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { AuthContext } from "../auth/authContext";
import api from "../config/api";
import { useTheme } from "../theme/ThemeContext";

export default function RegisterScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const handleRegister = async () => {
    if (submitting) return;

    const n = name.trim();
    const e = email.trim();
    const p = password;
    const cp = confirmPassword;
    const ph = phone.trim();

    if (!n || !e || !p || !cp) {
      setError("Fill in all fields");
      return;
    }

    if (p !== cp) {
      setError("Passwords don't match");
      return;
    }

    if (p.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        name: n,
        email: e,
        phone: ph,
        password: p,
      };

      await api.post("/auth/register", payload);

      navigation.replace("Login", { email: e });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Registration failed";
      setError(msg);
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>

        <Text style={[styles.label, { color: colors.textPrimary }]}>Full name</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Phone</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="phone-pad"
          returnKeyType="next"
          value={phone}
          onChangeText={setPhone}
          placeholder="(555) 555-5555"
          placeholderTextColor={colors.textMuted}
        />

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
          returnKeyType="next"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
        />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Confirm Password</Text>
        <TextInput
          ref={confirmPasswordRef}
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleRegister}
        />

        {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

        <Pressable
          onPress={handleRegister}
          disabled={submitting}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent, borderColor: colors.accentBorder },
            submitting && styles.buttonDisabled,
            pressed && !submitting && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.bg }]}>
            {submitting ? "Creating Account..." : "Create Account"}
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <Text style={[styles.footerLink, { color: colors.accent }]}>Log In</Text>
          </Pressable>
        </View>
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: { fontSize: 14, fontWeight: "500" },
  footerLink: {
    fontSize: 14,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
});
