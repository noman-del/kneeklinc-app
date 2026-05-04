import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Alert } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { iotApi, kneeDataApi } from "../../services/api";
import { getNetworkOptions, DEFAULT_NETWORK } from "../../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SensorData {
  device: string;
  uptime_ms: number;
  last_update_ms: number;
  flex_raw: number;
  knee_angle: number;
  temperature_c: number;
  status: string;
  ap_ip: string;
  sta_connected: boolean;
}

export default function IoTSensorScreen() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [deviceIp, setDeviceIp] = useState("192.168.4.1");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(DEFAULT_NETWORK);
  const [networkOptions] = useState(getNetworkOptions());
  const [isSavingData, setIsSavingData] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [measurementCount, setMeasurementCount] = useState(0);

  useEffect(() => {
    initializeSession();
    fetchSensorData();

    if (autoRefresh) {
      const interval = setInterval(fetchSensorData, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, deviceIp]);

  const initializeSession = async () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setSessionStartTime(Date.now());
    await AsyncStorage.setItem("currentSessionId", newSessionId);
  };

  const fetchSensorData = async () => {
    try {
      const data = await iotApi.getSensorData(deviceIp);
      setSensorData(data);
      setIsConnected(true);

      // Save data to backend if enabled
      if (isSavingData && data) {
        await saveKneeDataToBackend(data);
      }
    } catch (error) {
      console.log("Failed to fetch sensor data:", error);
      setIsConnected(false);
    }
  };

  const saveKneeDataToBackend = async (data: SensorData) => {
    try {
      const sessionDuration = Date.now() - sessionStartTime;
      const newCount = measurementCount + 1;
      setMeasurementCount(newCount);

      const kneeDataPayload = {
        deviceId: data.device || "JointSenseIot",
        kneeAngle: data.knee_angle,
        temperature: data.temperature_c,
        flexRaw: data.flex_raw,
        status: data.status,
        deviceInfo: {
          uptime: data.uptime_ms,
          lastUpdate: data.last_update_ms,
          deviceIp: data.ap_ip,
          wifiConnected: data.sta_connected,
        },
        sessionInfo: {
          sessionId,
          duration: sessionDuration,
          measurementsCount: newCount,
        },
      };

      await kneeDataApi.saveKneeData(kneeDataPayload);
      console.log("Knee data saved successfully");
    } catch (error) {
      console.log("Failed to save knee data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSensorData();
    setRefreshing(false);
  };

  const checkHealth = async () => {
    try {
      await iotApi.checkHealth(deviceIp);
      Alert.alert("Success", "Device is healthy and responding");
    } catch (error) {
      Alert.alert("Error", "Device health check failed");
    }
  };

  const handleNetworkChange = (networkKey: string) => {
    const network = networkOptions.find((n) => n.value === networkKey);
    if (network) {
      setSelectedNetwork(networkKey);
      setDeviceIp(network.ip);
      setIsConfiguring(false);
      // Force refresh with new IP
      setTimeout(() => fetchSensorData(), 500);
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

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  if (isConfiguring) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsConfiguring(false)}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Device Configuration</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.configContainer}>
          <Text style={styles.configLabel}>Device IP Address</Text>
          <TextInput style={styles.configInput} value={deviceIp} onChangeText={setDeviceIp} placeholder="192.168.4.1" keyboardType="numeric" />
          <Text style={styles.configHint}>
            Default: 192.168.4.1 (Device AP mode){"\n"}
            Or enter your network IP if connected to WiFi
          </Text>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              setIsConfiguring(false);
              fetchSensorData();
            }}
          >
            <Text style={styles.saveButtonText}>Save & Connect</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Icon name="information" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              To connect to the device:{"\n"}
              1. Connect to WiFi: "JointSenseIot"{"\n"}
              2. Password: "habib123"{"\n"}
              3. Use IP: 192.168.4.1
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>IoT Knee Monitor</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setIsSavingData(!isSavingData)} style={[styles.iconButton, isSavingData && styles.activeButton]}>
            <Icon name={isSavingData ? "content-save" : "content-save-outline"} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAutoRefresh(!autoRefresh)} style={styles.iconButton}>
            <Icon name={autoRefresh ? "pause" : "play"} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsConfiguring(true)} style={styles.iconButton}>
            <Icon name="cog" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3b82f6"]} />}>
        <View style={styles.networkCard}>
          <View style={styles.networkHeader}>
            <Icon name="wifi" size={20} color="#3b82f6" />
            <Text style={styles.networkTitle}>Network Configuration</Text>
          </View>
          <View style={styles.networkSelector}>
            {networkOptions.map((network) => (
              <TouchableOpacity key={network.value} style={[styles.networkOption, selectedNetwork === network.value && styles.selectedNetwork]} onPress={() => handleNetworkChange(network.value)}>
                <View style={styles.networkOptionContent}>
                  <Icon name={selectedNetwork === network.value ? "check-circle" : "circle-outline"} size={20} color={selectedNetwork === network.value ? "#10b981" : "#9ca3af"} />
                  <View style={styles.networkInfo}>
                    <Text style={styles.networkName}>{network.name}</Text>
                    <Text style={styles.networkIp}>{network.ip}</Text>
                    <Text style={styles.networkDescription}>{network.description}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.connectionCard, isConnected ? styles.connectedCard : styles.disconnectedCard]}>
          <Icon name={isConnected ? "wifi" : "wifi-off"} size={24} color={isConnected ? "#10b981" : "#ef4444"} />
          <Text style={styles.connectionText}>{isConnected ? "Connected" : "Disconnected"}</Text>
          {isConnected && sensorData && <Text style={styles.deviceName}>{sensorData.device}</Text>}
        </View>

        {!isConnected && (
          <View style={styles.errorCard}>
            <Icon name="alert-circle" size={32} color="#ef4444" />
            <Text style={styles.errorTitle}>Cannot Connect to Device</Text>
            <Text style={styles.errorText}>Make sure you're connected to the device WiFi network or check the IP address in settings.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSensorData}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {isConnected && sensorData && (
          <>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { borderLeftColor: getAngleColor(sensorData.knee_angle) }]}>
                <Icon name="angle-acute" size={28} color={getAngleColor(sensorData.knee_angle)} />
                <Text style={styles.metricValue}>{sensorData.knee_angle.toFixed(1)}°</Text>
                <Text style={styles.metricLabel}>Knee Angle</Text>
                <Text style={styles.metricSubtext}>{sensorData.knee_angle >= 140 ? "Excellent" : sensorData.knee_angle >= 120 ? "Good" : sensorData.knee_angle >= 100 ? "Fair" : "Poor"}</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: getTempColor(sensorData.temperature_c) }]}>
                <Icon name="thermometer" size={28} color={getTempColor(sensorData.temperature_c)} />
                <Text style={styles.metricValue}>{sensorData.temperature_c.toFixed(1)}°C</Text>
                <Text style={styles.metricLabel}>Temperature</Text>
                <Text style={styles.metricSubtext}>{sensorData.temperature_c < 34.5 ? "Normal" : sensorData.temperature_c < 36.0 ? "Mild" : sensorData.temperature_c < 37.5 ? "Elevated" : "High"}</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: "#6b7280" }]}>
                <Icon name="resistor" size={28} color="#6b7280" />
                <Text style={styles.metricValue}>{sensorData.flex_raw}</Text>
                <Text style={styles.metricLabel}>Flex Sensor</Text>
                <Text style={styles.metricSubtext}>Raw ADC Value</Text>
              </View>
            </View>

            <View style={styles.currentStatusCard}>
              <View style={styles.statusHeader}>
                <Icon name="information-outline" size={24} color="#3b82f6" />
                <Text style={styles.currentStatusTitle}>Current Status</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sensorData.status) }]}>
                <Icon name="medical-bag" size={28} color="#fff" />
                <Text style={styles.statusBadgeText}>{sensorData.status}</Text>
              </View>
              <Text style={styles.statusTimestamp}>Last updated: {new Date().toLocaleTimeString()}</Text>
            </View>
          </>
        )}
      </ScrollView>
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
  activeButton: {
    backgroundColor: "#10b981",
    borderRadius: 6,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  connectionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  connectedCard: {
    backgroundColor: "#10b98120",
  },
  disconnectedCard: {
    backgroundColor: "#ef444420",
  },
  connectionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  deviceName: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: "auto",
  },
  errorCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    alignItems: "center",
    minHeight: 120,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  metricSubtext: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  healthButton: {
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  healthButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  legendCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    color: "#6b7280",
  },
  configContainer: {
    padding: 20,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  configInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  configHint: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 18,
  },
  currentStatusCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  currentStatusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  statusTimestamp: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  networkCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  networkHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  networkTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  networkSelector: {
    gap: 8,
  },
  networkOption: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectedNetwork: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  networkOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  networkInfo: {
    flex: 1,
  },
  networkName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  networkIp: {
    fontSize: 12,
    color: "#3b82f6",
    marginBottom: 2,
  },
  networkDescription: {
    fontSize: 11,
    color: "#6b7280",
  },
});
