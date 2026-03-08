import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../config/api";

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        console.log("=== API REQUEST ===");
        console.log("URL:", config.url);
        console.log("Method:", config.method);
        console.log("Base URL:", config.baseURL);
        console.log("Full URL:", `${config.baseURL}${config.url}`);

        const token = await AsyncStorage.getItem("auth_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        console.log("===================");
        return config;
      },
      (error: AxiosError) => {
        console.log("=== REQUEST ERROR ===");
        console.log("Error:", error.message);
        console.log("=====================");
        return Promise.reject(error);
      },
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log("=== API RESPONSE SUCCESS ===");
        console.log("Status:", response.status);
        console.log("URL:", response.config.url);
        console.log("============================");
        return response;
      },
      async (error: AxiosError) => {
        console.log("=== API RESPONSE ERROR ===");
        console.log("Message:", error.message);
        console.log("Code:", error.code);
        console.log("Response:", error.response?.status);
        console.log("Response Data:", error.response?.data);
        console.log("==========================");

        if (error.response?.status === 401) {
          await AsyncStorage.removeItem("auth_token");
          await AsyncStorage.removeItem("user");
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.delete<T>(url, config);
    return response.data;
  }

  async uploadFile<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.api.post<T>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
}

export const apiService = new ApiService();

export interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  userType: "patient" | "doctor" | "admin";
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

export interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  userType: "patient";
}

export interface LoginData {
  email: string;
  password: string;
}

export interface OTPVerificationData {
  email: string;
  otp: string;
}

export const authApi = {
  signup: (data: SignupData) => apiService.post<{ message: string }>("/auth/signup", data),
  verifyOTP: (data: OTPVerificationData) => apiService.post<AuthResponse>("/auth/verify-otp", data),
  resendOTP: (email: string) => apiService.post<{ message: string }>("/auth/resend-otp", { email }),
  login: (data: LoginData) => apiService.post<AuthResponse>("/auth/login", data),
  getUser: () => apiService.get<{ user: User; authenticated: boolean; hasCompletedRegistration: boolean }>("/auth/user"),
  logout: () => apiService.post<{ message: string }>("/auth/logout"),
  updateProfile: (data: any) => apiService.put<{ user: User; message: string }>("/auth/update-profile", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => apiService.put<{ message: string }>("/auth/change-password", data),
  forgotPassword: (email: string) => apiService.post<{ message: string }>("/auth/forgot-password", { email }),
  verifyResetOTP: (email: string, otp: string) => apiService.post<{ message: string }>("/auth/verify-reset-otp", { email, otp }),
  resetPassword: (email: string, otp: string, newPassword: string) => apiService.post<{ message: string }>("/auth/reset-password", { email, otp, newPassword }),
};

export const patientApi = {
  register: (data: any) => apiService.post<{ message: string; patient: any }>("/patients/register", data),
  getProfile: (id: string) => apiService.get<any>(`/patients/${id}`),
  getRecommendations: () => apiService.get<any>("/patient/recommendations"),
  saveRecommendations: (data: { klGrade: string; label?: string; recommendations: string[] }) => apiService.post<any>("/patient/recommendations", data),
};

export const aiApi = {
  analyzeXray: (formData: FormData) => apiService.uploadFile<any>("/ai/analyze-xray", formData),
  getAnalyses: () => apiService.get<any[]>("/ai/analyses"),
  getAnalysis: (id: string) => apiService.get<any>(`/ai/analyses/${id}`),
  saveToProfile: (id: string) => apiService.post<any>(`/ai/analyses/${id}/save-to-profile`),
};

export const appointmentApi = {
  bookAppointment: (data: any) => apiService.post<any>("/appointments/book", data),
  getMyAppointments: () => apiService.get<any[]>("/appointments/my-appointments"),
  updateStatus: (id: string, status: string) => apiService.put<any>(`/appointments/${id}/status`, { status }),
  reschedule: (id: string, data: any) => apiService.put<any>(`/appointments/${id}/reschedule`, data),
  cancel: (id: string) => apiService.delete<any>(`/appointments/${id}`),
  getAvailableSlots: (doctorId: string, date: string) => apiService.get<any>(`/doctors/${doctorId}/available-slots?date=${date}`),
};

export const messageApi = {
  sendMessage: (data: { receiverId: string; message?: string; content?: string; attachmentUrl?: string; attachmentType?: string; attachmentOriginalName?: string }) => apiService.post<any>("/messages/send", data),
  getInbox: () => apiService.get<any[]>("/messages/inbox"),
  getSent: () => apiService.get<any[]>("/messages/sent"),
  getConversations: () => apiService.get<any[]>("/messages/conversations"),
  getConversation: (userId: string) => apiService.get<any>(`/messages/conversation/${userId}`),
  markAsRead: (id: string) => apiService.put<any>(`/messages/${id}/read`),
};

export const doctorApi = {
  getAllDoctors: () => apiService.get<any[]>("/doctors/list"),
  getDoctor: (id: string) => apiService.get<any>(`/doctors/${id}`),
  getAvailability: (doctorId: string) => apiService.get<any>(`/doctors/${doctorId}/availability`),
};
