# MacroCoach - Nutrition Tracking App

A React Native app built with Expo and Firebase for nutrition coaches and their clients to track macros, log meals, and monitor progress.

## Features

### Coach Features
- Create and manage clients
- Set macro targets based on BMR/TDEE calculations
- Add foods with nutritional information
- View client progress and compliance

### Client Features
- View daily macro targets
- Log meals from coach-assigned food list
- Track daily progress with visual progress bars
- Weight check-ins with notes

## Tech Stack

- **React Native** with Expo
- **Firebase Authentication** (email/password)
- **Firestore** (real-time database)
- **NativeWind** (Tailwind CSS for React Native)
- **TypeScript**

## Setup Instructions

### 1. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password
3. Create a Firestore database
4. Copy your Firebase config and update `firebase.config.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 2. Firestore Rules

Set up these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Clients can be read by their coach or the client themselves
    match /clients/{clientId} {
      allow read: if request.auth != null && 
        (resource.data.linkedCoachId == request.auth.uid || 
         resource.data.email == request.auth.token.email);
      allow write: if request.auth != null && 
        resource.data.linkedCoachId == request.auth.uid;
    }
    
    // Foods are readable by all authenticated users
    match /foods/{foodId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Logs can be read/written by the client or their coach
    match /logs/{logId} {
      allow read, write: if request.auth != null && 
        (resource.data.clientId in get(/databases/$(database)/documents/clients/$(resource.data.clientId)).data.linkedCoachId == request.auth.uid ||
         request.auth.token.email == get(/databases/$(database)/documents/clients/$(resource.data.clientId)).data.email);
    }
  }
}
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the App

```bash
# Start the development server
npx expo start

# Run on specific platforms
npx expo start --android
npx expo start --ios
npx expo start --web
```

## Usage

### For Coaches

1. **Sign up** as a Coach
2. **Add clients** with their physical stats (weight, height, age, gender)
3. **Set activity level and goals** (maintenance, fat loss, muscle gain)
4. **Add foods** with nutritional information
5. **Assign foods** to clients (update their foodList array)
6. **Monitor client progress** through real-time data

### For Clients

1. **Sign up** as a Client (coach must create your profile first)
2. **View daily macro targets** calculated based on your profile
3. **Log meals** by selecting from your assigned food list
4. **Track progress** with visual progress bars
5. **Check in weight** with optional notes

## Macro Calculations

The app uses the **Mifflin-St Jeor Equation** for BMR calculation:

- **Men**: BMR = (10 × weight in kg) + (6.25 × height in cm) – (5 × age) + 5
- **Women**: BMR = (10 × weight in kg) + (6.25 × height in cm) – (5 × age) – 161

Activity multipliers:
- Sedentary: × 1.2
- Light activity: × 1.375
- Moderate: × 1.55
- Very active: × 1.725
- Extra active: × 1.9

Goal adjustments:
- Fat loss: TDEE - 500 calories
- Muscle gain: TDEE + 500 calories
- Maintenance: TDEE as is

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   └── ProgressBar.tsx
├── screens/            # Screen components
│   ├── AuthScreen.tsx
│   ├── coach/          # Coach-specific screens
│   └── client/         # Client-specific screens
├── services/           # Firebase services
│   ├── authService.ts
│   └── firestoreService.ts
├── types/              # TypeScript type definitions
│   └── index.ts
└── utils/              # Utility functions
    └── macroCalculations.ts
```

## Data Models

### User
- id, role (coach/client), email, name, createdAt

### Client
- id, linkedCoachId, name, email, weight, height, age, gender
- activityLevel, goal, calorieTarget, protein, fat, carbs
- foodList (array of food IDs), createdAt, updatedAt

### Food
- id, name, protein, fat, carbs, kcal, servingSize, createdAt

### Log
- id, clientId, date, foods[], totalProtein, totalFat, totalCarbs
- totalCalories, weightCheck, notes, createdAt

## Development Notes

- The app uses **real-time synchronization** between coach and client
- **Error handling** is implemented throughout the app
- **Form validation** ensures data integrity
- **Responsive design** optimized for mobile devices
- **TypeScript** provides type safety

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
