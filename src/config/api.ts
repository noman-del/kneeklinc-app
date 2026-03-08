// API Configuration for KneeKlinic Mobile App
// The backend runs on port 5000 (same server that serves the web app)

// Platform-specific API URLs for LOCAL development:
// - iOS Simulator: http://localhost:5000 (shares network with Mac)
// - Android Emulator: http://10.0.2.2:5000 (special emulator IP)
// - Physical Devices: Use your computer's IP address (e.g., 192.168.x.x:5000)
// - Web: http://localhost:5000

import { Platform } from "react-native";
import Constants from "expo-constants";

// IMPORTANT: Set your computer's IP address here for physical device testing
// Find your IP: Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
// Look for IPv4 Address (e.g., 192.168.1.100)
const COMPUTER_IP = "192.168.0.116"; // Your WiFi IP address

const API_BASE_URLS = {
  // iOS Simulator - can use localhost (shares Mac's network)
  IOS_SIMULATOR: "http://localhost:5000",

  // iOS Physical Device - needs computer IP
  IOS_DEVICE: `http://${COMPUTER_IP}:5000`,

  // Android Emulator - needs special IP to reach host machine
  ANDROID_EMULATOR: "http://10.0.2.2:5000",

  // Android Physical Device - needs computer IP
  ANDROID_DEVICE: `http://${COMPUTER_IP}:5000`,

  // Web - can use localhost
  WEB: "http://localhost:5000",
};

// Auto-detect platform and device type, then use correct URL
const getBaseURL = () => {
  const isExpoGo = Constants.appOwnership === "expo"; // true when running in Expo Go app

  if (Platform.OS === "ios") {
    return isExpoGo ? API_BASE_URLS.IOS_DEVICE : API_BASE_URLS.IOS_SIMULATOR;
  } else if (Platform.OS === "android") {
    return isExpoGo ? API_BASE_URLS.ANDROID_DEVICE : API_BASE_URLS.ANDROID_EMULATOR;
  } else {
    return API_BASE_URLS.WEB;
  }
};

// Default configuration
export const API_CONFIG = {
  BASE_URL: `${getBaseURL()}/api`,
  TIMEOUT: 60000, // 60 seconds - increased for slower connections
};

export const getApiUrl = (endpoint: string): string => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  console.log("Building API URL:", url);
  return url;
};
