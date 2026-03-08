import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Card, Text, Avatar, Badge } from "react-native-paper";
import { messageApi } from "../../services/api";
import { API_CONFIG } from "../../config/api";
import { showError } from "../../utils/toast";

export default function MessagesScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();

    // Poll conversations every 3 seconds
    const interval = setInterval(() => {
      fetchConversations();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const data = await messageApi.getConversations();
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setConversations(data);
      } else if (data && typeof data === "object" && "conversations" in data) {
        setConversations((data as any).conversations || []);
      } else {
        setConversations([]);
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.log("Messages error:", error);
      }
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const renderConversation = ({ item }: any) => {
    // Backend returns flat structure: {userId, name, specialization, ...}
    if (!item || !item.userId) {
      console.log("Invalid conversation item:", item);
      return null;
    }

    // Use flat structure from backend
    const displayName = item.title ? `${item.title} ${item.name}` : item.name || "Unknown";
    const hasProfileImage = item.profileImage && item.profileImage.trim() !== "";

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Conversation", {
            userId: item.userId,
            userName: displayName,
            userTitle: item.title,
            userSpecialization: item.specialization,
            userExperience: item.experience,
            userType: item.userType,
            profileImage: item.profileImage,
          })
        }
      >
        <Card style={styles.conversationCard}>
          <Card.Content style={styles.conversationContent}>
            {hasProfileImage ? <Avatar.Image size={56} source={{ uri: item.profileImage.startsWith("http") ? item.profileImage : `${API_CONFIG.BASE_URL.replace("/api", "")}${item.profileImage}` }} style={styles.avatar} /> : <Avatar.Icon size={56} icon="account" style={styles.avatar} />}
            <View style={styles.conversationInfo}>
              <Text variant="titleMedium" style={styles.userName}>
                {displayName}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={styles.lastMessage}>
                {item.lastMessage || "No messages yet"}
              </Text>
            </View>
            {item.unreadCount > 0 && <Badge style={styles.badge}>{item.unreadCount}</Badge>}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Messages
        </Text>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge">No conversations yet</Text>
        </View>
      ) : (
        <FlatList data={conversations} renderItem={renderConversation} keyExtractor={(item) => item.userId} contentContainerStyle={styles.list} />
      )}
    </View>
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
    backgroundColor: "#fff",
  },
  title: {
    fontWeight: "bold",
    color: "#3b82f6",
  },
  list: {
    padding: 16,
  },
  conversationCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  conversationContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  avatar: {
    backgroundColor: "#3b82f6",
  },
  conversationInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },
  lastMessage: {
    color: "#9ca3af",
    marginTop: 4,
  },
  badge: {
    backgroundColor: "#8b5cf6",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
