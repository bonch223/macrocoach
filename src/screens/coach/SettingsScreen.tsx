import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsScreenProps {
  onBack: () => void;
}

interface ActivityMultipliers {
  sedentary: number;
  light: number;
  moderate: number;
  very_active: number;
  extra_active: number;
}

interface MacroDefaults {
  protein: number;
  carbs: number;
  fats: number;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [activityMultipliers, setActivityMultipliers] = useState<ActivityMultipliers>({
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  });

  const [macroDefaults, setMacroDefaults] = useState<MacroDefaults>({
    protein: 35,
    carbs: 25,
    fats: 40
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedMultipliers = await AsyncStorage.getItem('activityMultipliers');
      const savedMacros = await AsyncStorage.getItem('macroDefaults');

      if (savedMultipliers) {
        setActivityMultipliers(JSON.parse(savedMultipliers));
      }
      if (savedMacros) {
        setMacroDefaults(JSON.parse(savedMacros));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('activityMultipliers', JSON.stringify(activityMultipliers));
      await AsyncStorage.setItem('macroDefaults', JSON.stringify(macroDefaults));
      
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setActivityMultipliers({
              sedentary: 1.2,
              light: 1.375,
              moderate: 1.55,
              very_active: 1.725,
              extra_active: 1.9
            });
            setMacroDefaults({
              protein: 35,
              carbs: 25,
              fats: 40
            });
            setCoachName('MacroCoach');
            setCoachEmail('');
          }
        }
      ]
    );
  };

  const updateMultiplier = (level: keyof ActivityMultipliers, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 1.0 && numValue <= 2.5) {
      setActivityMultipliers(prev => ({
        ...prev,
        [level]: numValue
      }));
    }
  };

  const updateMacroDefault = (macro: keyof MacroDefaults, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setMacroDefaults(prev => ({
        ...prev,
        [macro]: numValue
      }));
    }
  };

  const validateMacroPercentages = () => {
    const total = macroDefaults.protein + macroDefaults.carbs + macroDefaults.fats;
    return total === 100;
  };

  const getActivityLevelLabel = (level: keyof ActivityMultipliers) => {
    const labels = {
      sedentary: 'Sedentary',
      light: 'Light Activity',
      moderate: 'Moderate Activity',
      very_active: 'Very Active',
      extra_active: 'Extra Active'
    };
    return labels[level];
  };

  const getActivityLevelDescription = (level: keyof ActivityMultipliers) => {
    const descriptions = {
      sedentary: 'Little to no exercise',
      light: 'Light exercise 1-3 days/week',
      moderate: 'Moderate exercise 3-5 days/week',
      very_active: 'Heavy exercise 6-7 days/week',
      extra_active: 'Very heavy exercise, physical job'
    };
    return descriptions[level];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Settings</Text>
              <Text style={styles.headerSubtitle}>Customize your app preferences</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Activity Level Multipliers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fitness-outline" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Activity Level Multipliers</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Customize the multipliers used for TDEE calculations. These values are multiplied by BMR to calculate daily energy expenditure.
          </Text>

          {Object.entries(activityMultipliers).map(([level, value]) => (
            <View key={level} style={styles.multiplierRow}>
              <View style={styles.multiplierInfo}>
                <Text style={styles.multiplierLabel}>
                  {getActivityLevelLabel(level as keyof ActivityMultipliers)}
                </Text>
                <Text style={styles.multiplierDescription}>
                  {getActivityLevelDescription(level as keyof ActivityMultipliers)}
                </Text>
              </View>
              <View style={styles.multiplierInputContainer}>
                <TextInput
                  style={styles.multiplierInput}
                  value={value.toString()}
                  onChangeText={(text) => updateMultiplier(level as keyof ActivityMultipliers, text)}
                  keyboardType="numeric"
                  placeholder="1.0"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.multiplierUnit}>x</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Default Macro Percentages Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pie-chart-outline" size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Default Macro Percentages</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Set the default macro distribution for new clients. Total must equal 100%.
          </Text>

          <View style={styles.macroRow}>
            <View style={styles.macroInputGroup}>
              <Text style={styles.macroLabel}>Protein</Text>
              <View style={styles.macroInputContainer}>
                <TextInput
                  style={styles.macroInput}
                  value={macroDefaults.protein.toString()}
                  onChangeText={(text) => updateMacroDefault('protein', text)}
                  keyboardType="numeric"
                  placeholder="35"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.macroUnit}>%</Text>
              </View>
            </View>

            <View style={styles.macroInputGroup}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <View style={styles.macroInputContainer}>
                <TextInput
                  style={styles.macroInput}
                  value={macroDefaults.carbs.toString()}
                  onChangeText={(text) => updateMacroDefault('carbs', text)}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.macroUnit}>%</Text>
              </View>
            </View>

            <View style={styles.macroInputGroup}>
              <Text style={styles.macroLabel}>Fats</Text>
              <View style={styles.macroInputContainer}>
                <TextInput
                  style={styles.macroInput}
                  value={macroDefaults.fats.toString()}
                  onChangeText={(text) => updateMacroDefault('fats', text)}
                  keyboardType="numeric"
                  placeholder="40"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.macroUnit}>%</Text>
              </View>
            </View>
          </View>

          {!validateMacroPercentages() && (
            <Text style={styles.errorText}>
              Macro percentages must total 100% (Current: {macroDefaults.protein + macroDefaults.carbs + macroDefaults.fats}%)
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
            <Ionicons name="save-outline" size={20} color="white" />
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
            <Ionicons name="refresh-outline" size={20} color="#EF4444" />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>App Information</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>2024.01</Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1E293B',
    paddingBottom: 16,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'white',
  },
  multiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  multiplierInfo: {
    flex: 1,
    marginRight: 16,
  },
  multiplierLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  multiplierDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  multiplierInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiplierInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#1F2937',
    width: 60,
    textAlign: 'center',
  },
  multiplierUnit: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroInputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  macroInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    width: 50,
    textAlign: 'center',
  },
  macroUnit: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtons: {
    marginTop: 20,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  bottomSpacing: {
    height: 40,
  },
});
