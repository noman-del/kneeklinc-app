import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from "react-native";
import { Card, Text, Button, Avatar, ProgressBar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../../context/AuthContext";
import { aiApi, patientApi } from "../../services/api";
import { API_CONFIG } from "../../config/api";
import { showError } from "../../utils/toast";

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, []),
  );

  const fetchData = async () => {
    try {
      const fetchAnalyses = async () => {
        try {
          const data = await aiApi.getAnalyses();
          // API may return { analyses: [...] } or array directly
          let analysesData = [];
          if (data && typeof data === "object" && "analyses" in data) {
            analysesData = (data as any).analyses || [];
          } else if (Array.isArray(data)) {
            analysesData = data;
          }
          setAnalyses(analysesData.slice(0, 3));
        } catch (error) {
          console.log("Failed to load analyses:", error);
          setAnalyses([]);
        }
      };

      const fetchRecommendations = async () => {
        try {
          const recsData = await patientApi.getRecommendations();
          setRecommendations(recsData);
        } catch (error) {
          console.log("Failed to load recommendations:", error);
          setRecommendations(null);
        }
      };

      await Promise.all([fetchAnalyses(), fetchRecommendations()]);
    } catch (error: any) {
      console.log("Dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={styles.greeting}>
            Welcome back,
          </Text>
          <Text variant="headlineSmall" style={styles.name}>
            {user?.firstName || "Patient"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>{user?.profileImageUrl ? <Image source={{ uri: `${API_CONFIG.BASE_URL.replace("/api", "")}${user.profileImageUrl}` }} style={styles.profileImage} /> : <Avatar.Icon size={56} icon="account" />}</TouchableOpacity>
      </View>

      {analyses.length > 0 && (
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Icon name="information" size={24} color="#3b82f6" />
              <Text variant="titleLarge" style={styles.statusTitle}>
                Your Latest Status
              </Text>
            </View>
            <View style={styles.statusContent}>
              <View style={[styles.statusBadge, { backgroundColor: getGradeBgColor(analyses[0].klGrade) }]}>
                <Text variant="headlineLarge" style={[styles.statusGrade, { color: getGradeColor(analyses[0].klGrade) }]}>
                  KL {analyses[0].klGrade}
                </Text>
                <Text variant="bodyMedium" style={styles.statusSeverity}>
                  {analyses[0].severity}
                </Text>
              </View>
              <View style={styles.statusDetails}>
                <View style={styles.statusDetailRow}>
                  <Icon name="chart-line" size={18} color="#6b7280" />
                  <Text variant="bodyMedium" style={styles.statusDetailText}>
                    Risk: {analyses[0].riskScore}%
                  </Text>
                </View>
                <View style={styles.statusDetailRow}>
                  <Icon name="calendar" size={18} color="#6b7280" />
                  <Text variant="bodyMedium" style={styles.statusDetailText}>
                    {new Date(analyses[0].analysisDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
            <Button mode="outlined" onPress={() => navigation.navigate("Progress")} style={styles.viewProgressButton}>
              View Full Progress
            </Button>
          </Card.Content>
        </Card>
      )}

      {analyses.length === 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.emptyState}>
              <Icon name="brain" size={64} color="#3b82f6" />
              <Text variant="headlineSmall" style={styles.emptyTitle}>
                Start Your Journey
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Upload your first knee X-ray to get AI-powered analysis and personalized recommendations
              </Text>
              <Button mode="contained" onPress={() => navigation.navigate("XrayUpload")} style={styles.emptyButton} icon="upload">
                Upload X-ray
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Title title="Lifestyle Recommendations" titleVariant="titleLarge" />
        <Card.Content>
          {(() => {
            // Get recommendations from API or from latest analysis
            let recs = recommendations?.recommendationProfile?.recommendations || recommendations?.recommendations || [];

            // If no recommendations from API but we have analyses, use the latest analysis recommendations
            if (recs.length === 0 && analyses.length > 0 && analyses[0].recommendations) {
              recs = analyses[0].recommendations;
            }

            if (recs.length > 0) {
              return recs.map((rec: string, index: number) => {
                const icons = ["run", "heart", "food-apple"];
                const colors = ["#3b82f6", "#ef4444", "#10b981"];
                return (
                  <View key={index} style={styles.recommendationCard}>
                    <View style={[styles.recommendationIcon, { backgroundColor: `${colors[index % 3]}15` }]}>
                      <Icon name={icons[index % 3]} size={24} color={colors[index % 3]} />
                    </View>
                    <Text variant="bodyMedium" style={styles.recommendationText}>
                      {rec}
                    </Text>
                  </View>
                );
              });
            }

            return (
              <View style={styles.emptyState}>
                <Icon name="lightbulb-outline" size={48} color="#9ca3af" />
                <Text variant="bodyMedium" style={styles.emptyText}>
                  Complete an AI assessment to get personalized recommendations
                </Text>
              </View>
            );
          })()}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#fff",
  },
  greeting: {
    color: "#6b7280",
  },
  name: {
    fontWeight: "bold",
    color: "#1f2937",
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  statusCard: {
    margin: 16,
    marginTop: 8,
    elevation: 3,
    backgroundColor: "#fff",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  statusTitle: {
    fontWeight: "bold",
    color: "#1f2937",
  },
  statusContent: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  statusBadge: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusGrade: {
    fontWeight: "bold",
  },
  statusSeverity: {
    color: "#6b7280",
    marginTop: 4,
  },
  statusDetails: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
  },
  statusDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDetailText: {
    color: "#374151",
  },
  viewProgressButton: {
    marginTop: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
  },
  emptyText: {
    color: "#6b7280",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  recommendationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationText: {
    flex: 1,
    color: "#374151",
  },
});
