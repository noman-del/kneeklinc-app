import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, SafeAreaView, Platform, StatusBar } from "react-native";
import { Card, Text, Button, TextInput, Avatar, IconButton } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";
import { API_CONFIG } from "../../config/api";
import { showError, showSuccess } from "../../utils/toast";

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Profile data
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });

  // Profile picture
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profileImageUrl || null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Password data
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showError("Permission to access photos is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await handleUploadProfilePicture(result.assets[0].uri);
    }
  };

  const handleUploadProfilePicture = async (uri: string) => {
    setUploadingPicture(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("profilePicture", {
        uri,
        type: "image/jpeg",
        name: "profile.jpg",
      } as any);

      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/update-profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        // Don't store local URI - refresh user data to get backend URL
        await refreshUser();
        setProfilePicture(null); // Clear local state, use user.profileImageUrl from context
        showSuccess("Profile picture updated successfully");
      } else {
        throw new Error("Failed to upload");
      }
    } catch (error: any) {
      showError("Failed to upload profile picture");
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    Alert.alert("Delete Profile Picture", "Are you sure you want to delete your profile picture?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("auth_token");
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/delete-profile-picture`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (response.ok) {
              await refreshUser();
              setProfilePicture(null);
              showSuccess("Profile picture deleted");
            }
          } catch (error) {
            showError("Failed to delete profile picture");
          }
        },
      },
    ]);
  };

  const handleProfileUpdate = async () => {
    if (!profileData.firstName || !profileData.lastName || !profileData.email) {
      showError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await authApi.updateProfile(profileData);
      await refreshUser();
      showSuccess("Profile updated successfully");
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showError("Please fill in all password fields");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showSuccess("Password changed successfully");
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: async () => await logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.headerWrapper}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <IconButton icon="logout" size={20} iconColor="#ef4444" style={{ margin: 0, padding: 0 }} />
            </TouchableOpacity>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={handlePickImage} disabled={uploadingPicture}>
                {user?.profileImageUrl ? <Image source={{ uri: `${API_CONFIG.BASE_URL.replace("/api", "")}${user.profileImageUrl}` }} style={styles.avatar} /> : <Avatar.Icon size={100} icon="account" style={styles.avatar} />}
                <View style={styles.cameraIconContainer}>
                  <IconButton icon="camera" size={20} iconColor="#fff" style={styles.cameraIcon} />
                </View>
              </TouchableOpacity>
              {user?.profileImageUrl && <IconButton icon="delete" size={20} iconColor="#ef4444" onPress={handleDeleteProfilePicture} style={styles.deleteIcon} />}
            </View>
            <Text variant="headlineMedium" style={styles.name}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {user?.email}
            </Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <Button mode={activeTab === "profile" ? "contained" : "outlined"} onPress={() => setActiveTab("profile")} style={styles.tabButton}>
            Profile
          </Button>
          <Button mode={activeTab === "security" ? "contained" : "outlined"} onPress={() => setActiveTab("security")} style={styles.tabButton}>
            Security
          </Button>
        </View>

        {activeTab === "profile" && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Profile Information
              </Text>
              <Text variant="bodyMedium" style={styles.sectionSubtitle}>
                Update your personal details
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>First Name</Text>
                <TextInput value={profileData.firstName} onChangeText={(value) => setProfileData({ ...profileData, firstName: value })} mode="outlined" style={styles.input} outlineColor="#e5e7eb" activeOutlineColor="#3b82f6" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput value={profileData.lastName} onChangeText={(value) => setProfileData({ ...profileData, lastName: value })} mode="outlined" style={styles.input} outlineColor="#e5e7eb" activeOutlineColor="#3b82f6" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput value={profileData.email} onChangeText={(value) => setProfileData({ ...profileData, email: value })} mode="outlined" keyboardType="email-address" autoCapitalize="none" style={styles.input} outlineColor="#e5e7eb" activeOutlineColor="#3b82f6" />
              </View>

              <Button mode="contained" onPress={handleProfileUpdate} loading={loading} disabled={loading} style={styles.updateButton} buttonColor="#3b82f6" icon="content-save">
                Update Profile
              </Button>
            </Card.Content>
          </Card>
        )}

        {activeTab === "security" && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Change Password
              </Text>
              <Text variant="bodyMedium" style={styles.sectionSubtitle}>
                Update your password to keep your account secure
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Password</Text>
                <TextInput
                  value={passwordData.currentPassword}
                  onChangeText={(value) => setPasswordData({ ...passwordData, currentPassword: value })}
                  mode="outlined"
                  secureTextEntry={!showCurrentPassword}
                  right={<TextInput.Icon icon={showCurrentPassword ? "eye-off" : "eye"} onPress={() => setShowCurrentPassword(!showCurrentPassword)} />}
                  style={styles.input}
                  outlineColor="#e5e7eb"
                  activeOutlineColor="#3b82f6"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput value={passwordData.newPassword} onChangeText={(value) => setPasswordData({ ...passwordData, newPassword: value })} mode="outlined" secureTextEntry={!showNewPassword} right={<TextInput.Icon icon={showNewPassword ? "eye-off" : "eye"} onPress={() => setShowNewPassword(!showNewPassword)} />} style={styles.input} outlineColor="#e5e7eb" activeOutlineColor="#3b82f6" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  value={passwordData.confirmPassword}
                  onChangeText={(value) => setPasswordData({ ...passwordData, confirmPassword: value })}
                  mode="outlined"
                  secureTextEntry={!showConfirmPassword}
                  right={<TextInput.Icon icon={showConfirmPassword ? "eye-off" : "eye"} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />}
                  style={styles.input}
                  outlineColor="#e5e7eb"
                  activeOutlineColor="#3b82f6"
                />
              </View>

              <Button mode="contained" onPress={handlePasswordChange} loading={loading} disabled={loading} style={styles.updateButton} buttonColor="#3b82f6" icon="lock-reset">
                Change Password
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  headerWrapper: {
    backgroundColor: "#fff",
    position: "relative",
  },
  logoutButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 999,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.5,
  },
  header: {
    alignItems: "center",
    padding: 16,
    paddingTop: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  name: {
    fontWeight: "bold",
    marginTop: 12,
    fontSize: 20,
  },
  email: {
    color: "#6b7280",
    marginTop: 4,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: "bold",
    color: "#111827",
  },
  sectionSubtitle: {
    marginBottom: 24,
    color: "#6b7280",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
  },
  updateButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIcon: {
    margin: 0,
  },
  deleteIcon: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
});
