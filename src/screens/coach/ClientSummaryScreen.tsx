import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';

interface ClientSummaryScreenProps {
  clientData: {
    name: string;
    email: string;
    phone?: string;
    birthday?: string;
    address?: string;
    emergencyContact?: string;
    coachingDuration?: string;
    weight: number;
    height: number;
    age: number;
    gender: 'male' | 'female';
    activityLevel: string;
    goal: string;
    totalCalories: string;
    protein: number;
    carbs: number;
    fats: number;
    bmi: number;
    tdee: number;
  };
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const ClientSummaryScreen: React.FC<ClientSummaryScreenProps> = ({
  clientData,
  onBack,
  onConfirm,
  loading,
}) => {
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: '#F59E0B', bgColor: '#FEF3C7' };
    if (bmi < 25) return { category: 'Normal', color: '#10B981', bgColor: '#D1FAE5' };
    if (bmi < 30) return { category: 'Overweight', color: '#F59E0B', bgColor: '#FEF3C7' };
    return { category: 'Obese', color: '#EF4444', bgColor: '#FEE2E2' };
  };

  const getBMIPosition = (bmi: number) => {
    // BMI ranges: Underweight < 18.5, Normal 18.5-24.9, Overweight 25-29.9, Obese > 30
    if (bmi < 18.5) return (bmi / 18.5) * 25; // 0-25% of bar
    if (bmi < 25) return 25 + ((bmi - 18.5) / 6.4) * 25; // 25-50% of bar
    if (bmi < 30) return 50 + ((bmi - 25) / 5) * 25; // 50-75% of bar
    return Math.min(75 + ((bmi - 30) / 10) * 25, 100); // 75-100% of bar
  };

  const getGoalDisplay = (goal: string) => {
    switch (goal) {
      case 'deficit': return 'Weight Loss';
      case 'maintenance': return 'Weight Maintenance';
      case 'surplus': return 'Weight Gain';
      default: return goal;
    }
  };

  const bmiInfo = getBMICategory(clientData.bmi);
  const bmiPosition = getBMIPosition(clientData.bmi);

  return (
    <View style={styles.container}>
      <Header 
        title="Client Summary"
        subtitle="Review before adding client"
        showBackButton={true}
        onBackPress={onBack}
        showProfileButton={false}
        showTime={false}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentContainer}>
          
          {/* Client Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="person" size={20} color="#3B82F6" style={styles.cardTitleIcon} />
                <Text style={styles.cardTitle}>Client Information</Text>
              </View>
            </View>
            <View style={styles.clientInfoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{clientData.name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{clientData.email}</Text>
              </View>
              {clientData.phone && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{clientData.phone}</Text>
                </View>
              )}
              {clientData.birthday && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Birthday</Text>
                  <Text style={styles.infoValue}>{clientData.birthday}</Text>
                </View>
              )}
              {clientData.address && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{clientData.address}</Text>
                </View>
              )}
              {clientData.emergencyContact && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Emergency Contact</Text>
                  <Text style={styles.infoValue}>{clientData.emergencyContact}</Text>
                </View>
              )}
              {clientData.coachingDuration && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Coaching Duration</Text>
                  <Text style={styles.infoValue}>{clientData.coachingDuration}</Text>
                </View>
              )}
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>{clientData.age} years</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{clientData.gender === 'male' ? 'Male' : 'Female'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Current Weight</Text>
                <Text style={styles.infoValue}>{clientData.weight} kg</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Height</Text>
                <Text style={styles.infoValue}>{clientData.height} cm</Text>
              </View>
            </View>
          </View>

          {/* BMI Analysis Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="analytics" size={20} color="#8B5CF6" style={styles.cardTitleIcon} />
                <Text style={styles.cardTitle}>BMI Analysis</Text>
              </View>
            </View>
            
            <View style={styles.bmiContainer}>
              <View style={styles.bmiValueContainer}>
                <Text style={styles.bmiValue}>{clientData.bmi.toFixed(1)}</Text>
                <Text style={styles.bmiUnit}>kg/m²</Text>
              </View>
              
              <View style={styles.bmiVisualContainer}>
                <View style={styles.bmiBar}>
                  <View style={[styles.bmiIndicator, { left: `${bmiPosition}%` }]} />
                </View>
                <View style={styles.bmiLabels}>
                  <Text style={styles.bmiLabel}>Underweight</Text>
                  <Text style={styles.bmiLabel}>Normal</Text>
                  <Text style={styles.bmiLabel}>Overweight</Text>
                  <Text style={styles.bmiLabel}>Obese</Text>
                </View>
                <View style={styles.bmiRanges}>
                  <Text style={styles.bmiRange}>&lt;18.5</Text>
                  <Text style={styles.bmiRange}>18.5-24.9</Text>
                  <Text style={styles.bmiRange}>25-29.9</Text>
                  <Text style={styles.bmiRange}>&gt;30</Text>
                </View>
              </View>
              
              <View style={[styles.bmiStatusBadge, { backgroundColor: bmiInfo.bgColor }]}>
                <Text style={[styles.bmiStatusText, { color: bmiInfo.color }]}>
                  {bmiInfo.category}
                </Text>
              </View>
            </View>
          </View>

          {/* Fitness Goal Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="flag" size={20} color="#F59E0B" style={styles.cardTitleIcon} />
                <Text style={styles.cardTitle}>Fitness Goal</Text>
              </View>
            </View>
            
            <View style={styles.goalContainer}>
              <View style={styles.goalDisplay}>
                <Text style={styles.goalText}>{getGoalDisplay(clientData.goal)}</Text>
              </View>
              <View style={styles.goalDetails}>
                <View style={styles.goalDetailItem}>
                  <Text style={styles.goalDetailLabel}>Target Calories</Text>
                  <Text style={styles.goalDetailValue}>{clientData.totalCalories} kcal/day</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Macro Targets Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="nutrition" size={20} color="#EF4444" style={styles.cardTitleIcon} />
                <Text style={styles.cardTitle}>Daily Macro Targets</Text>
              </View>
            </View>
            
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <View style={[styles.macroIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="fitness" size={24} color="#EF4444" />
                </View>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>{clientData.protein}g</Text>
              </View>
              
              <View style={styles.macroItem}>
                <View style={[styles.macroIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="leaf" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>{clientData.carbs}g</Text>
              </View>
              
              <View style={styles.macroItem}>
                <View style={[styles.macroIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="flash" size={24} color="#EF4444" />
                </View>
                <Text style={styles.macroLabel}>Fats</Text>
                <Text style={styles.macroValue}>{clientData.fats}g</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.editButton}
              disabled={loading}
            >
              <Ionicons name="create" size={20} color="#6B7280" />
              <Text style={styles.editButtonText}>Edit Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onConfirm}
              style={styles.confirmButton}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.confirmButtonText}>Adding...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.confirmButtonText}>Add Client</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  contentContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitleIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  clientInfoGrid: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  bmiContainer: {
    alignItems: 'center',
  },
  bmiValueContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bmiValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
  },
  bmiUnit: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  bmiVisualContainer: {
    width: '100%',
    marginBottom: 20,
  },
  bmiBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    position: 'relative',
    marginBottom: 12,
  },
  bmiIndicator: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  bmiLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bmiLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    flex: 1,
  },
  bmiRanges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bmiRange: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    flex: 1,
  },
  bmiStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bmiStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalContainer: {
    alignItems: 'center',
  },
  goalDisplay: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  goalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  goalDetails: {
    width: '100%',
    gap: 12,
  },
  goalDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  goalDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  goalDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
