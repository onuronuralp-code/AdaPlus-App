# ADA - Interstellar Travel & Ferry Schedule 🚀

Welcome to **ADA**, a modern, cross-platform mobile application designed to simplify island exploration and ferry scheduling. Built with **React Native (Expo)** on the frontend and **Spring Boot (Java)** on the backend, ADA offers a seamless experience for travelers navigating the beautiful Princes' Islands.

## 🌟 Key Features

- **Island Discovery**: interactive destination guides for Kınalıada, Burgazada, Heybeliada, and Büyükada.
- **Real-Time Schedules**: dynamic ferry timetables with "Incoming" and "Outgoing" views.
- **Smart Navigation**: smooth page transitions and intuitive gestures powered by `react-native-reanimated`.
- **Localization**: Bilingual support (English/Turkish) for a wider audience.
- **Robust Backend**: scalable API service handling schedule data and user interactions.

## 🛠 Tech Stack

### Frontend (Mobile App)
- **Framework**: [React Native](https://reactnative.dev/) with [Expo SDK 52](https://expo.dev/)
- **Language**: TypeScript
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **State Management**: Redux Toolkit
- **Styling**: StyleSheet, Expo Linear Gradient
- **Animations**: React Native Reanimated v3

### Backend (API Service)
- **Framework**: Spring Boot 3.5.7
- **Language**: Java 21
- **Build Tool**: Gradle 8.x
- **Containerization**: Docker & Docker Compose

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- **Node.js** (v18 or later)
- **JDK 21** (for backend)
- **Docker** (optional, for containerized backend)
- **Expo Go** app on your mobile device (iOS/Android) or a simulator.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/ada.git
    cd ada
    ```

2.  **Backend Setup**
    Navigate to the backend directory and start the Spring Boot application:
    ```bash
    cd ada-plus-backend
    ./gradlew bootRun
    ```
    *The backend server will start on port 8080 (default).*

3.  **Frontend Setup**
    Open a new terminal window in the project root:
    ```bash
    # Install dependencies
    npm install

    # Start the Expo development server
    npx expo start
    ```

### Running the App
- Press `i` to run on iOS Simulator (macOS only).
- Press `a` to run on Android Emulator.
- Scan the QR code with the **Expo Go** app to run on your physical device.

## 📂 Project Structure

```
ADA/
├── app/                 # Expo Router pages and layouts
├── components/          # Reusable UI components (FerrySchedule, etc.)
├── constants/           # App-wide constants (Colors, Layout)
├── assets/              # Images and icons
├── ada-plus-backend/    # Spring Boot backend application
│   ├── src/main/java    # Java source code
│   └── build.gradle     # Backend build configuration
└── package.json         # Frontend dependencies
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
