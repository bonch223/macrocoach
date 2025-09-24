import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
  visible: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onClose: () => void;
  title?: string;
  minimumDate?: Date;
  maximumDate?: Date;
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

export const DatePicker: React.FC<DatePickerProps> = ({
  visible,
  selectedDate,
  onDateChange,
  onClose,
  title = 'Select Date',
  minimumDate,
  maximumDate,
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [selectedYear, setSelectedYear] = useState(selectedDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(selectedDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(selectedDate.getDate());

  // Update local state when selectedDate prop changes
  useEffect(() => {
    setCurrentDate(selectedDate);
    setSelectedYear(selectedDate.getFullYear());
    setSelectedMonth(selectedDate.getMonth());
    setSelectedDay(selectedDate.getDate());
  }, [selectedDate]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const days = Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1);

  const handleDateChange = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    
    // Validate date constraints
    if (minimumDate && newDate < minimumDate) {
      return;
    }
    if (maximumDate && newDate > maximumDate) {
      return;
    }
    
    setCurrentDate(newDate);
    onDateChange(newDate);
  };

  const handleConfirm = () => {
    handleDateChange();
    onClose();
  };

  const handleCancel = () => {
    // Reset to original date
    setSelectedYear(selectedDate.getFullYear());
    setSelectedMonth(selectedDate.getMonth());
    setSelectedDay(selectedDate.getDate());
    onClose();
  };

  const isDateValid = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    if (minimumDate && newDate < minimumDate) return false;
    if (maximumDate && newDate > maximumDate) return false;
    return true;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity 
              onPress={handleConfirm} 
              style={[styles.confirmButton, !isDateValid() && styles.disabledButton]}
              disabled={!isDateValid()}
            >
              <Text style={[styles.confirmButtonText, !isDateValid() && styles.disabledButtonText]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected Date Display */}
          <View style={styles.selectedDateContainer}>
            <Ionicons name="calendar" size={20} color="#3B82F6" />
            <Text style={styles.selectedDateText}>
              {formatDate(new Date(selectedYear, selectedMonth, selectedDay))}
            </Text>
          </View>

          {/* Date Selectors */}
          <View style={styles.selectorsContainer}>
            {/* Year Selector */}
            <View style={styles.selectorColumn}>
              <Text style={styles.selectorLabel}>Year</Text>
              <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.selectorItem,
                      selectedYear === year && styles.selectedItem,
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text style={[
                      styles.selectorItemText,
                      selectedYear === year && styles.selectedItemText,
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Month Selector */}
            <View style={styles.selectorColumn}>
              <Text style={styles.selectorLabel}>Month</Text>
              <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.selectorItem,
                      selectedMonth === index && styles.selectedItem,
                    ]}
                    onPress={() => setSelectedMonth(index)}
                  >
                    <Text style={[
                      styles.selectorItemText,
                      selectedMonth === index && styles.selectedItemText,
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day Selector */}
            <View style={styles.selectorColumn}>
              <Text style={styles.selectorLabel}>Day</Text>
              <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                {days.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.selectorItem,
                      selectedDay === day && styles.selectedItem,
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[
                      styles.selectorItemText,
                      selectedDay === day && styles.selectedItemText,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                const today = new Date();
                setSelectedYear(today.getFullYear());
                setSelectedMonth(today.getMonth());
                setSelectedDay(today.getDate());
              }}
            >
              <Ionicons name="today" size={16} color="#3B82F6" />
              <Text style={styles.quickActionText}>Today</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedYear(yesterday.getFullYear());
                setSelectedMonth(yesterday.getMonth());
                setSelectedDay(yesterday.getDate());
              }}
            >
              <Ionicons name="arrow-back" size={16} color="#6B7280" />
              <Text style={styles.quickActionText}>Yesterday</Text>
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: -5 },
      opacity: 0.25,
      radius: 20,
      elevation: 10,
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cancelButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  disabledButtonText: {
    color: '#6B7280',
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  selectorsContainer: {
    flexDirection: 'row',
    height: 300,
  },
  selectorColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectorScroll: {
    flex: 1,
  },
  selectorItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedItem: {
    backgroundColor: '#EBF8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  selectorItemText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedItemText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 16,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
});
