import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CoachDashboard } from './src/screens/coach/CoachDashboard';
import { AddClientScreen } from './src/screens/coach/AddClientScreen';
import { ManageFoodsScreen } from './src/screens/coach/ManageFoodsScreen';
import { ClientsScreen } from './src/screens/coach/ClientsScreen';
import { SettingsScreen } from './src/screens/coach/SettingsScreen';
import { ViewClientScreen } from './src/screens/coach/ViewClientScreen';
import { BottomNavigation } from './src/components/BottomNavigation';
import SplashScreen from './src/components/SplashScreen';
import { FirestoreService } from './src/services/firestoreService';
import { AuthService } from './src/services/authService';
import { Client } from './src/types';

type Screen = 
  | 'coach-dashboard'
  | 'clients'
  | 'add-client'
  | 'manage-foods'
  | 'settings'
  | 'view-client';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('coach-dashboard');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simulate loading time for splash screen
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Initialize authentication with a default coach user
        try {
          // Try to sign in with a default coach account
          await AuthService.signIn('coach@macrocoach.com', 'coach123');
          console.log('Signed in as default coach');
        } catch (authError) {
          // If sign in fails, try to register the default coach
          try {
            await AuthService.register('coach@macrocoach.com', 'coach123', 'Default Coach', 'coach');
            console.log('Registered default coach');
          } catch (registerError) {
            console.warn('Could not authenticate:', registerError);
            // Continue without authentication for now
          }
        }
        
        setIsAppReady(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsAppReady(true); // Continue even if there's an error
      }
    };

    initializeApp();
  }, []);

  const handleSplashComplete = () => {
    setIsLoading(false);
  };

  const handleAddClient = () => {
    setCurrentScreen('add-client');
  };

  const handleManageFoods = () => {
    setCurrentScreen('manage-foods');
  };

  const handleClientAdded = () => {
    setCurrentScreen('clients');
  };

  const handleViewClient = (clientData: Client) => {
    setSelectedClient(clientData);
    setCurrentScreen('view-client');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('coach-dashboard');
  };

  const handleBackToClients = () => {
    setCurrentScreen('clients');
  };

  const handleBackToSettings = () => {
    setCurrentScreen('settings');
  };

  const handleBackFromViewClient = () => {
    setSelectedClient(null);
    setCurrentScreen('clients');
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const handleViewAllClients = () => {
    setCurrentScreen('clients');
  };

  // Show splash screen while loading
  if (isLoading || !isAppReady) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="auto" />
          
          {/* Main Content */}
          <View style={styles.mainContent}>
          {currentScreen === 'coach-dashboard' && (
            <CoachDashboard
              onAddClient={handleAddClient}
              onManageFoods={handleManageFoods}
              onViewClient={handleViewClient}
              onViewAllClients={handleViewAllClients}
            />
          )}

          {currentScreen === 'clients' && (
            <ClientsScreen
              onBack={handleBackToDashboard}
              onAddClient={handleAddClient}
              onViewClient={handleViewClient}
            />
          )}

          {currentScreen === 'add-client' && (
            <AddClientScreen
              coachId="coach-1" // Using hardcoded coach ID since no authentication
              onBack={handleBackToClients}
              onClientAdded={handleClientAdded}
            />
          )}

          {currentScreen === 'manage-foods' && (
            <ManageFoodsScreen onBack={handleBackToDashboard} />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen onBack={handleBackToDashboard} />
          )}

          {currentScreen === 'view-client' && selectedClient && (
            <ViewClientScreen
              clientData={selectedClient}
              onBack={handleBackFromViewClient}
            />
          )}
        </View>

        {/* Bottom Navigation */}
        <BottomNavigation
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          userRole="coach"
        />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  mainContent: {
    flex: 1,
  },
});
