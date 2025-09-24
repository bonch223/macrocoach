import React from 'react';
import { View, Text } from 'react-native';

interface ProgressBarProps {
  current: number;
  target: number;
  label: string;
  color?: string;
  unit?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  label,
  color = 'bg-blue-500',
  unit = 'g'
}) => {
  const percentage = Math.min((current / target) * 100, 100);
  const isOverTarget = current > target;

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-gray-800 font-semibold text-base">{label}</Text>
        <Text className={`text-sm font-medium ${isOverTarget ? 'text-red-500' : 'text-gray-600'}`}>
          {Math.round(current)}/{target}{unit}
        </Text>
      </View>
      <View className="h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
        <View 
          className={`h-full ${isOverTarget ? 'bg-gradient-to-r from-red-400 to-red-500' : color} rounded-full transition-all duration-500 ease-out shadow-sm`}
          style={{ width: `${percentage}%` }}
        />
      </View>
      <View className="flex-row justify-between items-center mt-2">
        <Text className="text-xs text-gray-500">
          {Math.round(percentage)}% of target
        </Text>
        {isOverTarget && (
          <Text className="text-xs text-red-500 font-medium">
            Over target by {Math.round(current - target)}{unit}
          </Text>
        )}
      </View>
    </View>
  );
};
