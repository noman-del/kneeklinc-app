import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, FlatList } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { kneeDataApi } from "../../services/api";

interface KneeDataRecord {
  _id: string;
  deviceId: string;
  timestamp: string;
  kneeAngle: number;
  temperature: number;
  flexRaw: number;
  status: string;
  deviceInfo?: {
    deviceIp: string;
    wifiConnected: boolean;
  };
  sessionInfo?: {
    sessionId: string;
    duration: number;
    measurementsCount: number;
  };
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function KneeDataScreen() {
  const [kneeData, setKneeData] = useState<KneeDataRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    deviceId: "",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  useEffect(() => {
    fetchKneeData();
    fetchDevices();
  }, []);

  const fetchKneeData = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = {
        page: page.toString(),
        limit: "20",
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== "")),
      };

      const response = await kneeDataApi.getMyKneeData(params);
      const responseData = response as any;
      setKneeData(responseData.data?.data || []);
      setPagination(responseData.data?.pagination || null);
    } catch (error) {
      console.error("Error fetching knee data:", error);
      Alert.alert("Error", "Failed to fetch knee data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const deviceList = await kneeDataApi.getDevices();
      const deviceData = deviceList as any;
      setDevices(deviceData.data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchKneeData(1);
  };

  const loadNextPage = async () => {
    if (pagination && pagination.hasNext && !loading) {
      await fetchKneeData(pagination.currentPage + 1);
    }
  };

  const loadPrevPage = async () => {
    if (pagination && pagination.hasPrev && !loading) {
      await fetchKneeData(pagination.currentPage - 1);
    }
  };

  const deleteRecord = async (id: string) => {
    Alert.alert("Delete Record", "Are you sure you want to delete this knee data record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await kneeDataApi.deleteKneeData(id);
            await fetchKneeData(pagination?.currentPage || 1);
            Alert.alert("Success", "Record deleted successfully");
          } catch (error) {
            Alert.alert("Error", "Failed to delete record");
          }
        },
      },
    ]);
  };

  const downloadCSV = async () => {
    try {
      const blob = await kneeDataApi.downloadCSV(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `knee-data-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setShowDownloadOptions(false);
    } catch (error) {
      Alert.alert("Error", "Failed to download CSV");
    }
  };

  const downloadPDF = async () => {
    try {
      const blob = await kneeDataApi.downloadPDF(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `knee-data-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setShowDownloadOptions(false);
    } catch (error) {
      Alert.alert("Error", "Failed to download PDF");
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes("Normal")) return "#10b981";
    if (status.includes("Mild")) return "#f59e0b";
    if (status.includes("Moderate")) return "#f97316";
    return "#ef4444";
  };

  const getAngleColor = (angle: number) => {
    if (angle >= 140) return "#10b981";
    if (angle >= 120) return "#f59e0b";
    if (angle >= 100) return "#f97316";
    return "#ef4444";
  };

  const getTempColor = (temp: number) => {
    if (temp < 34.5) return "#10b981";
    if (temp < 36.0) return "#f59e0b";
    if (temp < 37.5) return "#f97316";
    return "#ef4444";
  };

  const renderKneeDataItem = ({ item }: { item: KneeDataRecord }) => (
    <View style={styles.dataItem}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitle}>
          <Text style={styles.deviceName}>{item.deviceId}</Text>
          <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
        </View>
        <TouchableOpacity onPress={() => deleteRecord(item._id)} style={styles.deleteButton}>
          <Icon name="delete" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Icon name="angle-acute" size={20} color={getAngleColor(item.kneeAngle)} />
          <Text style={[styles.metricValue, { color: getAngleColor(item.kneeAngle) }]}>{item.kneeAngle.toFixed(1)}°</Text>
          <Text style={styles.metricLabel}>Angle</Text>
        </View>

        <View style={styles.metricItem}>
          <Icon name="thermometer" size={20} color={getTempColor(item.temperature)} />
          <Text style={[styles.metricValue, { color: getTempColor(item.temperature) }]}>{item.temperature.toFixed(1)}°C</Text>
          <Text style={styles.metricLabel}>Temp</Text>
        </View>

        <View style={styles.metricItem}>
          <Icon name="resistor" size={20} color="#6b7280" />
          <Text style={styles.metricValue}>{item.flexRaw}</Text>
          <Text style={styles.metricLabel}>Flex</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        {item.deviceInfo && (
          <View style={styles.deviceInfo}>
            <Icon name={item.deviceInfo.wifiConnected ? "wifi" : "wifi-off"} size={16} color="#6b7280" />
            <Text style={styles.deviceInfoText}>{item.deviceInfo.deviceIp}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Knee Data History</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.iconButton}>
            <Icon name="filter" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDownloadOptions(true)} style={styles.iconButton}>
            <Icon name="download" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3b82f6"]} />}>
        {pagination && (
          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>
              Page {pagination.currentPage} of {pagination.totalPages} • {pagination.total} records
            </Text>
          </View>
        )}

        <FlatList
          data={kneeData}
          renderItem={renderKneeDataItem}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="database-off" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No knee data found</Text>
              <Text style={styles.emptySubtext}>Start monitoring your knee health to see data here</Text>
            </View>
          }
        />

        {pagination && (
          <View style={styles.paginationControls}>
            <TouchableOpacity onPress={loadPrevPage} disabled={!pagination.hasPrev || loading} style={[styles.paginationButton, !pagination.hasPrev && styles.disabledButton]}>
              <Icon name="chevron-left" size={20} color={pagination.hasPrev ? "#fff" : "#9ca3af"} />
              <Text style={[styles.paginationButtonText, !pagination.hasPrev && styles.disabledText]}>Previous</Text>
            </TouchableOpacity>

            <Text style={styles.pageIndicator}>
              {pagination.currentPage} / {pagination.totalPages}
            </Text>

            <TouchableOpacity onPress={loadNextPage} disabled={!pagination.hasNext || loading} style={[styles.paginationButton, !pagination.hasNext && styles.disabledButton]}>
              <Text style={[styles.paginationButtonText, !pagination.hasNext && styles.disabledText]}>Next</Text>
              <Icon name="chevron-right" size={20} color={pagination.hasNext ? "#fff" : "#9ca3af"} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Data</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {["Normal Knee Health", "Mild OA Symptoms", "Moderate OA", "Severe OA / Inflammation"].map((status) => (
                  <TouchableOpacity key={status} style={[styles.filterChip, filters.status === status && styles.activeChip]} onPress={() => setFilters({ ...filters, status: filters.status === status ? "" : status })}>
                    <Text style={[styles.filterChipText, filters.status === status && styles.activeChipText]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Device</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity style={[styles.filterChip, filters.deviceId === "" && styles.activeChip]} onPress={() => setFilters({ ...filters, deviceId: "" })}>
                  <Text style={[styles.filterChipText, filters.deviceId === "" && styles.activeChipText]}>All Devices</Text>
                </TouchableOpacity>
                {devices.map((device) => (
                  <TouchableOpacity key={device} style={[styles.filterChip, filters.deviceId === device && styles.activeChip]} onPress={() => setFilters({ ...filters, deviceId: filters.deviceId === device ? "" : device })}>
                    <Text style={[styles.filterChipText, filters.deviceId === device && styles.activeChipText]}>{device}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={() => {
                setFilters({ status: "", deviceId: "", startDate: "", endDate: "" });
                fetchKneeData(1);
                setShowFilters(false);
              }}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                fetchKneeData(1);
                setShowFilters(false);
              }}
              style={styles.applyButton}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Download Options Modal */}
      <Modal visible={showDownloadOptions} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Download Data</Text>
            <TouchableOpacity onPress={() => setShowDownloadOptions(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.downloadOptions}>
            <TouchableOpacity onPress={downloadCSV} style={styles.downloadOption}>
              <Icon name="file-delimited" size={32} color="#10b981" />
              <Text style={styles.downloadOptionTitle}>CSV File</Text>
              <Text style={styles.downloadOptionDesc}>Excel-compatible spreadsheet</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={downloadPDF} style={styles.downloadOption}>
              <Icon name="file-pdf" size={32} color="#ef4444" />
              <Text style={styles.downloadOptionTitle}>PDF Report</Text>
              <Text style={styles.downloadOptionDesc}>Formatted document</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    backgroundColor: "#3b82f6",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  paginationInfo: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  paginationText: {
    fontSize: 14,
    color: "#6b7280",
  },
  dataItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemTitle: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  timestamp: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  metricItem: {
    alignItems: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deviceInfoText: {
    fontSize: 12,
    color: "#6b7280",
  },
  paginationControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: "#e5e7eb",
  },
  paginationButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  disabledText: {
    color: "#9ca3af",
  },
  pageIndicator: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: "#3b82f6",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6b7280",
  },
  activeChipText: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  clearButtonText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  applyButton: {
    flex: 2,
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  downloadOptions: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  downloadOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    gap: 16,
  },
  downloadOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  downloadOptionDesc: {
    fontSize: 14,
    color: "#6b7280",
  },
});
