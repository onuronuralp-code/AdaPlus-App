# AdaPlus

**AdaPlus** is a mobile application for exploring Istanbul's Princes' Islands (Kınalıada, Burgazada, Heybeliada, and Büyükada), built with **React Native (Expo)** and backed by a **Spring Boot (Java 21)** REST API in [`backend/`](./backend).

## Key Features

- **Ferry & Island Bus Schedules**: Up-to-date Şehir Hatları and Mavi Marmara timetables, intermediate-stop calculations, and departure reminders.
- **Island Discovery & Guide**: Curated guides, places, and interactive map navigation for Kınalıada, Burgazada, Heybeliada, and Büyükada.
- **Community & Services**: Island forum, events, listings, and local delivery providers.
- **Bilingual Support**: Full Turkish (`tr`) and English (`en`) localization.

## Tech Stack

### Mobile App (Root)
- **Framework**: React Native `0.81` with Expo SDK `54`
- **Language**: TypeScript `5.9`
- **Navigation**: Expo Router `v6` (file-based routing)
- **State Management**: Redux Toolkit
- **Animations & UI**: React Native Reanimated `v4`, Expo Linear Gradient, `react-native-maps`
- **Localization**: `i18next` & `react-i18next`

### Backend (`backend/`)
- **Framework**: Spring Boot `3.5.7`
- **Language**: Java `21`
- **Build Tool**: Gradle Wrapper (`./gradlew`)
- **Database**: Embedded H2 (`local` profile) / PostgreSQL 15 + Flyway (`dev` / `prod` profiles)
- **Caching & Rate Limiting**: Caffeine & Bucket4j
- **Containerization**: Docker & Docker Compose

---

## Prerequisites

- **Node.js** `>= 18` (v20 LTS recommended) and **npm**
- **JDK 21** (required only if running the backend locally)
- **macOS with Xcode & CocoaPods** (for iOS Simulator or native iOS builds), or **Expo Go** on a physical device
- **Docker** (optional, for running the backend with PostgreSQL)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/onuronuralp-code/AdaPlus-iOS.git
cd AdaPlus-iOS
```

### 2. Configure Environment Variables

Create a `.env` file in the project root from `.env.example`:

```bash
cp .env.example .env
```

Available environment variables:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | No | `https://api.adaplus.app` | Backend API base URL. Leave unset to use the live API, or set to `http://localhost:8080` for local backend development. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes (for Maps/Places) | — | Google Maps API key for Places and Directions. |
| `EXPO_PUBLIC_APP_STORE_URL` | No | Built-in App Store URL | Optional override for the iOS App Store link. |

> **Note:** When `EXPO_PUBLIC_API_URL` uses `localhost` on a simulator or physical device, [`services/config.ts`](./services/config.ts) automatically rewrites `localhost` to Metro's LAN IP so the device can reach your machine.

### 3. Install & Run the Mobile App

```bash
npm install
npx expo start
```

From the Expo CLI prompt:
- Press **`i`** to launch in the **iOS Simulator** (macOS + Xcode required).
- Press **`a`** to launch in an **Android Emulator**.
- Scan the QR code with **Expo Go** on a physical device.

To build and run the native iOS project directly:

```bash
npm run ios
```

---

## Local Backend Setup (Optional)

You only need to run the backend locally if you are developing or testing backend changes (otherwise the mobile app connects to `https://api.adaplus.app` by default).

### Option A: Run with Gradle + Embedded H2 (Fastest)

No external database or Docker is required. `./gradlew bootRun` activates the `local` profile by default and stores data in `backend/data/adaplus`.

```bash
cd backend
./gradlew bootRun --no-daemon
```

If you do not have local AWS S3 credentials configured, disable S3 uploads so media is stored locally under `backend/uploads`:

```bash
APP_S3_ENABLED=false ./gradlew bootRun --no-daemon
```

Once running:
- **API Base URL**: `http://localhost:8080`
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **H2 Console**: `http://localhost:8080/h2-console`

Then set `EXPO_PUBLIC_API_URL=http://localhost:8080` in your root `.env` and restart Expo (`npx expo start -c`).

### Option B: Run with Docker Compose (PostgreSQL 15)

Starts PostgreSQL 15 on port `5432` and the Spring Boot app on port `8080` using the `dev` profile (with Flyway migrations):

```bash
cd backend
docker compose up --build
```

> **Note:** The `dev` profile enables Firebase push notifications by default. If you do not have a local Firebase Admin SDK credentials JSON file, set `APP_FIREBASE_ENABLED=false` in the `ada-plus-backend` service environment in [`backend/compose.yml`](./backend/compose.yml).

### Backend Build & Tests

```bash
cd backend

# Run all backend tests (uses the test profile)
./gradlew test --no-daemon

# Build executable JAR
./gradlew clean bootJar --no-daemon
```

---

## Useful Scripts

Run from the repository root:

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run ios` | Build and run the native iOS app |
| `npm run android` | Build and run the native Android app |
| `npm run web` | Start the web build via Expo |
| `npm run lint` | Run ESLint (`expo lint`) |
| `npm run build:ios` | Trigger an EAS iOS build (`eas build --platform ios`) |
| `npm run e2e:maestro:smoke` | Run Maestro E2E smoke tests |

---

## Project Structure

```text
AdaPlus-iOS/
├── app/                # Expo Router screens and layouts
├── assets/             # App icons, splash screen, images, and sounds
├── backend/            # Spring Boot 3.5 (Java 21) REST API
│   ├── src/main/java/      # Java controllers, services, configs, entities
│   ├── src/main/resources/ # application*.yml, Flyway migrations, ferry & bus schedules
│   ├── knowledge-base/     # Island guide knowledge base markdown files
│   ├── build.gradle        # Gradle build configuration
│   └── compose.yml         # Docker Compose (PostgreSQL + backend)
├── components/         # Reusable UI components (FerrySchedule, etc.)
├── constants/          # Island data, delivery providers, and theme tokens
├── context/            # React contexts (Auth, Theme, etc.)
├── hooks/              # Custom React hooks
├── locales/            # i18n translations (en.json, tr.json)
├── services/           # API clients, notifications, location, weather
├── store/              # Redux store and slices
├── utils/              # Helper utilities
├── .env.example        # Environment variable template
├── app.json            # Expo app configuration
├── eas.json            # EAS Build profiles
└── package.json        # Frontend dependencies and scripts
```

---

## Troubleshooting

- **Physical device cannot connect to local backend**: Make sure your phone and computer are on the same Wi-Fi network, port `8080` is open in your firewall, and `EXPO_PUBLIC_API_URL` is set to `http://localhost:8080` (auto-rewritten to Metro's LAN IP) or explicitly `http://<YOUR_LAN_IP>:8080`.
- **Gradle fails with Java version error**: The backend requires **JDK 21**. Verify with `java -version` and ensure `JAVA_HOME` points to a JDK 21 installation.
- **Changes to `.env` are not picked up**: Restart Metro with a clean cache using `npx expo start -c`.
- **Ferry or bus schedules**: Schedule YAML files live under `backend/src/main/resources/schedules/ferries/` and `backend/src/main/resources/schedules/buses/`. Restart the backend after editing them.
