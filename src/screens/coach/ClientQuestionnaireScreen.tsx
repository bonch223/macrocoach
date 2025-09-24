import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { firestoreService } from '../../services/firestoreService';
import { ClientQuestionnaire } from '../../types';
import { shadowPresets } from '../../utils/shadowStyles';

// Use the ClientQuestionnaire type from types/index.ts
type ClientQuestionnaireData = ClientQuestionnaire;

interface ClientQuestionnaireScreenProps {
  clientData: any;
  onBack: () => void;
  onComplete: (questionnaireData: ClientQuestionnaireData) => void;
}

const ClientQuestionnaireScreen: React.FC<ClientQuestionnaireScreenProps> = ({
  clientData,
  onBack,
  onComplete,
}) => {
  const [questionnaireData, setQuestionnaireData] = useState<ClientQuestionnaireData>({
    medicalConditions: '',
    medicalConditionsDetails: '',
    recentSurgery: '',
    medications: '',
    bloodPressure: '',
    familyHistory: '',
    currentInjuries: '',
    currentInjuriesDetails: '',
    painDuringActivity: '',
    exercisesToAvoid: [],
    exerciseDaysPerWeek: '',
    typicalActivities: [],
    weightTrainingExperience: '',
    fitnessLevel: '',
    smokingDrinking: '',
  });

  const updateField = (field: keyof ClientQuestionnaireData, value: string) => {
    setQuestionnaireData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateMultiSelect = (field: keyof ClientQuestionnaireData, value: string) => {
    setQuestionnaireData(prev => {
      const currentArray = prev[field] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [field]: newArray,
      };
    });
  };

  const handleSubmit = () => {
    // Validate required fields
    const requiredFields = [
      'medicalConditions',
      'recentSurgery',
      'currentInjuries',
      'exerciseDaysPerWeek',
      'fitnessLevel',
      'smokingDrinking'
    ];

    const missingFields = requiredFields.filter(field => {
      const value = questionnaireData[field as keyof ClientQuestionnaireData];
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return !value || value.toString().trim() === '';
    });

    // Check if medical conditions details is required
    if (questionnaireData.medicalConditions === 'Yes' && 
        (!questionnaireData.medicalConditionsDetails || questionnaireData.medicalConditionsDetails.trim() === '')) {
      Alert.alert(
        'Missing Information',
        'Please provide details about your medical conditions.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check if injury details is required
    if (questionnaireData.currentInjuries === 'Yes' && 
        (!questionnaireData.currentInjuriesDetails || questionnaireData.currentInjuriesDetails.trim() === '')) {
      Alert.alert(
        'Missing Information',
        'Please provide details about your current injuries.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information',
        'Please fill in all required fields before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }

    onComplete(questionnaireData);
  };

  // Yes/No Question Component
  const renderYesNoQuestion = (
    question: string,
    field: keyof ClientQuestionnaireData,
    required: boolean = false
  ) => (
    <View style={styles.questionContainer}>
      <Text style={styles.questionText}>
        {required && <Text style={styles.required}>* </Text>}
        {question}
      </Text>
      <View style={styles.yesNoContainer}>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            questionnaireData[field] === 'Yes' && styles.yesNoButtonActive
          ]}
          onPress={() => updateField(field, 'Yes')}
        >
          <Text style={[
            styles.yesNoButtonText,
            questionnaireData[field] === 'Yes' && styles.yesNoButtonTextActive
          ]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            questionnaireData[field] === 'No' && styles.yesNoButtonActive
          ]}
          onPress={() => updateField(field, 'No')}
        >
          <Text style={[
            styles.yesNoButtonText,
            questionnaireData[field] === 'No' && styles.yesNoButtonTextActive
          ]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Number Selection Component
  const renderNumberQuestion = (
    question: string,
    field: keyof ClientQuestionnaireData,
    numbers: number[],
    required: boolean = false
  ) => (
    <View style={styles.questionContainer}>
      <Text style={styles.questionText}>
        {required && <Text style={styles.required}>* </Text>}
        {question}
      </Text>
      <View style={styles.numberContainer}>
        {numbers.map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.numberButton,
              questionnaireData[field] === num.toString() && styles.numberButtonActive
            ]}
            onPress={() => updateField(field, num.toString())}
          >
            <Text style={[
              styles.numberButtonText,
              questionnaireData[field] === num.toString() && styles.numberButtonTextActive
            ]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Multi-Select Component
  const renderMultiSelectQuestion = (
    question: string,
    field: keyof ClientQuestionnaireData,
    options: string[],
    required: boolean = false
  ) => (
    <View style={styles.questionContainer}>
      <Text style={styles.questionText}>
        {required && <Text style={styles.required}>* </Text>}
        {question}
      </Text>
      <View style={styles.multiSelectContainer}>
        {options.map((option) => {
          const isSelected = (questionnaireData[field] as string[]).includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.multiSelectButton,
                isSelected && styles.multiSelectButtonActive
              ]}
              onPress={() => updateMultiSelect(field, option)}
            >
              <Text style={[
                styles.multiSelectButtonText,
                isSelected && styles.multiSelectButtonTextActive
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Single Select Component
  const renderSingleSelectQuestion = (
    question: string,
    field: keyof ClientQuestionnaireData,
    options: string[],
    required: boolean = false
  ) => (
    <View style={styles.questionContainer}>
      <Text style={styles.questionText}>
        {required && <Text style={styles.required}>* </Text>}
        {question}
      </Text>
      <View style={styles.singleSelectContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.singleSelectButton,
              questionnaireData[field] === option && styles.singleSelectButtonActive
            ]}
            onPress={() => updateField(field, option)}
          >
            <Text style={[
              styles.singleSelectButtonText,
              questionnaireData[field] === option && styles.singleSelectButtonTextActive
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Text Input Component
  const renderTextInput = (
    placeholder: string,
    field: keyof ClientQuestionnaireData,
    multiline: boolean = false
  ) => (
    <View style={styles.textInputContainer}>
      <TextInput
        style={[styles.textInput, multiline && styles.multilineTextInput]}
        value={questionnaireData[field]}
        onChangeText={(value) => updateField(field, value)}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Client Questionnaire</Text>
          <Text style={styles.headerSubtitle}>Complete health & fitness assessment</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Client Info Card */}
          <View style={styles.clientInfoCard}>
            <View style={styles.clientInfoHeader}>
              <Ionicons name="person-circle-outline" size={24} color="#3B82F6" />
              <Text style={styles.clientInfoTitle}>Client Information</Text>
            </View>
            
            <View style={styles.clientInfoGrid}>
              <View style={styles.clientInfoItem}>
                <Text style={styles.clientInfoLabel}>Name</Text>
                <Text style={styles.clientInfoValue}>{clientData.name}</Text>
              </View>
              
              <View style={styles.clientInfoItem}>
                <Text style={styles.clientInfoLabel}>Email</Text>
                <Text style={styles.clientInfoValue}>{clientData.email}</Text>
              </View>
              
              <View style={styles.clientInfoItem}>
                <Text style={styles.clientInfoLabel}>Age</Text>
                <Text style={styles.clientInfoValue}>{clientData.age} years</Text>
              </View>
              
              <View style={styles.clientInfoItem}>
                <Text style={styles.clientInfoLabel}>Gender</Text>
                <Text style={styles.clientInfoValue}>{clientData.gender}</Text>
              </View>
              
              <View style={styles.clientInfoItem}>
                <Text style={styles.clientInfoLabel}>Current Weight</Text>
                <Text style={styles.clientInfoValue}>{clientData.weight} kg</Text>
              </View>
              
              <View style={styles.clientInfoItem}>
                <Text style={styles.clientInfoLabel}>Height</Text>
                <Text style={styles.clientInfoValue}>{clientData.height} cm</Text>
              </View>
            </View>
          </View>

          {/* Section 2: Medical History */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medical-outline" size={20} color="#EF4444" />
              <Text style={styles.sectionTitle}>2. Medical History</Text>
            </View>
            
            {renderYesNoQuestion(
              "Known medical conditions (e.g. diabetes, heart disease)?",
              "medicalConditions",
              true
            )}
            
            {questionnaireData.medicalConditions === 'Yes' && (
              renderTextInput(
                "Please describe your medical conditions...",
                "medicalConditionsDetails",
                true
              )
            )}
            
            {renderYesNoQuestion(
              "Surgery in the past 12 months?",
              "recentSurgery",
              true
            )}
            
            {renderYesNoQuestion(
              "Currently taking medications?",
              "medications"
            )}
            
            {renderSingleSelectQuestion(
              "Blood pressure status?",
              "bloodPressure",
              ["Normal", "High", "Low", "Not sure"]
            )}
            
            {renderYesNoQuestion(
              "Family history of heart disease or illness?",
              "familyHistory"
            )}
          </View>

          {/* Section 3: Injury & Pain Assessment */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>3. Injury & Pain Assessment</Text>
            </View>
            
            {renderYesNoQuestion(
              "Current or past injuries?",
              "currentInjuries",
              true
            )}
            
            {questionnaireData.currentInjuries === 'Yes' && (
              renderTextInput(
                "Please describe your injuries...",
                "currentInjuriesDetails",
                true
              )
            )}
            
            {renderYesNoQuestion(
              "Pain during activity?",
              "painDuringActivity"
            )}
            
            {renderMultiSelectQuestion(
              "Exercises to avoid?",
              "exercisesToAvoid",
              ["Heavy lifting", "High impact", "Overhead movements", "Squats", "Deadlifts", "None"]
            )}
          </View>

          {/* Section 4: Current Fitness & Activity Level */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness-outline" size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>4. Current Fitness & Activity Level</Text>
            </View>
            
            {renderNumberQuestion(
              "Days per week you exercise:",
              "exerciseDaysPerWeek",
              [0, 1, 2, 3, 4, 5, 6, 7],
              true
            )}
            
            {renderMultiSelectQuestion(
              "Typical activities:",
              "typicalActivities",
              ["Weight training", "Cardio", "Running", "Swimming", "Cycling", "Yoga", "Sports", "Dancing", "Walking", "Other"]
            )}
            
            {renderSingleSelectQuestion(
              "Experience with weight training?",
              "weightTrainingExperience",
              ["Beginner", "Intermediate", "Advanced", "No experience"]
            )}
            
            {renderNumberQuestion(
              "Rate your fitness level (1-10):",
              "fitnessLevel",
              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              true
            )}
          </View>

          {/* Section 5: Lifestyle & Nutrition */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="leaf-outline" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>5. Lifestyle & Nutrition</Text>
            </View>
            
            {renderSingleSelectQuestion(
              "Do you smoke or drink alcohol?",
              "smokingDrinking",
              ["Neither", "Smoke only", "Drink only", "Both", "Occasionally drink"],
              true
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.backButtonAction} onPress={onBack}>
              <View style={styles.backButtonContent}>
                <Ionicons name="arrow-back" size={16} color="#6B7280" style={styles.backButtonIcon} />
                <Text style={styles.backButtonText}>Back</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.nextButton} onPress={handleSubmit}>
              <View style={styles.completeButtonContent}>
                <Text style={styles.nextButtonText}>Complete Assessment</Text>
                <Ionicons name="arrow-forward" size={16} color="white" style={styles.completeButtonIcon} />
              </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  clientInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    ...shadowPresets.card,
  },
  clientInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  clientInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  clientInfoGrid: {
    gap: 16,
  },
  clientInfoItem: {
    gap: 4,
  },
  clientInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    ...shadowPresets.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    lineHeight: 22,
  },
  required: {
    color: '#EF4444',
  },
  // Yes/No Button Styles
  yesNoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  yesNoButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  yesNoButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  yesNoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  yesNoButtonTextActive: {
    color: 'white',
  },

  // Number Button Styles
  numberContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numberButton: {
    width: 50,
    height: 50,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  numberButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  numberButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  numberButtonTextActive: {
    color: 'white',
  },

  // Multi-Select Button Styles
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  multiSelectButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  multiSelectButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  multiSelectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  multiSelectButtonTextActive: {
    color: 'white',
  },

  // Single Select Button Styles
  singleSelectContainer: {
    gap: 8,
  },
  singleSelectButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  singleSelectButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  singleSelectButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  singleSelectButtonTextActive: {
    color: 'white',
  },

  // Text Input Styles
  textInputContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#F9FAFB',
  },
  multilineTextInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
  },
  backButtonAction: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    marginRight: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    marginLeft: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonIcon: {
    marginRight: 8,
  },
  completeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonIcon: {
    marginLeft: 8,
  },
});

export default ClientQuestionnaireScreen;
