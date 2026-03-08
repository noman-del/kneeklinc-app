import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Image, Alert } from "react-native";
import { Card, Text, Button, ProgressBar, Badge } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { aiApi } from "../../services/api";
import { showError, showSuccess } from "../../utils/toast";

export default function XrayUploadScreen({ navigation }: any) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [analysisTime, setAnalysisTime] = useState(0);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showError("Please allow access to your photos", "Permission Required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setResult(null);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      showError("Please allow camera access", "Permission Required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setResult(null);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (analyzing) {
      setAnalysisTime(0);
      interval = setInterval(() => {
        setAnalysisTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [analyzing]);

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setAnalyzing(true);
    setAnalysisTime(0);
    try {
      const formData = new FormData();

      // React Native FormData requires specific format
      const fileUri = selectedImage;
      const fileName = fileUri.split("/").pop() || "xray.jpg";
      const fileType = "image/jpeg";

      formData.append("xray", {
        uri: fileUri,
        type: fileType,
        name: fileName,
      } as any);

      console.log("Uploading X-ray:", { uri: fileUri, type: fileType, name: fileName });

      const response = await aiApi.analyzeXray(formData);
      setResult(response.analysis);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message;

      if (errorMessage?.includes("does not appear to show knee osteoarthritis")) {
        Alert.alert("Not Detected", "Knee X-ray not detected. Please upload a valid knee X-ray image.");
      } else if (errorMessage?.includes("No X-ray image uploaded")) {
        Alert.alert("No Image", "Please select an X-ray image.");
      } else {
        Alert.alert("Failed", errorMessage || "Analysis failed. Please try again.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAndViewProgress = async () => {
    if (result?.id) {
      Alert.alert("Save Analysis", "Save this analysis to your progress history?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Save & View",
          onPress: async () => {
            try {
              await aiApi.saveToProfile(result.id);
              setResult(null);
              setSelectedImage(null);
              navigation.navigate("Progress", { refresh: true });
            } catch (error: any) {
              Alert.alert("Failed", "Could not save analysis");
              setResult(null);
              setSelectedImage(null);
              navigation.navigate("Progress", { refresh: true });
            }
          },
        },
      ]);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "0":
        return "#10b981";
      case "1":
        return "#84cc16";
      case "2":
        return "#eab308";
      case "3":
        return "#f97316";
      case "4":
      case "5":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getGradeBgColor = (grade: string) => {
    switch (grade) {
      case "0":
        return "#d1fae5";
      case "1":
        return "#ecfccb";
      case "2":
        return "#fef3c7";
      case "3":
        return "#fed7aa";
      case "4":
      case "5":
        return "#fee2e2";
      default:
        return "#f3f4f6";
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="brain" size={48} color="#3b82f6" />
        <Text variant="headlineMedium" style={styles.title}>
          AI X-ray Analysis
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Upload knee X-ray for instant AI assessment
        </Text>
      </View>

      {!result ? (
        <Card style={styles.card}>
          <Card.Content>
            {selectedImage ? (
              <View>
                <Image source={{ uri: selectedImage }} style={styles.image} />
                <Button mode="text" onPress={() => setSelectedImage(null)} style={styles.clearButton}>
                  Clear Image
                </Button>
              </View>
            ) : (
              <View style={styles.uploadArea}>
                <Icon name="upload" size={64} color="#9ca3af" />
                <Text variant="bodyLarge" style={styles.uploadText}>
                  Select or capture X-ray image
                </Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Button mode="outlined" onPress={pickImage} icon="image" style={styles.halfButton}>
                Gallery
              </Button>
              <Button mode="outlined" onPress={takePhoto} icon="camera" style={styles.halfButton}>
                Camera
              </Button>
            </View>

            {analyzing && (
              <View style={styles.analysisProgress}>
                <ProgressBar indeterminate color="#3b82f6" style={styles.progressBar} />
                <Text variant="bodyMedium" style={styles.analysisText}>
                  AI is analyzing your X-ray... {analysisTime}s
                </Text>
                {analysisTime > 120 && (
                  <Text variant="bodySmall" style={styles.warningText}>
                    Analysis is taking longer than usual. Please wait...
                  </Text>
                )}
              </View>
            )}

            <Button mode="contained" onPress={handleAnalyze} loading={analyzing} disabled={!selectedImage || analyzing} icon="brain" style={styles.analyzeButton}>
              {analyzing ? "Analyzing..." : "Start AI Analysis"}
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.successHeader}>
              <Icon name="check-circle" size={48} color="#10b981" />
              <Text variant="headlineMedium" style={styles.successTitle}>
                Analysis Complete
              </Text>
            </View>

            <View style={[styles.gradeBadge, { backgroundColor: getGradeBgColor(result.klGrade) }]}>
              <Text variant="titleMedium" style={styles.gradeLabel}>
                Kellgren-Lawrence Grade
              </Text>
              <Text variant="displaySmall" style={[styles.gradeValue, { color: getGradeColor(result.klGrade) }]}>
                Grade {result.klGrade}
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <Icon name="alert-circle" size={24} color="#3b82f6" />
                <Text variant="bodySmall" style={styles.detailLabel}>
                  Severity Level
                </Text>
                <Text variant="titleMedium" style={styles.detailValue}>
                  {result.severity}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <Icon name="chart-line" size={24} color="#3b82f6" />
                <Text variant="bodySmall" style={styles.detailLabel}>
                  Risk Score
                </Text>
                <Text variant="titleMedium" style={styles.detailValue}>
                  {result.riskScore}%
                </Text>
              </View>
            </View>

            <View style={styles.oaStatusCard}>
              <Icon name={result.oaStatus ? "alert" : "check-circle"} size={24} color={result.oaStatus ? "#f59e0b" : "#10b981"} />
              <View style={styles.oaStatusText}>
                <Text variant="bodySmall" style={styles.detailLabel}>
                  Osteoarthritis Status
                </Text>
                <Text variant="titleMedium" style={[styles.detailValue, { color: result.oaStatus ? "#f59e0b" : "#10b981" }]}>
                  {result.oaStatus ? "OA Detected" : "No OA Detected"}
                </Text>
              </View>
            </View>

            {result.recommendations?.length > 0 && (
              <View style={styles.recommendations}>
                <Text variant="titleMedium" style={styles.recommendationsTitle}>
                  Recommendations
                </Text>
                {result.recommendations.map((rec: string, index: number) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Icon name="check-circle" size={20} color="#10b981" />
                    <Text variant="bodyMedium" style={styles.recommendationText}>
                      {rec}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  setSelectedImage(null);
                  setResult(null);
                }}
                style={styles.halfButton}
              >
                Analyze Another
              </Button>
              <Button mode="contained" onPress={handleSaveAndViewProgress} style={styles.halfButton}>
                View Progress
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#fff",
  },
  title: {
    fontWeight: "bold",
    color: "#3b82f6",
    marginTop: 12,
  },
  subtitle: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  uploadArea: {
    alignItems: "center",
    padding: 40,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 12,
    marginBottom: 16,
  },
  uploadText: {
    color: "#6b7280",
    marginTop: 12,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 8,
  },
  clearButton: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  halfButton: {
    flex: 1,
  },
  analyzeButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  analysisProgress: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  analysisText: {
    textAlign: "center",
    color: "#3b82f6",
    fontWeight: "600",
  },
  warningText: {
    textAlign: "center",
    color: "#f59e0b",
    marginTop: 8,
  },
  successHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontWeight: "bold",
    color: "#10b981",
    marginTop: 8,
  },
  gradeBadge: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  gradeLabel: {
    color: "#6b7280",
    marginBottom: 8,
  },
  gradeValue: {
    fontWeight: "bold",
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  detailCard: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    alignItems: "center",
  },
  detailLabel: {
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  detailValue: {
    color: "#374151",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  oaStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  oaStatusText: {
    flex: 1,
  },
  recommendations: {
    marginTop: 16,
  },
  recommendationsTitle: {
    fontWeight: "bold",
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  recommendationText: {
    flex: 1,
    color: "#374151",
  },
});
