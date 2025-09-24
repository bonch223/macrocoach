import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  requireTextInput?: boolean;
  requiredText?: string;
  onConfirm: () => void;
  onCancel: () => void;
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

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  requireTextInput = false,
  requiredText = 'DELETE',
  onConfirm,
  onCancel,
}) => {
  const [inputText, setInputText] = useState('');

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'warning' as const,
          iconColor: '#EF4444',
          iconBg: '#FEF2F2',
          confirmButtonBg: '#EF4444',
          borderColor: '#FECACA',
        };
      case 'info':
        return {
          icon: 'information-circle' as const,
          iconColor: '#3B82F6',
          iconBg: '#EFF6FF',
          confirmButtonBg: '#3B82F6',
          borderColor: '#DBEAFE',
        };
      default: // warning
        return {
          icon: 'warning' as const,
          iconColor: '#F59E0B',
          iconBg: '#FFFBEB',
          confirmButtonBg: '#F59E0B',
          borderColor: '#FEF3C7',
        };
    }
  };

  const typeStyles = getTypeStyles();
  const isInputValid = !requireTextInput || inputText === requiredText;
  const canConfirm = isInputValid;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setInputText(''); // Reset input
    }
  };

  const handleCancel = () => {
    onCancel();
    setInputText(''); // Reset input
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { borderColor: typeStyles.borderColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: typeStyles.iconBg }]}>
              <Ionicons name={typeStyles.icon} size={32} color={typeStyles.iconColor} />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Text Input (if required) */}
          {requireTextInput && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Type <Text style={styles.requiredText}>{requiredText}</Text> to confirm:
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  inputText === requiredText && styles.validInput,
                  inputText !== '' && inputText !== requiredText && styles.invalidInput,
                ]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={`Type ${requiredText} here`}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {inputText !== '' && inputText !== requiredText && (
                <Text style={styles.errorText}>Text must be exactly "{requiredText}"</Text>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: typeStyles.confirmButtonBg },
                !canConfirm && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={!canConfirm}
            >
              <Text style={[
                styles.confirmButtonText,
                !canConfirm && styles.disabledButtonText,
              ]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 10 },
      opacity: 0.25,
      radius: 20,
      elevation: 10,
    }),
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 4 },
      opacity: 0.1,
      radius: 8,
      elevation: 4,
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 32,
  },
  messageContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  requiredText: {
    fontWeight: '700',
    color: '#EF4444',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
    letterSpacing: 1,
  },
  validInput: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  invalidInput: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  confirmButton: {
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 4 },
      opacity: 0.15,
      radius: 8,
      elevation: 4,
    }),
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 0 },
      opacity: 0,
      radius: 0,
      elevation: 0,
    }),
  },
  disabledButtonText: {
    color: '#6B7280',
    textAlign: 'center',
  },
});
