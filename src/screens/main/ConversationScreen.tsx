import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Modal, StatusBar } from "react-native";
import { TextInput, IconButton, Text, Card, ActivityIndicator, Appbar, Avatar } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { messageApi } from "../../services/api";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { showError, showSuccess } from "../../utils/toast";

export default function ConversationScreen({ route, navigation }: any) {
  const { userId, userName, userTitle, userSpecialization, userExperience, userType, profileImage } = route.params;
  const { user } = useAuth();

  console.log("ConversationScreen params:", { userId, userName, userTitle, profileImage });

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fullImageView, setFullImageView] = useState<string | null>(null);
  const [otherUserDetails, setOtherUserDetails] = useState({
    name: userName || "Chat",
    title: userTitle || "",
    specialization: userSpecialization || "",
    experience: userExperience || "",
    userType: userType || "doctor",
    profileImage: profileImage || "",
  });

  console.log("Initial otherUserDetails:", otherUserDetails);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();
    // Only fetch user details if not provided in params
    if (!userName) {
      fetchOtherUserDetails();
    }

    // Poll messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchOtherUserDetails = async () => {
    try {
      const token = await import("@react-native-async-storage/async-storage").then((m) => m.default.getItem("auth_token"));
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "User";

        // Fetch doctor details if user is a doctor
        let doctorDetails = { title: "", specialization: "", experience: "" };
        if (userData.userType === "doctor") {
          try {
            const doctorResponse = await fetch(`${API_CONFIG.BASE_URL}/doctors/profile/${userId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (doctorResponse.ok) {
              const doctorData = await doctorResponse.json();
              doctorDetails = {
                title: doctorData.title || "",
                specialization: doctorData.primarySpecialization || "",
                experience: doctorData.yearsOfExperience ? `${doctorData.yearsOfExperience} years exp` : "",
              };
            }
          } catch (err) {
            console.log("Failed to fetch doctor details:", err);
          }
        }

        setOtherUserDetails({
          name: fullName,
          title: doctorDetails.title,
          specialization: doctorDetails.specialization,
          experience: doctorDetails.experience,
          userType: userData.userType || "doctor",
          profileImage: userData.profileImageUrl || "",
        });

        console.log("Other user details:", { fullName, ...doctorDetails });
      }
    } catch (error) {
      console.log("Failed to fetch user details:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const data = await messageApi.getConversation(userId);
      // Backend returns { messages: [...] }
      let messagesArray: any[] = [];

      if (data && typeof data === "object" && "messages" in data) {
        messagesArray = (data as any).messages || [];
      } else if (Array.isArray(data)) {
        messagesArray = data;
      }

      // Messages are sorted by createdAt ascending from backend (oldest first)
      // Reverse so newest is first in array, then inverted FlatList shows newest at bottom
      setMessages(messagesArray.reverse());
    } catch (error: any) {
      console.log("Conversation error:", error);
      setMessages([]);
      showError("Failed to load conversation. Please try again.");
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showError("Permission to access photos is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImagePreview(result.assets[0].uri);
    }
  };

  const clearAttachment = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const uploadAttachment = async (uri: string) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: "attachment.jpg",
    } as any);

    const token = await import("@react-native-async-storage/async-storage").then((m) => m.default.getItem("auth_token"));
    const response = await fetch(`${API_CONFIG.BASE_URL}/messages/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload attachment");
    }

    const data = await response.json();
    return data;
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedImage) return;

    console.log("Sending message to userId:", userId);
    console.log("Message text:", newMessage);

    setLoading(true);
    setUploading(!!selectedImage);
    try {
      let attachmentData: any = {};

      if (selectedImage) {
        console.log("Uploading attachment...");
        const uploadResult = await uploadAttachment(selectedImage);
        attachmentData = {
          attachmentUrl: uploadResult.attachmentUrl,
          attachmentType: "image",
          attachmentOriginalName: uploadResult.originalName,
        };
        console.log("Attachment uploaded:", uploadResult.attachmentUrl);
      }

      const messageData = {
        receiverId: userId,
        message: newMessage || "",
        senderType: user?.userType || "patient",
        receiverType: otherUserDetails.userType,
        ...attachmentData,
      };

      console.log("Sending message with data:", messageData);
      await messageApi.sendMessage(messageData);
      console.log("Message sent successfully");

      setNewMessage("");
      clearAttachment();
      await fetchMessages();
      // For inverted FlatList, scroll to offset 0 (bottom)
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    } catch (error: any) {
      console.error("Send message error:", error);
      showError(error.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const renderMessage = ({ item }: any) => {
    // Backend returns senderId as ObjectId string, not populated object
    const isMyMessage = item.senderId === user?._id || item.senderId?.toString() === user?._id || item.isMine;
    const messageKey = item._id || item.id || `${item.senderId}-${item.createdAt}`;

    return (
      <View key={messageKey} style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.theirMessage]}>
        <Card style={isMyMessage ? styles.myMessageCard : styles.theirMessageCard}>
          <Card.Content>
            {item.attachmentUrl && (
              <TouchableOpacity onPress={() => setFullImageView(`${API_CONFIG.BASE_URL.replace("/api", "")}${item.attachmentUrl}`)}>
                <Image source={{ uri: `${API_CONFIG.BASE_URL.replace("/api", "")}${item.attachmentUrl}` }} style={styles.attachmentImage} resizeMode="cover" />
              </TouchableOpacity>
            )}
            {/* Backend uses 'message' field, not 'content' */}
            {(item.message || item.content) && (
              <Text variant="bodyMedium" style={isMyMessage ? styles.myMessageText : styles.theirMessageText}>
                {item.message || item.content}
              </Text>
            )}
            <Text variant="bodySmall" style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <View style={styles.headerContent}>
          {otherUserDetails.profileImage && otherUserDetails.profileImage.trim() !== "" ? <Avatar.Image size={40} source={{ uri: `${API_CONFIG.BASE_URL.replace("/api", "")}${otherUserDetails.profileImage}` }} style={styles.headerAvatar} /> : <Avatar.Icon size={40} icon="account" style={styles.headerAvatar} />}
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={styles.headerTitle} numberOfLines={1}>
              {otherUserDetails.name}
            </Text>
            {(otherUserDetails.specialization || otherUserDetails.experience) && (
              <Text variant="bodySmall" style={styles.headerSubtitle} numberOfLines={1}>
                {otherUserDetails.specialization}
                {otherUserDetails.experience && otherUserDetails.specialization ? " • " : ""}
                {otherUserDetails.experience}
              </Text>
            )}
          </View>
        </View>
      </Appbar.Header>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={100}>
        <FlatList ref={flatListRef} data={messages} renderItem={renderMessage} keyExtractor={(item) => item._id || item.id || `${item.senderId}-${item.createdAt}-${Math.random()}`} contentContainerStyle={styles.messagesList} inverted={true} />

        {imagePreview && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imagePreview }} style={styles.previewImage} />
            <IconButton icon="close" size={20} onPress={clearAttachment} style={styles.closePreview} />
          </View>
        )}

        <View style={styles.inputContainer}>
          <IconButton icon="image" size={24} onPress={handlePickImage} disabled={loading} />
          <TextInput value={newMessage} onChangeText={setNewMessage} placeholder="Type a message..." mode="outlined" style={styles.input} multiline />
          {uploading ? <ActivityIndicator size="small" color="#3b82f6" /> : <IconButton icon="send" size={24} onPress={handleSend} disabled={loading || (!newMessage.trim() && !selectedImage)} />}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!fullImageView} transparent={true} onRequestClose={() => setFullImageView(null)}>
        <View style={styles.fullImageModal}>
          <TouchableOpacity style={styles.fullImageClose} onPress={() => setFullImageView(null)}>
            <Icon name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {fullImageView && <Image source={{ uri: fullImageView }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#3b82f6",
    elevation: 4,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 16,
  },
  headerAvatar: {
    backgroundColor: "#e0e7ff",
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#e9d5ff",
    marginTop: 2,
  },
  flex: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessage: {
    alignItems: "flex-end",
  },
  theirMessage: {
    alignItems: "flex-start",
  },
  myMessageCard: {
    backgroundColor: "#3b82f6",
    maxWidth: "80%",
    elevation: 2,
  },
  theirMessageCard: {
    backgroundColor: "#ffffff",
    maxWidth: "80%",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  myMessageText: {
    color: "#ffffff",
  },
  theirMessageText: {
    color: "#000000",
  },
  timestamp: {
    marginTop: 4,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  previewContainer: {
    position: "relative",
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  closePreview: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
  },
  fullImageModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImageClose: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
});
