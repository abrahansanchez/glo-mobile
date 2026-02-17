import { useContext, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { AuthContext } from "../auth/authContext";

export default function LoginScreen() {
  const { login } = useContext(AuthContext);

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
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Log in</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor="#888"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          ref={passwordRef}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#888"
          onSubmitEditing={handleLogin}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleLogin}
          disabled={submitting}
          style={({ pressed }) => [
            styles.button,
            submitting && styles.buttonDisabled,
            pressed && !submitting && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.buttonText}>
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
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 18,
    color: "#111",
  },
  label: {
    fontWeight: "800",
    marginBottom: 8,
    color: "#111",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  error: {
    color: "#b00020",
    fontWeight: "700",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});
