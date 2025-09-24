import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatePicker } from './DatePicker';

interface DateInputProps {
  label: string;
  value: Date;
  onDateChange: (date: Date) => void;
  placeholder?: string;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

// Helper function for platform-specific shadows
const createShadowStyle = (shadowConfig: {
  color: string;
  offset: { width: number; height: number };
  opacity: number;
  radius: number;
  elevation: number;
}) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${shadowConfig.offset.width}px ${shadowConfig.offset.height}px ${shadowConfig.radius}px rgba(0, 0, 0, ${shadowConfig.opacity})`,
    };
  } else {
    return {
      shadowColor: shadowConfig.color,
      shadowOffset: shadowConfig.offset,
      shadowOpacity: shadowConfig.opacity,
      shadowRadius: shadowConfig.radius,
      elevation: shadowConfig.elevation,
    };
  }
};

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onDateChange,
  placeholder = 'Select date',
  error,
  minimumDate,
  maximumDate,
  disabled = false,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleDateSelect = (date: Date) => {
    onDateChange(date);
    setShowDatePicker(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputError,
          disabled && styles.inputDisabled,
        ]}
        onPress={() => !disabled && setShowDatePicker(true)}
        disabled={disabled}
      >
        <View style={styles.inputContent}>
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color={disabled ? '#9CA3AF' : '#6B7280'} 
            style={styles.icon}
          />
          <Text style={[
            styles.inputText,
            !value && styles.placeholderText,
            disabled && styles.disabledText,
          ]}>
            {value ? formatDate(value) : placeholder}
          </Text>
        </View>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={disabled ? '#9CA3AF' : '#6B7280'} 
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <DatePicker
        visible={showDatePicker}
        selectedDate={value}
        onDateChange={handleDateSelect}
        onClose={() => setShowDatePicker(false)}
        title={`Select ${label}`}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 1 },
      opacity: 0.05,
      radius: 2,
      elevation: 1,
    }),
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  inputText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});


