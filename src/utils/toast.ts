import { Alert, Platform, ToastAndroid } from "react-native";

export const showSuccess = (message: string, title: string = "Success") => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert(title, message);
  }
};

export const showError = (message: string, title: string = "Error") => {
  Alert.alert(title, message);
};

export const showInfo = (message: string, title: string = "Info") => {
  Alert.alert(title, message);
};
