import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { SuccessModal } from '../../components/SuccessModal';
import { FirestoreService } from '../../services/firestoreService';
import { Client, Log } from '../../types';

interface WeightCheckScreenProps {
  client: Client;
  onBack: () => void;
  onWeightSaved: () => void;
}

export const WeightCheckScreen: React.FC<WeightCheckScreenProps> = ({
  client,
  onBack,
  onWeightSaved
}) => {
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleSaveWeight = async () => {
    if (!weight.trim()) {
      Alert.alert('Error', 'Please enter your weight');
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    setLoading(true);
    try {
      // Check if today's log exists
      let todayLog = await FirestoreService.getLogByClientAndDate(client.id, today);
      
      if (todayLog) {
        // Update existing log
        await FirestoreService.updateLog(todayLog.id, {
          weightCheck: weightNum,
          notes: notes.trim() || undefined
        });
      } else {
        // Create new log with weight check
        await FirestoreService.createLog({
          clientId: client.id,
          date: today,
          foods: [],
          totalProtein: 0,
          totalFat: 0,
          totalCarbs: 0,
          totalCalories: 0,
          weightCheck: weightNum,
          notes: notes.trim() || undefined
        });
      }

      // Update client's current weight
      await FirestoreService.updateClient(client.id, {
        weight: weightNum
      });

      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to save weight');
    } finally {
      setLoading(false);
    }
  };

  const getWeightChange = () => {
    const currentWeight = parseFloat(weight);
    const previousWeight = client.weight;
    
    if (isNaN(currentWeight) || currentWeight === previousWeight) return null;
    
    const change = currentWeight - previousWeight;
    const changePercent = ((change / previousWeight) * 100).toFixed(1);
    
    return {
      change,
      changePercent,
      isPositive: change > 0
    };
  };

  const weightChange = getWeightChange();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={onBack} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Weight Check-in</Text>
        <View className="w-8" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6">
          <View className="py-6">
            <View className="bg-white rounded-lg p-6 shadow-sm mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Current Weight</Text>
              
              <Input
                label="Weight (kg)"
                placeholder={client.weight.toString()}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />

              {weightChange && (
                <View className={`mt-4 p-4 rounded-lg ${
                  weightChange.isPositive 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <View className="flex-row items-center">
                    <Ionicons 
                      name={weightChange.isPositive ? "trending-up" : "trending-down"} 
                      size={24} 
                      color={weightChange.isPositive ? "#DC2626" : "#16A34A"} 
                    />
                    <View className="ml-3">
                      <Text className={`font-semibold ${
                        weightChange.isPositive ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {weightChange.isPositive ? '+' : ''}{weightChange.change.toFixed(1)} kg
                      </Text>
                      <Text className={`text-sm ${
                        weightChange.isPositive ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {weightChange.isPositive ? '+' : ''}{weightChange.changePercent}% from last check
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View className="bg-white rounded-lg p-6 shadow-sm mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Notes (Optional)</Text>
              
              <Input
                label="Add notes about your progress"
                placeholder="How are you feeling? Any challenges or wins?"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
            </View>

            <View className="bg-blue-50 rounded-lg p-6">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={24} color="#3B82F6" />
                <View className="ml-3 flex-1">
                  <Text className="text-blue-900 font-semibold mb-2">Weight Tracking Tips</Text>
                  <Text className="text-blue-800 text-sm">
                    • Weigh yourself at the same time each day for consistency{'\n'}
                    • Use the same scale in the same location{'\n'}
                    • Track your weight weekly rather than daily for better trends{'\n'}
                    • Remember that weight can fluctuate due to many factors
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row space-x-4 mt-6">
              <Button
                title="Cancel"
                onPress={onBack}
                variant="outline"
                className="flex-1"
              />
              <Button
                title="Save Weight"
                onPress={handleSaveWeight}
                loading={loading}
                className="flex-1"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Success"
        message="Weight recorded successfully!"
        onClose={() => {
          setShowSuccessModal(false);
          onWeightSaved();
        }}
      />
    </SafeAreaView>
  );
};
