import React, { useState } from "react";
import { View, StyleSheet, Image, Dimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { Card, Text, Button } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const { width, height } = Dimensions.get("window");

export default function ImageViewScreen({ route, navigation }: any) {
  const { imageUrl, title } = route.params;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.imageContainer}>
        {imageLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text variant="bodyMedium" style={styles.loadingText}>Loading image...</Text>
          </View>
        )}
        
        {imageError ? (
          <View style={styles.errorContainer}>
            <Icon name="image-off" size={48} color="#ef4444" />
            <Text variant="bodyMedium" style={styles.errorText}>Failed to load image</Text>
            <Button 
              mode="outlined" 
              onPress={() => {
                setImageError(false);
                setImageLoading(true);
              }}
              style={styles.retryButton}
            >
              Retry
            </Button>
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullImage}
            resizeMode="contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          icon="close"
        >
          Close
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontWeight: "600",
    color: "#374151",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  fullImage: {
    width: width,
    height: height * 0.7,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#fff",
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    borderColor: "#fff",
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
  },
  closeButton: {
    backgroundColor: "#3b82f6",
  },
});
