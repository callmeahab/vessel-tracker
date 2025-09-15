# Vessel Tracker

A Flutter application with Go backend for tracking vessels in La Maddalena National Park using the Datalastic Vessel Finder API and Mapbox for visualization.

## Features

- Real-time vessel tracking within national park boundaries
- Geofencing to detect vessels inside protected areas
- Interactive map visualization with Mapbox
- Vessel search and filtering capabilities
- REST API backend in Go

## Prerequisites

- Flutter SDK (3.0.0 or higher)
- Go 1.21 or higher
- Mapbox account and access token
- Datalastic API key

## Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your Datalastic API key to `.env`:
```
DATALASTIC_API_KEY=your_actual_api_key_here
PORT=8080
```

4. Install Go dependencies:
```bash
go mod download
```

5. Run the HTTP backend server:
```bash
go run main.go
```

The server will start on http://localhost:8080

### Flutter App Setup

1. In the root directory, update the `.env` file with your credentials:
```
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
API_BASE_URL=http://localhost:8080
```

For Android device/emulator, use:
```
API_BASE_URL=http://10.0.2.2:8080  # For emulator
API_BASE_URL=http://YOUR_COMPUTER_IP:8080  # For physical device
```

2. Install Flutter dependencies:
```bash
flutter pub get
```

4. Configure Mapbox for your platform:

**Android (android/app/src/main/AndroidManifest.xml):**
Add inside the `<application>` tag:
```xml
<meta-data
    android:name="com.mapbox.token"
    android:value="YOUR_MAPBOX_TOKEN" />
```

**iOS (ios/Runner/Info.plist):**
Add:
```xml
<key>MBXAccessToken</key>
<string>YOUR_MAPBOX_TOKEN</string>
```

4. Run the Flutter app:
```bash
flutter run
```

## REST API

### Backend API Endpoints

- `GET /api/health` - Health check
- `GET /api/vessels` - Search vessels with filters
- `GET /api/vessels/in-park` - Get vessels within park boundaries
- `GET /api/park-boundaries` - Get GeoJSON of park boundaries

### Query Parameters for /api/vessels

- `name` - Vessel name
- `type` - Vessel type (Cargo, Tanker, Passenger, Fishing)
- `country_iso` - Country ISO code
- `max_results` - Maximum number of results (default: 500)

## Project Structure

```
vessel_tracker/
├── backend/
│   ├── main.go
│   ├── go.mod
│   ├── models/
│   │   └── vessel.go
│   ├── services/
│   │   ├── vessel_service.go
│   │   └── geo_service.go
│   └── handlers/
│       └── vessel_handler.go
├── lib/
│   ├── main.dart
│   ├── models/
│   │   └── vessel.dart
│   ├── services/
│   │   └── api_service.dart
│   ├── providers/
│   │   └── vessel_provider.dart
│   └── screens/
│       └── map_screen.dart
├── data/
│   └── national-park.json
├── pubspec.yaml
└── .env
```

## Features Implementation

### Geofencing
The backend implements point-in-polygon algorithm to determine if vessels are within park boundaries using the GeoJSON data.

### Real-time Updates
The app can fetch vessel positions and check against park boundaries. In production, you would integrate with real-time AIS data feeds.

### Map Visualization
- Green overlay shows park boundaries
- Red markers indicate vessels inside the park
- Blue markers indicate vessels outside but near the park

## Development Notes

- The current implementation simulates vessel positions for demonstration
- In production, integrate with real-time AIS position data from Datalastic
- Consider implementing WebSocket connections for real-time updates
- Add authentication and rate limiting for production deployment

## License

This project is for educational and conservation purposes.