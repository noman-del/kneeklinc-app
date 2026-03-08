import React, { useState } from "react";
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { TextInput, Button, Text, Card } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";
import { showError } from "../../utils/toast";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    const newErrors: Record<string, boolean> = {};

    if (!email) newErrors.email = true;
    if (!password) newErrors.password = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      await login(response.token, response.user);
      // No success message - just login
    } catch (error: any) {
      console.log("=== LOGIN ERROR ===");
      console.log("Full error:", error);
      console.log("Error response:", error.response);
      console.log("Error response data:", error.response?.data);
      console.log("Error message:", error.response?.data?.message);
      console.log("===================");

      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Invalid credentials. Please try again.";
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>
            KneeKlinic
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Welcome back! Sign in to continue
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Email *"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) setErrors({ ...errors, email: false });
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              style={styles.input}
            />

            <TextInput
              label="Password *"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errors.password) setErrors({ ...errors, password: false });
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              error={errors.password}
              right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
              style={styles.input}
            />

            <Button mode="contained" onPress={handleLogin} loading={loading} disabled={loading} style={styles.button}>
              Sign In
            </Button>

            <Button mode="text" onPress={() => navigation.navigate("ForgotPassword")} style={styles.forgotButton}>
              Forgot Password?
            </Button>

            <Button mode="text" onPress={() => navigation.navigate("Signup")} style={styles.linkButton}>
              Don't have an account? Sign Up
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 8,
  },
  subtitle: {
    color: "#6b7280",
    textAlign: "center",
  },
  card: {
    elevation: 4,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  forgotButton: {
    marginTop: 4,
  },
  linkButton: {
    marginTop: 8,
  },
});
