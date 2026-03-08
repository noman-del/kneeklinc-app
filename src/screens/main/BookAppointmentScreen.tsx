import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from "react-native";
import { Card, Text, Button, TextInput, ActivityIndicator } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { doctorApi, appointmentApi } from "../../services/api";
import { showError } from "../../utils/toast";

export default function BookAppointmentScreen({ navigation }: any) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeSlot, setTimeSlot] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const data = await doctorApi.getAllDoctors();
      if (data && typeof data === "object" && "doctors" in data) {
        setDoctors((data as any).doctors || []);
      } else if (Array.isArray(data)) {
        setDoctors(data);
      } else {
        setDoctors([]);
      }
    } catch (error: any) {
      console.log("Doctors error:", error);
      setDoctors([]);
      showError("Failed to load doctors. Please try again.");
    }
  };

  const fetchAvailableSlots = async (doctorId: string, selectedDate: Date) => {
    setLoadingSlots(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const data = await appointmentApi.getAvailableSlots(doctorId, dateStr);
      const slots = data?.availableSlots || [];

      // Filter out past slots if date is today
      const today = new Date();
      const isToday = selectedDate.toDateString() === today.toDateString();

      if (isToday) {
        const currentTime = today.getHours() * 60 + today.getMinutes();
        const filteredSlots = slots.filter((slot: string) => {
          const [time, period] = slot.split(" ");
          const [hours, minutes] = time.split(":").map(Number);
          let slotHours = hours;

          if (period === "PM" && hours !== 12) {
            slotHours += 12;
          } else if (period === "AM" && hours === 12) {
            slotHours = 0;
          }

          const slotTime = slotHours * 60 + minutes;
          return slotTime > currentTime;
        });
        setAvailableSlots(filteredSlots);
      } else {
        setAvailableSlots(slots);
      }
    } catch (error: any) {
      console.log("Slots error:", error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDoctor && date) {
      fetchAvailableSlots(selectedDoctor.id, date);
      setTimeSlot(""); // Reset time slot when doctor or date changes
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDoctor, date]);

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !date || !timeSlot) {
      showError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const dateStr = date.toISOString().split("T")[0];
      await appointmentApi.bookAppointment({
        doctorId: selectedDoctor.id,
        appointmentDate: dateStr,
        appointmentTime: timeSlot,
        type: "virtual",
        reason,
      });
      navigation.goBack();
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to book appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-plus" size={48} color="#f59e0b" />
        <Text variant="headlineMedium" style={styles.title}>
          Book Appointment
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Title title="Select Doctor" titleStyle={styles.cardTitle} />
        <Card.Content>
          {doctors.map((doctor, index) => (
            <Button key={index} mode={selectedDoctor?.id === doctor.id ? "contained" : "outlined"} onPress={() => setSelectedDoctor(doctor)} style={styles.doctorButton} buttonColor={selectedDoctor?.id === doctor.id ? "#3b82f6" : undefined}>
              {doctor.name || `Dr. ${doctor.firstName} ${doctor.lastName}`}
            </Button>
          ))}
        </Card.Content>
      </Card>

      {selectedDoctor && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.doctorDetails}>
              <MaterialCommunityIcons name="doctor" size={40} color="#3b82f6" />
              <View style={styles.doctorInfo}>
                <Text variant="titleLarge" style={styles.doctorName}>
                  {selectedDoctor.name}
                </Text>
                {selectedDoctor.specialization && (
                  <Text variant="bodyMedium" style={styles.specialization}>
                    {selectedDoctor.specialization}
                  </Text>
                )}
                <View style={styles.doctorMeta}>
                  {selectedDoctor.experience && (
                    <Text variant="bodySmall" style={styles.metaText}>
                      {selectedDoctor.experience}
                    </Text>
                  )}
                  {selectedDoctor.hospital && (
                    <Text variant="bodySmall" style={styles.metaText}>
                      • {selectedDoctor.hospital}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Title title="Appointment Details" titleStyle={styles.cardTitle} />
        <Card.Content>
          <Text style={styles.label}>Appointment Date</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
            <MaterialCommunityIcons name="calendar" size={20} color="#3b82f6" />
            <Text style={styles.datePickerText}>{date.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} minimumDate={getTodayDate()} />}
          <Text style={styles.label}>Available Time Slots</Text>
          {loadingSlots ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading available slots...</Text>
            </View>
          ) : availableSlots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot) => (
                <TouchableOpacity key={slot} style={[styles.slotButton, timeSlot === slot && styles.slotButtonSelected]} onPress={() => setTimeSlot(slot)}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={timeSlot === slot ? "#fff" : "#3b82f6"} />
                  <Text style={[styles.slotButtonText, timeSlot === slot && styles.slotButtonTextSelected]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noSlotsContainer}>
              <MaterialCommunityIcons name="calendar-remove" size={24} color="#9ca3af" />
              <Text style={styles.noSlotsText}>{selectedDoctor && date ? "No available slots for this date" : "Select doctor and date first"}</Text>
            </View>
          )}

          <View style={styles.virtualBadgeContainer}>
            <MaterialCommunityIcons name="video" size={20} color="#3b82f6" />
            <Text style={styles.virtualBadgeText}>Virtual Consultation</Text>
          </View>

          <Text style={styles.label}>Reason for Visit</Text>
          <TextInput value={reason} onChangeText={setReason} mode="outlined" multiline numberOfLines={3} placeholder="Brief description of your concern" style={styles.input} outlineColor="#e5e7eb" activeOutlineColor="#3b82f6" />

          <Button mode="contained" onPress={handleBookAppointment} loading={loading} disabled={loading || !selectedDoctor || !timeSlot} style={styles.bookButton} buttonColor="#3b82f6" icon="check">
            Confirm Booking
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontWeight: "bold",
    color: "#f59e0b",
    marginTop: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  doctorButton: {
    marginBottom: 8,
    borderRadius: 8,
  },
  doctorDetails: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  doctorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  doctorName: {
    fontWeight: "bold",
    color: "#111827",
  },
  specialization: {
    color: "#3b82f6",
    marginTop: 4,
  },
  doctorMeta: {
    flexDirection: "row",
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaText: {
    color: "#6b7280",
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 8,
  },
  datePickerText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#374151",
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  slotButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderRadius: 8,
    gap: 6,
    minWidth: "30%",
  },
  slotButtonSelected: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  slotButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  slotButtonTextSelected: {
    color: "#fff",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingText: {
    marginLeft: 12,
    color: "#6b7280",
  },
  noSlotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginBottom: 8,
  },
  noSlotsText: {
    marginLeft: 12,
    color: "#6b7280",
    flex: 1,
  },
  virtualBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3b82f6",
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  virtualBadgeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  bookButton: {
    marginTop: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
