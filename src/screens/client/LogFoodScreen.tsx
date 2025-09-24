import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { SuccessModal } from '../../components/SuccessModal';
import { FirestoreService } from '../../services/firestoreService';
import { Client, Food, Log, LoggedFood } from '../../types';

interface LogFoodScreenProps {
  client: Client;
  onBack: () => void;
  onLogSaved: () => void;
}

export const LogFoodScreen: React.FC<LogFoodScreenProps> = ({
  client,
  onBack,
  onLogSaved
}) => {
  const [availableFoods, setAvailableFoods] = useState<Food[]>([]);
  const [todayLog, setTodayLog] = useState<Log | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('');
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    try {
      // Load available foods
      if (client.foodList.length > 0) {
        const foods = await Promise.all(
          client.foodList.map(foodId => FirestoreService.getFood(foodId))
        );
        setAvailableFoods(foods.filter(Boolean) as Food[]);
      }

      // Load today's log
      const log = await FirestoreService.getLogByClientAndDate(client.id, today);
      setTodayLog(log);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [client.id]);

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setQuantity('');
    setShowQuantityModal(true);
  };

  const handleLogFood = async () => {
    if (!selectedFood || !quantity.trim()) return;

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const loggedFood: LoggedFood = {
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        quantity: quantityNum,
        protein: selectedFood.protein * quantityNum,
        fat: selectedFood.fat * quantityNum,
        carbs: selectedFood.carbs * quantityNum,
        calories: selectedFood.kcal * quantityNum
      };

      if (todayLog) {
        // Update existing log
        const updatedFoods = [...todayLog.foods, loggedFood];
        const totalProtein = updatedFoods.reduce((sum, food) => sum + food.protein, 0);
        const totalFat = updatedFoods.reduce((sum, food) => sum + food.fat, 0);
        const totalCarbs = updatedFoods.reduce((sum, food) => sum + food.carbs, 0);
        const totalCalories = updatedFoods.reduce((sum, food) => sum + food.calories, 0);

        await FirestoreService.updateLog(todayLog.id, {
          foods: updatedFoods,
          totalProtein,
          totalFat,
          totalCarbs,
          totalCalories
        });
      } else {
        // Create new log
        await FirestoreService.createLog({
          clientId: client.id,
          date: today,
          foods: [loggedFood],
          totalProtein: loggedFood.protein,
          totalFat: loggedFood.fat,
          totalCarbs: loggedFood.carbs,
          totalCalories: loggedFood.calories
        });
      }

      setShowQuantityModal(false);
      setSelectedFood(null);
      setQuantity('');
      loadData();
      onLogSaved();
      setSuccessMessage('Food logged successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to log food');
    }
  };

  const handleRemoveFood = async (foodIndex: number) => {
    if (!todayLog) return;

    try {
      const updatedFoods = todayLog.foods.filter((_, index) => index !== foodIndex);
      const totalProtein = updatedFoods.reduce((sum, food) => sum + food.protein, 0);
      const totalFat = updatedFoods.reduce((sum, food) => sum + food.fat, 0);
      const totalCarbs = updatedFoods.reduce((sum, food) => sum + food.carbs, 0);
      const totalCalories = updatedFoods.reduce((sum, food) => sum + food.calories, 0);

      await FirestoreService.updateLog(todayLog.id, {
        foods: updatedFoods,
        totalProtein,
        totalFat,
        totalCarbs,
        totalCalories
      });

      loadData();
      setSuccessMessage('Food removed successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove food');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={onBack} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Log Food</Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1 px-6">
        <View className="py-6">
          {/* Today's Logged Foods */}
          {todayLog && todayLog.foods.length > 0 && (
            <View className="bg-white rounded-lg p-6 shadow-sm mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Today's Meals</Text>
              <View className="space-y-3">
                {todayLog.foods.map((food, index) => (
                  <View key={index} className="flex-row justify-between items-center py-3 border-b border-gray-100">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium">{food.foodName}</Text>
                      <Text className="text-gray-600 text-sm">
                        {food.quantity} serving{food.quantity !== 1 ? 's' : ''} • {food.calories} kcal
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        P: {food.protein.toFixed(1)}g • F: {food.fat.toFixed(1)}g • C: {food.carbs.toFixed(1)}g
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveFood(index)}
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              
              <View className="mt-4 pt-4 border-t border-gray-200">
                <View className="flex-row justify-between">
                  <Text className="font-semibold text-gray-900">Total</Text>
                  <Text className="font-semibold text-gray-900">{todayLog.totalCalories} kcal</Text>
                </View>
                <Text className="text-gray-600 text-sm">
                  P: {todayLog.totalProtein.toFixed(1)}g • F: {todayLog.totalFat.toFixed(1)}g • C: {todayLog.totalCarbs.toFixed(1)}g
                </Text>
              </View>
            </View>
          )}

          {/* Available Foods */}
          <View className="bg-white rounded-lg p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Available Foods</Text>
            
            {availableFoods.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-2 text-center">
                  No foods available.{'\n'}Your coach hasn't added any foods yet.
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {availableFoods.map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    onPress={() => handleFoodSelect(food)}
                    className="flex-row justify-between items-center py-3 border-b border-gray-100"
                  >
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium">{food.name}</Text>
                      <Text className="text-gray-600 text-sm">{food.servingSize}</Text>
                      <Text className="text-gray-500 text-xs">
                        P: {food.protein}g • F: {food.fat}g • C: {food.carbs}g • {food.kcal} kcal
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Quantity Modal */}
      <Modal
        visible={showQuantityModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Add {selectedFood?.name}
            </Text>
            
            <Text className="text-gray-600 mb-4">
              Serving size: {selectedFood?.servingSize}
            </Text>

            <Input
              label="Quantity (servings)"
              placeholder="1"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />

            <View className="flex-row space-x-4 mt-4">
              <Button
                title="Cancel"
                onPress={() => setShowQuantityModal(false)}
                variant="outline"
                className="flex-1"
              />
              <Button
                title="Add Food"
                onPress={handleLogFood}
                className="flex-1"
              />
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Success"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </SafeAreaView>
  );
};
