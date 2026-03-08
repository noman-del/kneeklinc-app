import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, Text, Card } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";
import { showError } from "../../utils/toast";

export default function OTPVerificationScreen({ route, navigation }: any) {
  const { email } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { login } = useAuth();

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      const msg = "Please enter a valid 6-digit OTP";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setErrorMessage("");
    setLoading(true);
    try {
      const response = await authApi.verifyOTP({ email, otp });
      await login(response.token, response.user);
      // No success message - just login
    } catch (error: any) {
      console.log("OTP Verification Error:", error.response?.data);
      const msg = error.response?.data?.message || error.message || "Invalid OTP. Please try again.";
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendOTP(email);
      // No success message
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="displaySmall" style={styles.title}>
          Verify Email
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Enter the 6-digit code sent to
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {email}
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="OTP Code"
            value={otp}
            onChangeText={(text) => {
              setOtp(text);
              setErrorMessage("");
            }}
            mode="outlined"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            error={!!errorMessage}
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Button mode="contained" onPress={handleVerify} loading={loading} disabled={loading || otp.length !== 6} style={styles.button}>
            Verify Account
          </Button>

          <Button mode="text" onPress={handleResend} loading={resending} disabled={resending} style={styles.linkButton}>
            Didn't receive code? Resend
          </Button>

          <Button mode="text" onPress={() => navigation.goBack()} style={styles.linkButton}>
            Back to Signup
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    justifyContent: "center",
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
  email: {
    color: "#3b82f6",
    fontWeight: "bold",
    marginTop: 4,
  },
  card: {
    elevation: 4,
  },
  input: {
    marginBottom: 16,
    fontSize: 24,
    textAlign: "center",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  linkButton: {
    marginTop: 8,
  },
});
