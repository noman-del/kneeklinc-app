import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { TextInput, Button, Text, Card, Checkbox } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../context/AuthContext";
import { patientApi } from "../../services/api";
import { showError } from "../../utils/toast";

export default function PatientRegistrationScreen() {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phoneNumber: "",
    emergencyContactPhone: "",
    height: "",
    weight: "",
    activityLevel: "",
    occupationType: "",
    weeklyExerciseHours: 0,
    smokingStatus: "",
    insuranceProvider: "",
    policyNumber: "",
    primaryCarePhysician: "",
    currentOrthopedist: "",
    currentKLGrade: "Unknown",
  });

  const [symptoms, setSymptoms] = useState({
    kneePain: false,
    jointStiffness: false,
    swelling: false,
    limitedMobility: false,
    grindingSensation: false,
    kneeInstability: false,
  });

  const [injuries, setInjuries] = useState({
    aclInjury: false,
    meniscusTear: false,
    kneeFracture: false,
    kneeReplacement: false,
  });

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    const { firstName, lastName, dateOfBirth, gender, phoneNumber, emergencyContactPhone } = formData;

    if (!firstName || !lastName || !dateOfBirth || !gender || !phoneNumber || !emergencyContactPhone) {
      showError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await patientApi.register({
        ...formData,
        symptoms,
        injuries,
      });
      await refreshUser();
      // No success message
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to complete registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Complete Your Profile
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Help us personalize your knee health journey
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Personal Information
          </Text>

          <View style={styles.row}>
            <TextInput label="First Name *" value={formData.firstName} onChangeText={(value) => updateField("firstName", value)} mode="outlined" style={[styles.input, styles.halfInput]} />
            <TextInput label="Last Name *" value={formData.lastName} onChangeText={(value) => updateField("lastName", value)} mode="outlined" style={[styles.input, styles.halfInput]} />
          </View>

          <TextInput label="Date of Birth *" value={formData.dateOfBirth} onChangeText={(value) => updateField("dateOfBirth", value)} mode="outlined" placeholder="YYYY-MM-DD" style={styles.input} />

          <TextInput label="Gender *" value={formData.gender} onChangeText={(value) => updateField("gender", value)} mode="outlined" style={styles.input} />

          <TextInput label="Phone Number *" value={formData.phoneNumber} onChangeText={(value) => updateField("phoneNumber", value)} mode="outlined" keyboardType="phone-pad" style={styles.input} />

          <TextInput label="Emergency Contact Phone *" value={formData.emergencyContactPhone} onChangeText={(value) => updateField("emergencyContactPhone", value)} mode="outlined" keyboardType="phone-pad" style={styles.input} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Medical Information
          </Text>

          <View style={styles.row}>
            <TextInput label="Height" value={formData.height} onChangeText={(value) => updateField("height", value)} mode="outlined" placeholder="e.g., 5'8&quot;" style={[styles.input, styles.halfInput]} />
            <TextInput label="Weight" value={formData.weight} onChangeText={(value) => updateField("weight", value)} mode="outlined" placeholder="e.g., 150 lbs" style={[styles.input, styles.halfInput]} />
          </View>

          <Text variant="bodyMedium" style={styles.checkboxLabel}>
            Knee Symptoms
          </Text>
          {Object.entries(symptoms).map(([key, value]) => (
            <View key={key} style={styles.checkboxRow}>
              <Checkbox status={value ? "checked" : "unchecked"} onPress={() => setSymptoms({ ...symptoms, [key]: !value })} />
              <Text>{key.replace(/([A-Z])/g, " $1").trim()}</Text>
            </View>
          ))}

          <Text variant="bodyMedium" style={styles.checkboxLabel}>
            Previous Injuries
          </Text>
          {Object.entries(injuries).map(([key, value]) => (
            <View key={key} style={styles.checkboxRow}>
              <Checkbox status={value ? "checked" : "unchecked"} onPress={() => setInjuries({ ...injuries, [key]: !value })} />
              <Text>{key.replace(/([A-Z])/g, " $1").trim()}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Lifestyle
          </Text>

          <TextInput label="Activity Level" value={formData.activityLevel} onChangeText={(value) => updateField("activityLevel", value)} mode="outlined" style={styles.input} />

          <TextInput label="Occupation Type" value={formData.occupationType} onChangeText={(value) => updateField("occupationType", value)} mode="outlined" style={styles.input} />

          <TextInput label="Weekly Exercise Hours" value={formData.weeklyExerciseHours.toString()} onChangeText={(value) => updateField("weeklyExerciseHours", parseInt(value) || 0)} mode="outlined" keyboardType="number-pad" style={styles.input} />

          <TextInput label="Smoking Status" value={formData.smokingStatus} onChangeText={(value) => updateField("smokingStatus", value)} mode="outlined" style={styles.input} />
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.submitButton}>
        Complete Registration
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: "center",
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
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1f2937",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  checkboxLabel: {
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  submitButton: {
    margin: 16,
    paddingVertical: 8,
  },
});
