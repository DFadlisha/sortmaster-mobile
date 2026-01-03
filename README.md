# SortMaster Mobile Application

## 🚀 Project Overview
SortMaster Mobile is a quality control application designed for **NES SOLUTION AND NETWORK SDN BHD**. It allows operators to scan parts, log defects (NG), and generate shift reports on the fly.

## 📱 Deliverables
*   **Source Code**: Full React + Vite + Capacitor project.
*   **Android APK**: `SortMaster_Debug.apk` (Located in the root folder).
*   **Documentation**: See `USER_FLOW.md` for testing instructions.

## 🛠 Tech Stack
*   **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI.
*   **Backend**: Supabase (PostgreSQL, Realtime).
*   **Mobile**: Capacitor (Android).

## ⚡ How to Run
### 1. Web Development
```bash
npm install
npm run dev
```

### 2. Android Development
```bash
# Sync web assets to native
npm run build
npx cap sync

# Open Android Studio
npx cap open android
```

## 📋 Features Completed
✅ **Authentication**: Connected to Supabase Project.
✅ **Scanning**: Integrated Camera & Manual Entry.
✅ **Dashboard**: Real-time stats & Hourly Output.
✅ **Reporting**: Professional 1-Page PDF Export (Fixed & Optimized).
✅ **Offline Support**: Basic offline handling.

---
*Last Updated: 2026-01-03*
