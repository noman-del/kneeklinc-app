import React, { useState } from "react";
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { TextInput, Button, Text, Card } from "react-native-paper";
import { authApi } from "../../services/api";
import { showError, showSuccess } from "../../utils/toast";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      showError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setStep("otp");
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      showError("Please enter the reset code");
      return;
    }

    if (otp.length !== 6) {
      showError("Reset code must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyResetOTP(email, otp);
      setStep("password");
    } catch (error: any) {
      showError(error.response?.data?.message || "Invalid or expired reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      showError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      showError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(email, otp, newPassword);
      navigation.navigate("Login");
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              Reset Password
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {step === "email" && "Enter your email to receive a reset code"}
              {step === "otp" && "Enter the 6-digit code sent to your email"}
              {step === "password" && "Create your new password"}
            </Text>

            {step === "email" && (
              <View style={styles.form}>
                <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined" keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={styles.input} />
                <Button mode="contained" onPress={handleSendOTP} loading={loading} disabled={loading} style={styles.button}>
                  Send Reset Code
                </Button>
              </View>
            )}

            {step === "otp" && (
              <View style={styles.form}>
                <TextInput label="Reset Code" value={otp} onChangeText={setOtp} mode="outlined" keyboardType="number-pad" maxLength={6} style={styles.input} />
                <Button mode="contained" onPress={handleVerifyOTP} loading={loading} disabled={loading} style={styles.button}>
                  Verify Code
                </Button>
              </View>
            )}

            {step === "password" && (
              <View style={styles.form}>
                <TextInput label="New Password" value={newPassword} onChangeText={setNewPassword} mode="outlined" secureTextEntry={!showPassword} right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />} style={styles.input} />
                <TextInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} mode="outlined" secureTextEntry={!showConfirmPassword} right={<TextInput.Icon icon={showConfirmPassword ? "eye-off" : "eye"} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />} style={styles.input} />
                <Button mode="contained" onPress={handleResetPassword} loading={loading} disabled={loading} style={styles.button}>
                  Reset Password
                </Button>
              </View>
            )}

            <Button mode="text" onPress={() => navigation.navigate("Login")} disabled={loading} style={styles.loginButton}>
              Back to Login
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
  card: {
    elevation: 4,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
    color: "#1f2937",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
    color: "#6b7280",
  },
  form: {
    marginTop: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  backButton: {
    marginTop: 8,
  },
  loginButton: {
    marginTop: 16,
  },
});
