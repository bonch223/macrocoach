import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { FirestoreService } from '../../services/firestoreService';
import { Client, Log, Food } from '../../types';

const { width } = Dimensions.get('window');

interface ClientDashboardProps {
  onLogFood: () => void;
  onWeightCheck: () => void;
  onSignOut: () => void;
  user: any;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  onLogFood,
  onWeightCheck,
  onSignOut,
  user
}) => {
  const [client, setClient] = useState<Client | null>(null);
  const [todayLog, setTodayLog] = useState<Log | null>(null);
  const [availableFoods, setAvailableFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadClientData = async () => {
    try {
      // Find client by user email
      const clientData = await FirestoreService.getClientByEmail(user.email);
      
      if (!clientData) {
        Alert.alert('Error', 'Client profile not found. Please contact your coach.');
        return;
      }

      setClient(clientData);

      // Load today's log
      const log = await FirestoreService.getLogByClientAndDate(clientData.id, today);
      setTodayLog(log);

      // Load available foods
      if (clientData.foodList.length > 0) {
        const foods = await Promise.all(
          clientData.foodList.map(foodId => FirestoreService.getFood(foodId))
        );
        setAvailableFoods(foods.filter(Boolean) as Food[]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClientData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadClientData();
    
    // Subscribe to real-time updates
    if (client) {
      const unsubscribe = FirestoreService.subscribeToClientLogs(client.id, (logs) => {
        const todayLog = logs.find(log => log.date === today);
        setTodayLog(todayLog || null);
      });
      return unsubscribe;
    }
  }, [user.email, client?.id]);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: onSignOut }
      ]
    );
  };

  const getCompliancePercentage = () => {
    if (!client || !todayLog) return 0;
    
    const proteinCompliance = Math.min((todayLog.totalProtein / client.protein) * 100, 100);
    const fatCompliance = Math.min((todayLog.totalFat / client.fat) * 100, 100);
    const carbCompliance = Math.min((todayLog.totalCarbs / client.carbs) * 100, 100);
    const calorieCompliance = Math.min((todayLog.totalCalories / client.calorieTarget) * 100, 100);
    
    return Math.round((proteinCompliance + fatCompliance + carbCompliance + calorieCompliance) / 4);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center px-6">
        <Text className="text-gray-500 text-center">
          Client profile not found. Please contact your coach.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Modern Header with Gradient */}
      <View className="pt-12 pb-6 px-6 bg-gradient-to-r from-blue-600 to-indigo-600">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Dashboard</Text>
            <Text className="text-blue-100 mt-1">Welcome back, {client.name}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleSignOut} 
            className="p-3 bg-white/20 rounded-full"
          >
            <Ionicons name="log-out-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-6 -mt-4">
          {/* Today's Overview - Modern Card */}
          <View className="bg-white rounded-2xl p-6 shadow-lg mb-6 border border-gray-100">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-900">Today's Progress</Text>
              <Text className="text-sm text-gray-600">{today}</Text>
            </View>

            {todayLog ? (
              <View>
                <View className="mb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-700 font-medium">Overall Compliance</Text>
                    <Text className="text-lg font-bold text-blue-600">
                      {getCompliancePercentage()}%
                    </Text>
                  </View>
                  <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <View 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${getCompliancePercentage()}%` }}
                    />
                  </View>
                </View>

                <ProgressBar
                  current={todayLog.totalProtein}
                  target={client.protein}
                  label="Protein"
                  color="bg-red-500"
                />
                <ProgressBar
                  current={todayLog.totalFat}
                  target={client.fat}
                  label="Fat"
                  color="bg-yellow-500"
                />
                <ProgressBar
                  current={todayLog.totalCarbs}
                  target={client.carbs}
                  label="Carbs"
                  color="bg-green-500"
                />
                <ProgressBar
                  current={todayLog.totalCalories}
                  target={client.calorieTarget}
                  label="Calories"
                  color="bg-blue-500"
                />
              </View>
            ) : (
              <View className="items-center py-4">
                <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-2 text-center">
                  No meals logged today.{'\n'}Start logging your meals!
                </Text>
              </View>
            )}
          </View>

          {/* Quick Actions - Modern Grid */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</Text>
            <View className="flex-row space-x-4">
              <TouchableOpacity
                onPress={onLogFood}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 items-center shadow-lg"
                activeOpacity={0.8}
              >
                <Ionicons name="restaurant" size={32} color="white" />
                <Text className="text-white font-semibold mt-2 text-center">Log Meal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onWeightCheck}
                className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-6 items-center shadow-lg"
                activeOpacity={0.8}
              >
                <Ionicons name="fitness" size={32} color="white" />
                <Text className="text-white font-semibold mt-2 text-center">Weight Check</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Target Macros - Modern Grid */}
          <View className="bg-white rounded-2xl p-6 shadow-lg mb-6 border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-6">Daily Targets</Text>
            <View className="flex-row flex-wrap -mx-2">
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-red-50 rounded-xl p-4 items-center">
                  <Ionicons name="fitness" size={24} color="#EF4444" />
                  <Text className="text-red-600 text-sm font-medium mt-2">Protein</Text>
                  <Text className="text-xl font-bold text-gray-900">{client.protein}g</Text>
                </View>
              </View>
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-yellow-50 rounded-xl p-4 items-center">
                  <Ionicons name="flash" size={24} color="#F59E0B" />
                  <Text className="text-yellow-600 text-sm font-medium mt-2">Fat</Text>
                  <Text className="text-xl font-bold text-gray-900">{client.fat}g</Text>
                </View>
              </View>
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-green-50 rounded-xl p-4 items-center">
                  <Ionicons name="leaf" size={24} color="#10B981" />
                  <Text className="text-green-600 text-sm font-medium mt-2">Carbs</Text>
                  <Text className="text-xl font-bold text-gray-900">{client.carbs}g</Text>
                </View>
              </View>
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-blue-50 rounded-xl p-4 items-center">
                  <Ionicons name="flame" size={24} color="#3B82F6" />
                  <Text className="text-blue-600 text-sm font-medium mt-2">Calories</Text>
                  <Text className="text-xl font-bold text-gray-900">{client.calorieTarget}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Available Foods */}
          {availableFoods.length > 0 && (
            <View className="bg-white rounded-lg p-6 shadow-sm">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Available Foods</Text>
              <View className="space-y-2">
                {availableFoods.slice(0, 5).map((food) => (
                  <View key={food.id} className="flex-row justify-between items-center py-2 border-b border-gray-100">
                    <Text className="text-gray-900 flex-1">{food.name}</Text>
                    <Text className="text-gray-600 text-sm">{food.kcal} kcal</Text>
                  </View>
                ))}
                {availableFoods.length > 5 && (
                  <Text className="text-gray-500 text-sm text-center pt-2">
                    +{availableFoods.length - 5} more foods
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
