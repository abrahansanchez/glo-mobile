import { useContext, useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { AuthContext } from "../auth/authContext";

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setError("");
      await login(email, password);
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <View style={{ padding: 24 }}>
      <Text>Email</Text>
      <TextInput
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Text>Password</Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}
