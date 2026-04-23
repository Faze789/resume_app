# Resume App

A cross-platform resume builder and ATS (Applicant Tracking System) checker built with React Native and Expo. The app helps users create professional resumes, analyze them for ATS compatibility, browse job listings, generate PDFs, and share documents -- all powered by AI features and backed by Supabase.

## Features

- Build and edit professional resumes with guided input forms
- ATS compatibility checker to optimize resumes for applicant tracking systems
- Browse and search job listings
- Generate resumes as PDF documents
- Share resumes and files directly from the app
- AI-powered suggestions and content enhancement
- User authentication and cloud storage via Supabase
- Cross-platform support for iOS and Android

## Tech Stack

| Technology | Purpose |
|---|---|
| React Native | Cross-platform mobile framework |
| Expo SDK 54 | Development platform and build tooling |
| TypeScript | Type-safe development |
| Supabase | Authentication, database, and storage |
| AI Integration | Resume analysis and content suggestions |

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator, or Expo Go app on a physical device

### Installation

```bash
git clone https://github.com/Faze789/resume_app.git
cd resume_app
npm install
```

### Configuration

Create a `.env` file in the project root with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npx expo start
```

Scan the QR code with Expo Go or press `i` for iOS simulator / `a` for Android emulator.
