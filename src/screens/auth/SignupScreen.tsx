import React, { useState } from "react";
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { TextInput, Button, Text, Card } from "react-native-paper";
import { authApi } from "../../services/api";
import { showError } from "../../utils/toast";

export default function SignupScreen({ navigation }: any) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    height: "",
    weight: "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: false });
    }
  };

  const validatePassword = () => {
    const { password } = formData;
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      noSpace: !/\s/.test(password),
    };
    return Object.values(checks).every(Boolean);
  };

  const handleSignup = async () => {
    const { firstName, lastName, email, password, confirmPassword, height, weight } = formData;
    const newErrors: Record<string, boolean> = {};

    // Validate required fields and mark errors
    if (!firstName) newErrors.firstName = true;
    if (!lastName) newErrors.lastName = true;
    if (!email) newErrors.email = true;
    if (!password) newErrors.password = true;
    if (!confirmPassword) newErrors.confirmPassword = true;
    if (!height) newErrors.height = true;
    if (!weight) newErrors.weight = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ password: true, confirmPassword: true });
      showError("Passwords do not match");
      return;
    }

    if (!validatePassword()) {
      setErrors({ password: true });
      showError("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
      return;
    }

    setLoading(true);
    try {
      await authApi.signup({
        ...formData,
        userType: "patient",
      });
      // No success message - just navigate
      navigation.navigate("OTPVerification", { email });
    } catch (error: any) {
      console.log("=== SIGNUP ERROR ===");
      console.log("Full error:", error);
      console.log("Error response:", error.response);
      console.log("Error response data:", error.response?.data);
      console.log("Error message:", error.response?.data?.message);
      console.log("===================");

      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to create account. Please try again.";
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
            Patient Signup
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Join KneeKlinic to manage your knee health
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <TextInput label="First Name *" value={formData.firstName} onChangeText={(value) => updateField("firstName", value)} mode="outlined" error={errors.firstName} style={[styles.input, styles.halfInput]} />
              <TextInput label="Last Name *" value={formData.lastName} onChangeText={(value) => updateField("lastName", value)} mode="outlined" error={errors.lastName} style={[styles.input, styles.halfInput]} />
            </View>

            <View style={styles.row}>
              <TextInput label="Height (cm) *" value={formData.height} onChangeText={(value) => updateField("height", value)} mode="outlined" keyboardType="numeric" placeholder="e.g., 175" error={errors.height} style={[styles.input, styles.halfInput]} />
              <TextInput label="Weight (kg) *" value={formData.weight} onChangeText={(value) => updateField("weight", value)} mode="outlined" keyboardType="numeric" placeholder="e.g., 70" error={errors.weight} style={[styles.input, styles.halfInput]} />
            </View>

            <TextInput label="Email *" value={formData.email} onChangeText={(value) => updateField("email", value)} mode="outlined" keyboardType="email-address" autoCapitalize="none" error={errors.email} style={styles.input} />

            <TextInput label="Password *" value={formData.password} onChangeText={(value) => updateField("password", value)} mode="outlined" secureTextEntry={!showPassword} error={errors.password} right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />} style={styles.input} />

            <TextInput label="Confirm Password *" value={formData.confirmPassword} onChangeText={(value) => updateField("confirmPassword", value)} mode="outlined" secureTextEntry={!showConfirmPassword} error={errors.confirmPassword} right={<TextInput.Icon icon={showConfirmPassword ? "eye-off" : "eye"} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />} style={styles.input} />

            <View style={styles.passwordRequirements}>
              <Text variant="bodySmall" style={styles.requirementsTitle}>
                Password must include:
              </Text>
              <Text variant="bodySmall">• At least 8 characters</Text>
              <Text variant="bodySmall">• Uppercase and lowercase letters</Text>
              <Text variant="bodySmall">• At least one number</Text>
              <Text variant="bodySmall">• At least one special character</Text>
              <Text variant="bodySmall">• No spaces</Text>
            </View>

            <Button mode="contained" onPress={handleSignup} loading={loading} disabled={loading} style={styles.button}>
              Create Account
            </Button>

            <Button mode="text" onPress={() => navigation.navigate("Login")} style={styles.linkButton}>
              Already have an account? Sign In
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
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 8,
  },
  subtitle: {
    color: "#6b7280",
    textAlign: "center",
  },
  card: {
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  passwordRequirements: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  linkButton: {
    marginTop: 8,
  },
});
