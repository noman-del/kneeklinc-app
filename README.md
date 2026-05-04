# KneeKlinic Mobile App

## Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/noman-del/kneeklinc-app.git
cd kneeklinc-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Find Your Computer's IP

**Windows:**

```bash
ipconfig
```

Look for **IPv4 Address** (e.g., `192.168.0.116`)

**Mac/Linux:**

```bash
ifconfig
```

Look for **inet** address (e.g., `192.168.0.116`)

### 4. Update API Configuration

Open `src/config/api.ts` and update **line 16**:

```typescript
const COMPUTER_IP = "YOUR_IP_HERE"; // Replace with your IP from step 3
```

### 5. Start Backend Server

Make sure your backend is running on port 5000

### 6. Start Mobile App

```bash
npm start
```

### 7. Test on Phone

- Connect phone to **same WiFi** as computer
- Open **Expo Go** app
- Scan QR code (iOS: Camera app, Android: Expo Go scanner)

Done!

---

## Features

### 🏥 Core Features

- **AI X-ray Analysis**: Upload knee X-rays for OA detection
- **Progress Tracking**: Monitor treatment progress over time
- **Appointments**: Book and manage doctor appointments
- **Messaging**: Communicate with healthcare providers
- **Profile Management**: Update patient information

### 🔌 IoT Knee Monitoring (NEW!)

- **Real-time Sensor Data**: Monitor knee angle and temperature
- **ESP32/ESP8266 Support**: Connect to IoT devices via WiFi
- **Automatic Status Detection**: Normal, Mild OA, Moderate OA, Severe
- **Live Dashboard**: Visual metrics with color-coded indicators

**See [IOT-SETUP.md](./IOT-SETUP.md) for complete IoT setup guide**

---

## Tech Stack

- React Native
- Expo
- TypeScript
- React Navigation
- Axios
- React Native Paper
- IoT Integration (ESP32/ESP8266)
