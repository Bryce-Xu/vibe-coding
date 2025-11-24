# NSW Park & Ride Checker

A responsive web application that provides real-time parking availability for Transport NSW Park & Ride locations. Designed for both mobile and desktop use, it utilizes Open Data to help commuters find parking spots efficiently.

## Features

- **Real-Time Availability**: Visualizes live parking spot counts (Total vs. Free).
- **Interactive Map**: 
  - Color-coded markers indicating availability (Green: Good, Orange: Filling Up, Red: Full).
  - User geolocation tracking.
  - "Nearest Locations" overlay showing the closest carparks automatically.
- **Search & Discovery**:
  - Multi-keyword search for facility names, zones (TSN), or IDs.
  - Dropdown results for quick selection.
- **List View & Sorting**:
  - Toggle between Map and List views.
  - Sort carparks by Distance, Name, or Availability.
- **Navigation**:
  - Detailed slide-up cards for selected locations.
  - Direct link to Google Maps for navigation.
- **Resilient Data Handling**:
  - Automatic fallback to Seven Hills if geolocation fails.
  - Graceful fallback to Mock Data if the API limits are reached or CORS errors occur.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS (via CDN)
- **Maps**: Leaflet & React-Leaflet
- **Icons**: Lucide React
- **Data**: Transport NSW Open Data API

## Project Structure

```text
/
├── index.html              # Entry point with Import Maps and Tailwind CDN
├── index.tsx               # React application entry
├── App.tsx                 # Main Application Logic (State, Layout, Search, Geolocation)
├── types.ts                # TypeScript interfaces (Carpark, Occupancy, etc.)
├── constants.ts            # Configuration, API Keys, and Mock Data
├── services/
│   └── tfnswService.ts     # API fetching logic and data normalization
└── components/
    ├── ParkingMap.tsx      # Leaflet Map component with custom markers
    └── DetailCard.tsx      # Slide-up UI for parking details
```

## Setup & Running

This project is designed to run in a browser-based environment using ES Modules or a standard React build toolchain (Vite/CRA).

### Prerequisites
- Node.js (if running locally via a bundler)
- A Transport NSW Open Data API Key (Pre-configured in `constants.ts`)

### Installation (Standard React Environment)

1.  **Clone the repository**.
2.  **Install dependencies**:
    ```bash
    npm install react react-dom leaflet react-leaflet lucide-react
    ```
3.  **Run the development server**:
    ```bash
    npm run dev
    ```

### Configuration

The API Key is located in `constants.ts`.
```typescript
export const TFNSW_API_KEY = "YOUR_API_KEY_HERE";
```

> **Note on CORS**: The Transport NSW API may block direct browser requests due to CORS policies. The application includes a `MOCK_CARPARKS` fallback in `constants.ts` and error handling in `services/tfnswService.ts` to ensure the UI remains functional for demonstration purposes even if the direct API call fails.

## Usage Guide

1.  **Grant Location Access**: Allow the browser to access your location to see carparks sorted by distance.
2.  **Search**: Use the top search bar to type a suburb or station name.
3.  **View Details**: Tap a map marker or a list item to see the number of free spots and get navigation directions.
4.  **Sort**: Use the sort dropdown to prioritize carparks with the most free spots or those closest to you.
