import React from 'react';
import { TextInput, Text, View } from 'react-native';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  className?: string;
  style?: any;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  multiline = false,
  numberOfLines = 1,
  className = '',
  style = {}
}) => {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label && (
        <Text style={{ 
          color: '#374151', 
          fontWeight: '500', 
          marginBottom: 8,
          fontSize: 16 
        }}>
          {label}
        </Text>
      )}
      <TextInput
        style={{
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16,
          backgroundColor: error ? '#fef2f2' : '#f9fafb',
          borderColor: error ? '#ef4444' : '#e5e7eb',
          textAlign: multiline ? 'left' : 'left',
        }}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor="#9ca3af"
      />
      {error && (
        <Text style={{ 
          color: '#ef4444', 
          fontSize: 14, 
          marginTop: 4 
        }}>
          {error}
        </Text>
      )}
    </View>
  );
};
