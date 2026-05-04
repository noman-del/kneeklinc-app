import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity } from "react-native";
import { Card, Text, ProgressBar, Button } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { aiApi } from "../../services/api";
import { showError } from "../../utils/toast";

export default function ProgressScreen({ navigation }: any) {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchAnalyses();
    }, []),
  );

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
      setAnalyses(analysesData);
    } catch (error: any) {
      showError("Failed to load analysis history. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyses();
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

  const getTrendIcon = () => {
    if (analyses.length < 2) return null;
    const latest = parseInt(analyses[0].klGrade);
    const previous = parseInt(analyses[1].klGrade);
    if (latest < previous) {
      return { name: "trending-down", color: "#10b981" };
    } else if (latest > previous) {
      return { name: "trending-up", color: "#ef4444" };
    }
    return { name: "minus", color: "#3b82f6" };
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Icon name="chart-line" size={48} color="#10b981" />
        <Text variant="headlineMedium" style={styles.title}>
          Progress Tracking
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Your AI assessment history
        </Text>
      </View>

      {loading ? (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.loadingContainer}>
              <ProgressBar indeterminate color="#10b981" />
              <Text style={styles.loadingText}>Loading your progress...</Text>
            </View>
          </Card.Content>
        </Card>
      ) : analyses.length === 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.emptyState}>
              <Icon name="chart-line" size={64} color="#9ca3af" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                No assessments yet
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Upload an X-ray to start tracking your progress
              </Text>
              <Button mode="contained" onPress={() => navigation.navigate("XrayUpload")} style={styles.uploadButton}>
                Upload X-ray
              </Button>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryHeader}>
                  <Icon name="chart-box" size={24} color="#10b981" />
                  <Text variant="titleSmall" style={styles.summaryTitle}>
                    Latest Grade
                  </Text>
                </View>
                <View style={styles.summaryContent}>
                  <Text variant="displaySmall" style={[styles.summaryValue, { color: getGradeColor(analyses[0].klGrade) }]}>
                    KL {analyses[0].klGrade}
                  </Text>
                  {getTrendIcon() && <Icon name={getTrendIcon()!.name} size={32} color={getTrendIcon()!.color} />}
                </View>
                <Text variant="bodySmall" style={styles.summarySubtext}>
                  {analyses[0].severity}
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryHeader}>
                  <Icon name="alert-circle" size={24} color="#3b82f6" />
                  <Text variant="titleSmall" style={styles.summaryTitle}>
                    Risk Score
                  </Text>
                </View>
                <Text variant="displaySmall" style={styles.summaryValue}>
                  {analyses[0].riskScore}%
                </Text>
                <ProgressBar progress={analyses[0].riskScore / 100} color={getGradeColor(analyses[0].klGrade)} style={styles.riskProgressBar} />
              </Card.Content>
            </Card>

            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryHeader}>
                  <Icon name="calendar-check" size={24} color="#8b5cf6" />
                  <Text variant="titleSmall" style={styles.summaryTitle}>
                    Total Scans
                  </Text>
                </View>
                <Text variant="displaySmall" style={styles.summaryValue}>
                  {analyses.length}
                </Text>
                <Text variant="bodySmall" style={styles.summarySubtext}>
                  Analyses completed
                </Text>
              </Card.Content>
            </Card>
          </View>

          {/* Analysis History Header */}
          <View style={styles.historyHeader}>
            <Text variant="titleLarge" style={styles.historyTitle}>
              Analysis History
            </Text>
          </View>

          {/* Analysis History */}
          {analyses.map((analysis, index) => (
            <Card key={analysis.id || index} style={styles.card}>
              <Card.Content>
                <View style={styles.analysisHeader}>
                  <View style={[styles.gradeBadge, { backgroundColor: getGradeBgColor(analysis.klGrade) }]}>
                    <Text variant="titleMedium" style={[styles.gradeBadgeText, { color: getGradeColor(analysis.klGrade) }]}>
                      KL Grade {analysis.klGrade}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.date}>
                    {new Date(analysis.analysisDate).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text variant="bodySmall" style={styles.detailLabel}>
                      Severity
                    </Text>
                    <Text variant="bodyMedium" style={styles.detailValue}>
                      {analysis.severity}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text variant="bodySmall" style={styles.detailLabel}>
                      Risk Score
                    </Text>
                    <Text variant="bodyMedium" style={styles.detailValue}>
                      {analysis.riskScore}%
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text variant="bodySmall" style={styles.detailLabel}>
                      OA Status
                    </Text>
                    <Text variant="bodyMedium" style={[styles.detailValue, { color: analysis.oaStatus ? "#f59e0b" : "#10b981" }]}>
                      {analysis.oaStatus ? "Detected" : "Not Detected"}
                    </Text>
                  </View>
                </View>

                {analysis.recommendations?.length > 0 && (
                  <>
                    <Button mode="text" onPress={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)} icon={expandedId === analysis.id ? "chevron-up" : "chevron-down"} style={styles.expandButton}>
                      {expandedId === analysis.id ? "Hide" : "View"} Details
                    </Button>

                    {expandedId === analysis.id && (
                      <View style={styles.expandedContent}>
                        {/* AI Analysis Images */}
                        <View style={styles.imageSection}>
                          <Text variant="titleMedium" style={styles.sectionTitle}>
                            AI Diagnostic Heatmap
                          </Text>

                          {/* Heatmap */}
                          {analysis.gradCamUrl && (
                            <View style={styles.imageCard}>
                              <View style={styles.imageHeader}>
                                <Icon name="brain" size={20} color="#3b82f6" />
                                <Text variant="bodyMedium" style={styles.imageTitle}>
                                  AI Diagnostic Heatmap
                                </Text>
                              </View>
                              <TouchableOpacity onPress={() => navigation.navigate("ImageView", { imageUrl: analysis.gradCamUrl, title: "AI Heatmap" })}>
                                <Image source={{ uri: analysis.gradCamUrl }} style={[styles.analysisImage, styles.heatmapImage]} resizeMode="contain" />
                              </TouchableOpacity>
                              <Text variant="bodySmall" style={styles.heatmapNote}>
                                Red areas show AI focus regions
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Recommendations */}
                        <View style={styles.recommendationsSection}>
                          <Text variant="titleMedium" style={styles.sectionTitle}>
                            Recommendations
                          </Text>
                          <View style={styles.recommendations}>
                            {analysis.recommendations.map((rec: string, idx: number) => (
                              <View key={idx} style={styles.recommendationItem}>
                                <Icon name="check-circle" size={18} color="#10b981" />
                                <Text variant="bodySmall" style={styles.recommendationText}>
                                  {rec}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </Card.Content>
            </Card>
          ))}
        </>
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
    color: "#10b981",
    marginTop: 12,
  },
  subtitle: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  loadingContainer: {
    padding: 20,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 12,
    color: "#6b7280",
  },
  uploadButton: {
    marginTop: 16,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryCard: {
    marginBottom: 12,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  summaryTitle: {
    color: "#6b7280",
    fontWeight: "600",
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryValue: {
    fontWeight: "bold",
    color: "#374151",
  },
  summarySubtext: {
    color: "#6b7280",
    marginTop: 4,
  },
  riskProgressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  historyHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  historyTitle: {
    fontWeight: "bold",
    color: "#374151",
  },
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    color: "#374151",
    marginTop: 16,
    fontWeight: "500",
  },
  emptySubtext: {
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  analysisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gradeBadgeText: {
    fontWeight: "bold",
  },
  date: {
    color: "#6b7280",
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
  },
  detailLabel: {
    color: "#6b7280",
    marginBottom: 4,
  },
  detailValue: {
    color: "#374151",
    fontWeight: "600",
  },
  expandButton: {
    marginTop: 8,
  },
  recommendations: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 6,
  },
  recommendationText: {
    flex: 1,
    color: "#374151",
  },
  expandedContent: {
    marginTop: 12,
  },
  imageSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  imageCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  imageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  imageTitle: {
    fontWeight: "500",
    color: "#374151",
  },
  analysisImage: {
    width: "100%",
    height: 200,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  heatmapImage: {
    borderWidth: 2,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  heatmapNote: {
    color: "#6b7280",
    marginTop: 6,
    fontSize: 12,
    fontStyle: "italic",
  },
  recommendationsSection: {
    marginTop: 8,
  },
});
