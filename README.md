# NITJ Library Seat Monitor

Live library seat availability for NITJ, with a foreground seat map, floor-specific push alerts, and an Android home-screen widget.

The app reads the existing public seat feed:

```
https://v1.nitj.ac.in/erp/library_seating/api.php?action=get-seats
```

No account, database, or reservations are involved. The relay only stores Expo push tokens and the last seat snapshot.

## What is included

- `mobile/` — Expo / React Native Android app
  - Polls every 5 seconds while in the foreground
  - Cached last snapshot with stale/offline states
  - Floor selector and seat grid (390 seats: Ground 42, Floor 1 114, Floor 2 144, Floor 3 90)
  - In-app banner when a seat frees while the app is open
  - Local notification test
  - Remote push registration for floor-specific alerts
  - 4×2 Android home-screen widget with manual refresh
- `server/` — tiny Node push relay
  - Polls the same seat feed every 5 seconds
  - Sends Expo push notifications when `occupied: true` becomes `false`
  - Filters alerts by each subscriber's selected floors
  - 30-second per-token cooldown with queued/grouped changes
  - JSON file persistence; no MongoDB
- `mobile/scripts/mock-seat-server.mjs` — local mock of the NITJ feed

## Requirements

- Node.js 22+
- Android device or emulator
- Expo account and EAS CLI for the development build
- Firebase project with FCM V1 credentials for remote push
- An always-on host for the relay (Render, Railway, Fly.io, a VPS, etc.)

> Expo Go cannot be used for the full feature set. The widget and remote push need native code, so use an EAS development build.

## Quick start with the mock feed

The real feed is often entirely free, which makes occupied → free transitions hard to test. The mock server creates 390 seats, starts at 45% occupancy, and flips a couple of seats every 5 seconds.

```bash
# Terminal 1
cd mobile
npm install
npm run mock
```

The mock listens on `http://localhost:4000` and serves the same payload shape at:

```
http://localhost:4000/erp/library_seating/api.php?action=get-seats
```

Useful mock endpoints:

```bash
curl http://localhost:4000/health
curl "http://localhost:4000/toggle?seat=G-1&occupied=true"
curl "http://localhost:4000/toggle?seat=G-1&occupied=false"
curl http://localhost:4000/reset
```

For an Android emulator, use `10.0.2.2` instead of `localhost`. For a physical device, use your computer's LAN IP.

Create `mobile/.env`:

```bash
cp mobile/.env.example mobile/.env
```

Then set:

```dotenv
EXPO_PUBLIC_SEAT_API_URL=http://10.0.2.2:4000/erp/library_seating/api.php?action=get-seats
EXPO_PUBLIC_PUSH_RELAY_URL=http://10.0.2.2:3000
```

Cleartext HTTP is enabled automatically when either the seat API or relay URL starts with `http://`. Switch both to `https://` for production builds.

## Run the relay locally

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

The relay listens on port `3000`.

- `GET /health`
- `POST /api/subscriptions` with `{ "token": "ExpoPushToken[...]", "floors": ["G", "2"] }`
- `DELETE /api/subscriptions` with `{ "token": "ExpoPushToken[...]" }`
- `POST /api/test-notification` with `{ "token": "ExpoPushToken[...]" }`

## Build the Android app

1. Create an Expo project and get a project ID:

   ```bash
   cd mobile
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   If EAS cannot write to `app.config.ts`, put the project ID in your environment before building:

   ```bash
   export EAS_PROJECT_ID=your-eas-project-id
   ```

2. Add Firebase/FCM V1 credentials:

   - Create/select a Firebase Android app with package `com.joel.libraryseats`.
   - Download `google-services.json` and place it at `mobile/google-services.json` (or point `GOOGLE_SERVICES_JSON` at it). `app.config.ts` detects it automatically.
   - In Firebase Console → Project settings → Service accounts, click **Generate new private key** and save the JSON securely. Do not commit this file.
   - Upload that service account JSON to EAS:

   ```bash
   npx eas-cli@latest credentials
   ```

   Choose Android → production → Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1) → Set up a Google Service Account Key → Upload a new service account key. You can also upload it under Project settings → Credentials on expo.dev.

3. Set the public relay URL and project ID for EAS builds. The recommended way is EAS environment variables:

   ```bash
   npx eas-cli@latest env:set --name EAS_PROJECT_ID \
     --value your-eas-project-id --environment development --visibility plaintext
   npx eas-cli@latest env:set --name EXPO_PUBLIC_PUSH_RELAY_URL \
     --value https://your-relay.example.com --environment development --visibility plaintext
   ```

   Alternatively, add a `development.env` block to `eas.json`:

   ```json
   {
     "build": {
       "development": {
         "env": {
           "EAS_PROJECT_ID": "your-eas-project-id",
           "EXPO_PUBLIC_PUSH_RELAY_URL": "https://your-relay.example.com"
         }
       }
     }
   }
   ```

4. Build and install the development APK:

   ```bash
   npx eas-cli@latest build --profile development --platform android
   ```

5. Start Metro for the installed development client:

   ```bash
   npx expo start --dev-client
   ```

`EXPO_PUBLIC_*` values are compiled into the JavaScript bundle. Rebuild the app after changing them.

## How alerts work

- The app polls every 5 seconds in the foreground. When a seat changes from occupied to free, it shows an in-app banner and refreshes the widget.
- The relay polls independently. It stores the previous snapshot, detects occupied → free changes, and groups seats by floor.
- Each notification contains `type`, `floor`, `seats`, and `count` data. Tapping it opens the app on that floor with the freed seats highlighted.
- The relay applies a 30-second cooldown per push token. Changes during the cooldown are merged and sent together.
- Expo tickets with `DeviceNotRegistered` remove the stale subscription automatically.
- The relay keeps its snapshot in `server/data/state.json`. If the relay restarts and the saved snapshot is older than `STATE_STALE_MS` (2 minutes), the first poll becomes a new baseline instead of sending a burst of alerts.

## Android widget

- Add the widget by long-pressing the home screen → Widgets → **Library Seats**.
- Android enforces a minimum 30-minute background update period.
- Tap **Refresh** on the widget to run a headless fetch immediately.
- Tap the widget body to open the app.
- The app also pushes widget updates after foreground polls when the totals change (throttled to once per minute).

## Configuration

### Mobile

| Variable | Default | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SEAT_API_URL` | NITJ seat API | Seat feed URL |
| `EXPO_PUBLIC_POLL_INTERVAL_MS` | `5000` | Foreground poll interval |
| `EXPO_PUBLIC_PUSH_RELAY_URL` | empty | Relay base URL; remote push is disabled if empty |
| `EAS_PROJECT_ID` | empty | EAS project ID used by `getExpoPushTokenAsync` |
| `GOOGLE_SERVICES_JSON` | `./google-services.json` if present | Firebase Android config |

### Relay

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `SEAT_API_URL` | NITJ seat API | Seat feed URL |
| `POLL_INTERVAL_MS` | `5000` | Relay poll interval |
| `REQUEST_TIMEOUT_MS` | `8000` | Seat API timeout |
| `NOTIFY_COOLDOWN_MS` | `30000` | Per-token cooldown |
| `STATE_STALE_MS` | `120000` | Ignore saved snapshots older than this |
| `STATE_SAVE_INTERVAL_MS` | `60000` | Minimum interval for snapshot writes |
| `DATA_DIR` | `./data` | Directory for JSON state |
| `EXPO_ACCESS_TOKEN` | empty | Optional Expo access token |

## Tests and checks

```bash
# From the repository root
npm run typecheck
npm run test

# Mobile-specific checks
cd mobile
npx expo-doctor
npx expo export --platform android
```

## Deploy the relay

Docker:

```bash
cp server/.env.example server/.env
docker compose up --build -d
```

The relay needs a persistent volume for `/data` and an HTTPS URL reachable by the phone. Free hosting tiers that sleep will miss alerts while asleep.

## Limitations

- Android only; no web support. The upstream API currently only allows CORS from `v1.nitj.ac.in`, and the app uses native networking.
- No authentication, reservations, or seat history.
- Push delivery depends on FCM/Expo availability and correct EAS credentials.
- The widget cannot poll every 5 seconds; Android's minimum periodic update is 30 minutes.
- Notifications are sent only for occupied → free transitions, not for seats that were already free.
