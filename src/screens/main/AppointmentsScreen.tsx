import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card, Text, Button, Chip } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { appointmentApi, doctorApi } from "../../services/api";
import { showError, showInfo } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";

export default function AppointmentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();

    // Poll appointments every 30 seconds to update canJoinVideoVisit status
    const interval = setInterval(() => {
      fetchAppointments();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Refresh appointments when screen comes into focus (e.g., after booking)
  useFocusEffect(
    React.useCallback(() => {
      fetchAppointments();
    }, []),
  );

  const fetchDoctors = async () => {
    try {
      const data = await doctorApi.getAllDoctors();
      // API returns { doctors: [...] }
      let doctorsArray: any[] = [];

      if (data && typeof data === "object" && "doctors" in data) {
        doctorsArray = (data as any).doctors || [];
      } else if (Array.isArray(data)) {
        doctorsArray = data;
      }

      console.log("Fetched doctors:", doctorsArray.length);
      console.log("First doctor structure:", doctorsArray[0]);
      setDoctors(doctorsArray);
    } catch (error: any) {
      console.log("Doctors error:", error);
      setDoctors([]);
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await appointmentApi.getMyAppointments();
      // Backend returns { appointments: [...] }
      let appointmentsArray: any[] = [];

      if (data && typeof data === "object" && "appointments" in data) {
        appointmentsArray = (data as any).appointments || [];
      } else if (Array.isArray(data)) {
        appointmentsArray = data;
      }

      console.log("Fetched appointments:", appointmentsArray.length);
      setAppointments(appointmentsArray);
    } catch (error: any) {
      console.log("Appointments error:", error);
      setAppointments([]);
      showError("Failed to load appointments. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleCancelAppointment = async (id: string) => {
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel this appointment?", [
      {
        text: "No",
        style: "cancel",
      },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await appointmentApi.cancel(id);
            await fetchAppointments();
            showInfo("Appointment cancelled successfully");
          } catch (error: any) {
            showError(error.response?.data?.message || "Failed to cancel appointment");
          }
        },
      },
    ]);
  };

  const handleJoinMeeting = async (meetingUrl: string) => {
    try {
      const supported = await Linking.canOpenURL(meetingUrl);
      if (supported) {
        await Linking.openURL(meetingUrl);
      } else {
        showError("Cannot open meeting URL");
      }
    } catch (error) {
      showError("Failed to open meeting");
    }
  };

  const handleMessageDoctor = (appointment: any) => {
    try {
      let receiverId: string | null = null;

      // Match web app logic: Get doctorId from appointment
      const doctorId = typeof appointment.doctorId === "string" ? appointment.doctorId : (appointment.doctorId as any)?._id;

      if (doctorId && doctors.length > 0) {
        // Primary method: Find doctor in doctors list and get userId (like web app)
        const doctor = doctors.find((d) => d.id === doctorId || d._id === doctorId);
        if (doctor) {
          receiverId = doctor.userId;
          console.log("Found doctor userId from doctors list:", receiverId);
        }
      }

      // Fallback 1: Use doctorUserId from backend meta
      if (!receiverId && appointment.doctorUserId) {
        receiverId = appointment.doctorUserId;
        console.log("Using doctorUserId from backend meta:", receiverId);
      }

      // Fallback 2: Try populated doctorId.userId
      if (!receiverId && appointment.doctorId && typeof appointment.doctorId === "object" && appointment.doctorId.userId) {
        receiverId = appointment.doctorId.userId;
        console.log("Using doctorId.userId:", receiverId);
      }

      if (receiverId) {
        console.log("Looking for doctor with userId:", receiverId);
        console.log("Doctors array:", doctors);
        console.log("Doctors is array?", Array.isArray(doctors));
        console.log("Doctors length:", doctors?.length);

        if (!Array.isArray(doctors) || doctors.length === 0) {
          console.error("Doctors list is not available or empty");
          showError("Doctor information not loaded. Please try again.");
          return;
        }

        console.log(
          "Available doctors:",
          doctors.map((d) => ({
            userId: d.userId,
            _id: d._id,
            id: d.id,
            name: d.name || `${d.firstName || ""} ${d.lastName || ""}`,
          })),
        );

        // Try multiple fields to find the doctor
        const doctor = doctors.find((d) => d.userId === receiverId || d._id === receiverId || d.id === receiverId);
        console.log("Found doctor:", doctor);

        if (!doctor) {
          console.error("Doctor not found in list for userId:", receiverId);
          console.error("Receiver ID:", receiverId);
        }

        // Use name field if available, otherwise construct from firstName/lastName
        const fullName = doctor?.name || (doctor ? `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() : "");
        const displayName = doctor?.title ? `${doctor.title} ${fullName}` : fullName || "Unknown Doctor";

        navigation.navigate("Conversation", {
          userId: receiverId,
          userName: displayName,
          userTitle: doctor?.title || "",
          userSpecialization: doctor?.primarySpecialization || "",
          userExperience: doctor?.yearsOfExperience ? `${doctor.yearsOfExperience} years exp` : "",
          userType: "doctor",
          profileImage: doctor?.profileImageUrl || "",
        });
      } else {
        console.error("Could not determine doctor userId for appointment:", appointment);
        console.error("Available doctors:", doctors.length);
        showError("Cannot open conversation - doctor information not available");
      }
    } catch (error) {
      console.error("Error opening message:", error);
      showError("Failed to open conversation");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#10b981";
      case "scheduled":
        return "#3b82f6";
      case "completed":
        return "#6b7280";
      case "cancelled":
        return "#ef4444";
      default:
        return "#9ca3af";
    }
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-clock" size={48} color="#f59e0b" />
        <Text variant="headlineMedium" style={styles.title}>
          Appointments
        </Text>
        <Button mode="contained" onPress={() => navigation.navigate("BookAppointment")} icon="plus" style={styles.bookButton}>
          Book New Appointment
        </Button>
      </View>

      {loading ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text>Loading...</Text>
          </Card.Content>
        </Card>
      ) : appointments.length === 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={64} color="#9ca3af" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                No appointments yet
              </Text>
            </View>
          </Card.Content>
        </Card>
      ) : (
        appointments.map((appointment, index) => (
          <Card key={index} style={styles.card}>
            <Card.Content>
              <View style={styles.appointmentHeader}>
                <View style={styles.doctorNameContainer}>
                  <MaterialCommunityIcons name="doctor" size={24} color="#3b82f6" />
                  <Text variant="titleLarge" style={styles.doctorName}>
                    {appointment.doctorName || appointment.doctorId?.name || `Dr. ${appointment.doctorId?.firstName || ""} ${appointment.doctorId?.lastName || ""}`.trim() || "Doctor"}
                  </Text>
                </View>
                <Chip style={[styles.statusChip, { backgroundColor: getStatusColor(appointment.status) }]} textStyle={styles.statusText}>
                  {appointment.status.toUpperCase()}
                </Chip>
              </View>

              {/* Doctor Details */}
              {(appointment.doctorSpecialization || appointment.doctorExperience || appointment.doctorHospital) && (
                <View style={styles.doctorDetails}>
                  {appointment.doctorSpecialization && (
                    <Text variant="bodySmall" style={styles.specialization}>
                      {appointment.doctorSpecialization}
                    </Text>
                  )}
                  {appointment.doctorExperience && (
                    <Text variant="bodySmall" style={styles.metaText}>
                      {appointment.doctorExperience}
                    </Text>
                  )}
                  {appointment.doctorHospital && (
                    <Text variant="bodySmall" style={styles.metaText}>
                      • {appointment.doctorHospital}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="calendar" size={20} color="#6b7280" />
                <Text variant="bodyMedium" style={styles.detailText}>
                  {new Date(appointment.appointmentDate).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock" size={20} color="#6b7280" />
                <Text variant="bodyMedium" style={styles.detailText}>
                  {appointment.appointmentTime || appointment.timeSlot}
                </Text>
              </View>

              {appointment.type && (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name={appointment.type === "virtual" ? "video" : "hospital-building"} size={20} color="#6b7280" />
                  <Text variant="bodyMedium" style={styles.detailText}>
                    {appointment.type === "virtual" ? "Virtual Consultation" : "In-Person Visit"}
                  </Text>
                </View>
              )}

              {appointment.reason && (
                <View style={styles.reasonRow}>
                  <MaterialCommunityIcons name="text" size={20} color="#6b7280" style={styles.reasonIcon} />
                  <Text variant="bodyMedium" style={styles.reasonText}>
                    {appointment.reason}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {/* Join Meeting - Only for virtual confirmed appointments with meeting URL */}
                {appointment.type === "virtual" && appointment.status === "confirmed" && appointment.meetingUrl && (
                  <Button mode="contained" onPress={() => handleJoinMeeting(appointment.meetingUrl)} style={styles.joinButton} buttonColor="#10b981" icon="video" contentStyle={styles.buttonContent} disabled={!appointment.canJoinVideoVisit}>
                    Join Meeting
                  </Button>
                )}

                {/* Message Button - Only for scheduled/confirmed appointments */}
                {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                  <Button mode="outlined" onPress={() => handleMessageDoctor(appointment)} style={styles.messageButton} textColor="#8b5cf6" icon="message" contentStyle={styles.buttonContent}>
                    Message Doctor
                  </Button>
                )}

                {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                  <Button mode="outlined" onPress={() => handleCancelAppointment(appointment.id)} style={styles.cancelButton} textColor="#ef4444" icon="close-circle" contentStyle={styles.buttonContent}>
                    Cancel Appointment
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        ))
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
    color: "#f59e0b",
    marginTop: 12,
    marginBottom: 16,
  },
  bookButton: {
    width: "100%",
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
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  doctorNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  statusChip: {
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 11,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    color: "#374151",
    flex: 1,
    paddingTop: 2,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    marginTop: 4,
  },
  reasonIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  reasonText: {
    color: "#374151",
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 16,
    gap: 8,
  },
  joinButton: {
    borderRadius: 8,
  },
  messageButton: {
    borderColor: "#8b5cf6",
    borderRadius: 8,
  },
  cancelButton: {
    borderColor: "#ef4444",
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 4,
  },
  doctorName: {
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
  },
  doctorDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    paddingLeft: 8,
  },
  specialization: {
    color: "#6b7280",
    fontWeight: "600",
    marginRight: 8,
  },
  metaText: {
    color: "#9ca3af",
    fontSize: 12,
    marginRight: 8,
  },
});
