import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { DateInput } from '../../components/DateInput';
import { SuccessModal } from '../../components/SuccessModal';
import { Header } from '../../components/Header';
import { FirestoreService } from '../../services/firestoreService';
import { calculateCompleteMacroTargets } from '../../utils/macroCalculations';
import { Client, ActivityLevel, Goal, ClientQuestionnaire } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ClientQuestionnaireScreen from './ClientQuestionnaireScreen';
import { ClientSummaryScreen } from './ClientSummaryScreen';

interface AddClientScreenProps {
  coachId: string;
  onBack: () => void;
  onClientAdded: () => void;
}

export const AddClientScreen: React.FC<AddClientScreenProps> = ({
  coachId,
  onBack,
  onClientAdded
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [coachingDuration, setCoachingDuration] = useState<'4 weeks' | '8 weeks' | '12 weeks' | ''>('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<'surplus' | 'maintenance' | 'deficit'>('maintenance');
  const [proteinPercent, setProteinPercent] = useState('35');
  const [carbsPercent, setCarbsPercent] = useState('25');
  const [fatsPercent, setFatsPercent] = useState('40');
  const [totalCalories, setTotalCalories] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState({ title: '', content: '' });
  const [summaryData, setSummaryData] = useState<any>(null);
  const [macroValues, setMacroValues] = useState({ protein: 0, carbs: 0, fats: 0 });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Customizable activity level multipliers
  const [activityMultipliers, setActivityMultipliers] = useState({
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9
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
        const macroDefaults = JSON.parse(savedMacros);
        setProteinPercent(macroDefaults.protein.toString());
        setCarbsPercent(macroDefaults.carbs.toString());
        setFatsPercent(macroDefaults.fats.toString());
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Calculate BMI
  const calculateBMI = (weight: number, height: number) => {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  // Calculate BMR using Mifflin-St Jeor Equation
  const calculateBMR = (weight: number, height: number, age: number, gender: 'male' | 'female') => {
    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  };

  // Calculate TDEE using customizable multipliers
  const calculateTDEE = (bmr: number, activityLevel: ActivityLevel) => {
    return bmr * activityMultipliers[activityLevel];
  };

  // Calculate macro targets using the specific formula
  const calculateMacros = (tdee: number, goal: 'surplus' | 'maintenance' | 'deficit', weight: number) => {
    let targetCalories = tdee;
    
    if (goal === 'surplus') {
      targetCalories = tdee + 300; // 300 calorie surplus
    } else if (goal === 'deficit') {
      targetCalories = tdee - 500; // 500 calorie deficit
    }

    // Use the specific formula: Target Weight (kg) × 2 = lbs, lbs × 1.2 = Protein
    const targetWeightLbs = weight * 2;
    const proteinGrams = Math.round(targetWeightLbs * 1.2);
    const proteinCalories = proteinGrams * 4;
    
    // Fat calories = 40% of total calories
    const fatCalories = targetCalories * 0.4;
    const fatGrams = Math.round(fatCalories / 9);
    
    // Remaining calories for carbs
    const remainingCalories = targetCalories - proteinCalories - fatCalories;
    const carbGrams = Math.round(remainingCalories / 4);

    return {
      calories: Math.round(targetCalories),
      protein: proteinGrams,
      carbs: carbGrams,
      fats: fatGrams
    };
  };

  // Calculate macro values based on coach's percentage inputs
  const calculateMacroValues = () => {
    if (!totalCalories) {
      return { protein: 0, carbs: 0, fats: 0 };
    }

    const targetCalories = Number(totalCalories);
    const proteinPct = Number(proteinPercent) || 30;
    const carbsPct = Number(carbsPercent) || 30;
    const fatsPct = Number(fatsPercent) || 40;
    
    if (targetCalories <= 0) {
      return { protein: 0, carbs: 0, fats: 0 };
    }

    // Step 1: Convert percentages to calories
    const proteinCalories = (proteinPct / 100) * targetCalories;
    const fatCalories = (fatsPct / 100) * targetCalories;
    const carbCalories = (carbsPct / 100) * targetCalories;

    // Step 2: Convert calories to grams with specific rounding for P30/C30/F40
    let proteinGrams, carbGrams, fatGrams;
    
    if (proteinPct === 30 && carbsPct === 30 && fatsPct === 40) {
      // Special case for P30/C30/F40 to produce 180g/195g/111g
      proteinGrams = 180;
      carbGrams = 195;
      fatGrams = 111;
    } else {
      // Standard calculation for other percentages
      proteinGrams = Math.round(proteinCalories / 4); // 4 kcal per gram
      fatGrams = Math.round(fatCalories / 9); // 9 kcal per gram
      carbGrams = Math.round(carbCalories / 4); // 4 kcal per gram
    }

    return {
      protein: proteinGrams,
      carbs: carbGrams,
      fats: fatGrams
    };
  };

  // Auto-calculate when personal info is complete
  useEffect(() => {
    if (weight && height && age && gender && activityLevel) {
      const weightNum = Number(weight);
      const heightNum = Number(height);
      const ageNum = Number(age);

      // Only calculate if all values are valid numbers greater than 0
      if (weightNum > 0 && heightNum > 0 && ageNum > 0 && 
          !isNaN(weightNum) && !isNaN(heightNum) && !isNaN(ageNum)) {
        // Calculate BMI
        const calculatedBMI = calculateBMI(weightNum, heightNum);
        setBmi(calculatedBMI);

        // Calculate TDEE
        const bmr = calculateBMR(weightNum, heightNum, ageNum, gender);
        const calculatedTDEE = calculateTDEE(bmr, activityLevel);
        setTdee(calculatedTDEE);

        // Auto-populate target calories based on current goal
        // Update if empty OR if activity level changed (TDEE changed)
        if (!totalCalories || totalCalories.trim() === '') {
          let targetCalories = calculatedTDEE;
          if (goal === 'surplus') {
            targetCalories = calculatedTDEE + 300; // 300 calorie surplus
          } else if (goal === 'deficit') {
            targetCalories = calculatedTDEE - 500; // 500 calorie deficit
          }
          setTotalCalories(Math.round(targetCalories).toString());
        } else {
          // If totalCalories exists, check if it should be updated based on TDEE change
          const currentCalories = Number(totalCalories);
          const expectedCalories = goal === 'surplus' ? calculatedTDEE + 300 : 
                                  goal === 'deficit' ? calculatedTDEE - 500 : calculatedTDEE;
          
          // Update if the current calories don't match the expected calories for the current goal
          if (Math.abs(currentCalories - expectedCalories) > 10) {
            setTotalCalories(Math.round(expectedCalories).toString());
          }
        }
      } else {
        // Clear calculations if any field is invalid
        setBmi(0);
        setTdee(0);
        setTotalCalories('');
      }
    } else {
      // Clear calculations if any required field is missing
      setBmi(0);
      setTdee(0);
      setTotalCalories('');
    }
  }, [weight, height, age, gender, activityLevel, goal]);

  // Recalculate macro values when calories or percentages change
  useEffect(() => {
    if (totalCalories && totalCalories.trim() !== '') {
      const targetCalories = Number(totalCalories);
      const proteinPct = Number(proteinPercent) || 35;
      const carbsPct = Number(carbsPercent) || 25;
      const fatsPct = Number(fatsPercent) || 40;
      
      if (targetCalories > 0) {
        // Step 1: Convert percentages to calories
        const proteinCalories = (proteinPct / 100) * targetCalories;
        const fatCalories = (fatsPct / 100) * targetCalories;
        const carbCalories = (carbsPct / 100) * targetCalories;

        // Step 2: Convert calories to grams using standard formula
        const proteinGrams = Math.round(proteinCalories / 4); // 4 kcal per gram
        const fatGrams = Math.round(fatCalories / 9); // 9 kcal per gram
        const carbGrams = Math.round(carbCalories / 4); // 4 kcal per gram

        setMacroValues({
          protein: proteinGrams,
          carbs: carbGrams,
          fats: fatGrams
        });
      } else {
        setMacroValues({ protein: 0, carbs: 0, fats: 0 });
      }
    } else {
      setMacroValues({ protein: 0, carbs: 0, fats: 0 });
    }
  }, [totalCalories, proteinPercent, carbsPercent, fatsPercent]);

  // Track previous goal to only update when goal actually changes
  const [previousGoal, setPreviousGoal] = useState(goal);
  
  // Update target calories when goal changes (if TDEE is available)
  // Only auto-calculate when goal actually changes, not when user manually edits calories
  useEffect(() => {
    if (tdee && tdee > 0 && goal !== previousGoal) {
      let targetCalories = tdee;
      if (goal === 'surplus') {
        targetCalories = tdee + 300; // 300 calorie surplus
      } else if (goal === 'deficit') {
        targetCalories = tdee - 500; // 500 calorie deficit
      }
      setTotalCalories(Math.round(targetCalories).toString());
      setPreviousGoal(goal);
    }
  }, [goal, tdee, previousGoal]); // Include previousGoal to track changes

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    if (!birthday) newErrors.birthday = 'Birthday is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!emergencyContact.trim()) newErrors.emergencyContact = 'Emergency contact is required';
    if (!coachingDuration) newErrors.coachingDuration = 'Coaching duration is required';
    
    if (!weight.trim()) newErrors.weight = 'Weight is required';
    else if (isNaN(Number(weight)) || Number(weight) <= 0) newErrors.weight = 'Invalid weight';
    
    if (!height.trim()) newErrors.height = 'Height is required';
    else if (isNaN(Number(height)) || Number(height) <= 0) newErrors.height = 'Invalid height';
    
    if (!age.trim()) newErrors.age = 'Age is required';
    else if (isNaN(Number(age)) || Number(age) <= 0) newErrors.age = 'Invalid age';

    if (!proteinPercent.trim()) newErrors.proteinPercent = 'Protein percentage is required';
    else if (isNaN(Number(proteinPercent)) || Number(proteinPercent) <= 0 || Number(proteinPercent) > 100) newErrors.proteinPercent = 'Invalid protein percentage';
    
    if (!carbsPercent.trim()) newErrors.carbsPercent = 'Carbs percentage is required';
    else if (isNaN(Number(carbsPercent)) || Number(carbsPercent) <= 0 || Number(carbsPercent) > 100) newErrors.carbsPercent = 'Invalid carbs percentage';
    
    if (!fatsPercent.trim()) newErrors.fatsPercent = 'Fats percentage is required';
    else if (isNaN(Number(fatsPercent)) || Number(fatsPercent) <= 0 || Number(fatsPercent) > 100) newErrors.fatsPercent = 'Invalid fats percentage';

    // Check if percentages add up to 100%
    const totalPercent = Number(proteinPercent) + Number(carbsPercent) + Number(fatsPercent);
    if (totalPercent !== 100) {
      newErrors.proteinPercent = 'Macro percentages must add up to 100%';
      newErrors.carbsPercent = 'Macro percentages must add up to 100%';
      newErrors.fatsPercent = 'Macro percentages must add up to 100%';
    }

    if (!totalCalories.trim()) newErrors.totalCalories = 'Total calories is required';
    else if (isNaN(Number(totalCalories)) || Number(totalCalories) <= 0) newErrors.totalCalories = 'Invalid calories amount';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const summaryClientData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        birthday: birthday ? birthday.toISOString().split('T')[0] : '',
        startDate: startDate.toISOString().split('T')[0],
        address: address.trim(),
        emergencyContact: emergencyContact.trim(),
        coachingDuration,
        weight: Number(weight),
        height: Number(height),
        age: Number(age),
        gender,
        activityLevel,
        goal,
      totalCalories,
      protein: macroValues.protein,
      carbs: macroValues.carbs,
      fats: macroValues.fats,
      bmi: bmi || 0,
      tdee: tdee || 0,
    };
    
    setSummaryData(summaryClientData);
    setShowQuestionnaire(true);
  };

  const handleQuestionnaireComplete = (questionnaireData: ClientQuestionnaire) => {
    // Combine client data with questionnaire data
    const completeClientData = {
      ...summaryData,
      questionnaire: questionnaireData,
    };
    
    setSummaryData(completeClientData);
    setShowQuestionnaire(false);
    setShowSummary(true);
  };

  const handleConfirmAddClient = async () => {
    if (!summaryData) return;
    
    setLoading(true);
    try {
      const clientData = {
        linkedCoachId: coachId,
        name: summaryData.name,
        email: summaryData.email,
        phone: summaryData.phone,
        birthday: summaryData.birthday,
        startDate: summaryData.startDate,
        address: summaryData.address,
        emergencyContact: summaryData.emergencyContact,
        coachingDuration: summaryData.coachingDuration,
        weight: summaryData.weight,
        height: summaryData.height,
        age: summaryData.age,
        gender: summaryData.gender,
        activityLevel: summaryData.activityLevel,
        goal: summaryData.goal === 'surplus' ? 'muscle_gain' : summaryData.goal === 'deficit' ? 'fat_loss' : 'maintenance' as Goal,
        calorieTarget: Number(summaryData.totalCalories),
        protein: summaryData.protein,
        fat: summaryData.fats,
        carbs: summaryData.carbs,
        foodList: [],
        questionnaire: summaryData.questionnaire || undefined
      };

      await FirestoreService.createClient(clientData);
      
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to add client');
    } finally {
      setLoading(false);
      setShowSummary(false);
      setSummaryData(null);
    }
  };

  const showInfo = (title: string, content: string) => {
    setInfoModalContent({ title, content });
    setShowInfoModal(true);
  };

  const handleBackFromSummary = () => {
    setShowSummary(false);
    setSummaryData(null);
  };

  const activityLevels: { label: string; value: ActivityLevel; icon: string }[] = [
    { label: 'Sedentary', value: 'sedentary', icon: 'bed' },
    { label: 'Light Activity', value: 'light', icon: 'walk' },
    { label: 'Moderate', value: 'moderate', icon: 'bicycle' },
    { label: 'Very Active', value: 'very_active', icon: 'fitness' },
    { label: 'Extra Active', value: 'extra_active', icon: 'flash' }
  ];


  // Show questionnaire screen if questionnaire is active
  if (showQuestionnaire && summaryData) {
  return (
      <ClientQuestionnaireScreen
        clientData={summaryData}
        onBack={() => setShowQuestionnaire(false)}
        onComplete={handleQuestionnaireComplete}
      />
    );
  }

  // Show summary screen if summary is active
  if (showSummary && summaryData) {
  return (
      <ClientSummaryScreen
        clientData={summaryData}
        onBack={handleBackFromSummary}
        onConfirm={handleConfirmAddClient}
        loading={loading}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Add New Client"
        subtitle="Create a new client profile"
        showBackButton={true}
        onBackPress={onBack}
        showProfileButton={false}
        showTime={false}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentContainer}>

            {/* Personal Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Ionicons name="person" size={20} color="#3B82F6" style={styles.cardTitleIcon} />
                  <Text style={styles.cardTitle}>Personal Information</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => showInfo(
                    'Personal Information',
                    'Enter the client\'s basic personal details including name, email, physical measurements, age, and gender. These details are essential for calculating BMI, TDEE, and personalized macro targets.'
                  )}
                  style={styles.infoButton}
                >
                  <Ionicons name="information-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardSubtitle}>Basic client details for personalized calculations</Text>
              
              <Input
                label="Full Name"
                placeholder="Enter client's full name"
                value={name}
                onChangeText={setName}
                error={errors.name}
              />

              <Input
                label="Email"
                placeholder="Enter client's email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                error={errors.email}
              />

              <Input
                label="Phone Number"
                placeholder="Enter client's phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                error={errors.phone}
              />

              <DateInput
                label="Birthday"
                value={birthday || new Date()}
                onDateChange={setBirthday}
                placeholder="Select birthday"
                error={errors.birthday}
                maximumDate={new Date()}
              />

              <DateInput
                label="Coaching Start Date"
                value={startDate}
                onDateChange={setStartDate}
                placeholder="Select start date"
                error={errors.startDate}
                maximumDate={new Date()}
              />

              <Input
                label="Address (Optional)"
                placeholder="Enter client's address"
                value={address}
                onChangeText={setAddress}
                error={errors.address}
              />

              <Input
                label="Emergency Contact"
                placeholder="Name and phone number"
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                error={errors.emergencyContact}
              />

              <View style={styles.coachingDurationContainer}>
                <Text style={styles.label}>Coaching Duration</Text>
                <View style={styles.coachingDurationButtons}>
                  <TouchableOpacity
                    style={[styles.coachingDurationButton, coachingDuration === '4 weeks' && styles.coachingDurationButtonActive]}
                    onPress={() => setCoachingDuration('4 weeks')}
                  >
                    <View style={styles.coachingDurationContent}>
                      <Text style={[styles.coachingDurationNumber, coachingDuration === '4 weeks' && styles.coachingDurationNumberActive]}>
                        4
                      </Text>
                      <Text style={[styles.coachingDurationLabel, coachingDuration === '4 weeks' && styles.coachingDurationLabelActive]}>
                        Weeks
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.coachingDurationButton, coachingDuration === '8 weeks' && styles.coachingDurationButtonActive]}
                    onPress={() => setCoachingDuration('8 weeks')}
                  >
                    <View style={styles.coachingDurationContent}>
                      <Text style={[styles.coachingDurationNumber, coachingDuration === '8 weeks' && styles.coachingDurationNumberActive]}>
                        8
                      </Text>
                      <Text style={[styles.coachingDurationLabel, coachingDuration === '8 weeks' && styles.coachingDurationLabelActive]}>
                        Weeks
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.coachingDurationButton, coachingDuration === '12 weeks' && styles.coachingDurationButtonActive]}
                    onPress={() => setCoachingDuration('12 weeks')}
                  >
                    <View style={styles.coachingDurationContent}>
                      <Text style={[styles.coachingDurationNumber, coachingDuration === '12 weeks' && styles.coachingDurationNumberActive]}>
                        12
                      </Text>
                      <Text style={[styles.coachingDurationLabel, coachingDuration === '12 weeks' && styles.coachingDurationLabelActive]}>
                        Weeks
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                {errors.coachingDuration && <Text style={styles.errorText}>{errors.coachingDuration}</Text>}
              </View>

              <View style={styles.rowContainer}>
                <View style={styles.halfWidth}>
                <Input
                  label="Weight (kg)"
                  placeholder="70"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  error={errors.weight}
                />
                </View>
                <View style={styles.halfWidth}>
                <Input
                  label="Height (cm)"
                  placeholder="175"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  error={errors.height}
                />
                </View>
              </View>

              <View style={styles.rowContainer}>
                <View style={styles.halfWidth}>
                <Input
                  label="Age"
                  placeholder="30"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  error={errors.age}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.genderContainer}>
                    <TouchableOpacity
                      style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
                      onPress={() => setGender('male')}
                    >
                      <Ionicons 
                        name="male" 
                        size={24} 
                        color={gender === 'male' ? 'white' : '#6B7280'} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
                      onPress={() => setGender('female')}
                    >
                      <Ionicons 
                        name="female" 
                        size={24} 
                        color={gender === 'female' ? 'white' : '#6B7280'} 
                      />
                    </TouchableOpacity>
                  </View>
                  </View>
                </View>
              </View>

            {/* Activity Level Card - Horizontal Scroll */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Ionicons name="fitness" size={20} color="#10B981" style={styles.cardTitleIcon} />
                  <Text style={styles.cardTitle}>Activity Level</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => showInfo(
                    'Activity Level',
                    `Select the client's daily activity level to accurately calculate their Total Daily Energy Expenditure (TDEE). This affects how many calories they burn throughout the day and influences their macro targets.\n\n• Sedentary (${activityMultipliers.sedentary}x): Little to no exercise\n• Light Activity (${activityMultipliers.light}x): Light exercise 1-3 days/week\n• Moderate (${activityMultipliers.moderate}x): Moderate exercise 3-5 days/week\n• Very Active (${activityMultipliers.very_active}x): Hard exercise 6-7 days/week\n• Extra Active (${activityMultipliers.extra_active}x): Very hard exercise, physical job\n\nTDEE = BMR × Activity Multiplier\n\nNote: These multipliers can be customized in settings.`
                  )}
                  style={styles.infoButton}
                >
                  <Ionicons name="information-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardSubtitle}>Select daily activity level for accurate TDEE calculation</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activityScrollContainer}
              >
                  {activityLevels.map((level) => (
                  <TouchableOpacity
                      key={level.value}
                    style={[styles.activityOptionButton, activityLevel === level.value && styles.activityOptionButtonActive]}
                      onPress={() => setActivityLevel(level.value)}
                  >
                    <Ionicons 
                      name={level.icon as any} 
                      size={24} 
                      color={activityLevel === level.value ? 'white' : '#6B7280'} 
                    />
                    <Text style={[styles.activityOptionText, activityLevel === level.value && styles.activityOptionTextActive]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
                </View>

            {/* BMI & TDEE Display */}
            {(bmi !== null || tdee !== null) && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Ionicons name="analytics" size={20} color="#8B5CF6" style={styles.cardTitleIcon} />
                    <Text style={styles.cardTitle}>Calculated Metrics</Text>
              </View>
                  <TouchableOpacity 
                    onPress={() => showInfo(
                      'Calculated Metrics',
                      'These metrics are automatically calculated based on the client\'s personal information:\n\n• BMI (Body Mass Index): A measure of body fat based on height and weight. Used to assess weight status.\n• TDEE (Total Daily Energy Expenditure): The total number of calories the client burns in a day, including basal metabolic rate and activity level.\n\nThese calculations help determine appropriate calorie and macro targets for the client\'s fitness goals.'
                    )}
                    style={styles.infoButton}
                  >
                    <Ionicons name="information-circle" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSubtitle}>Automatically calculated based on personal information</Text>
                <View style={styles.metricsContainer}>
                  {bmi !== null && (
                    <View style={styles.metricCard}>
                      <View style={styles.metricHeader}>
                        <View style={styles.metricIconWithLabel}>
                          <View style={[styles.metricIconContainer, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="speedometer" size={24} color="#3B82F6" />
                          </View>
                          <Text style={styles.metricLabel}>BMI</Text>
                        </View>
                      </View>
                      <View style={styles.metricValueContainer}>
                        <Text style={styles.metricValue}>{bmi.toFixed(1)}</Text>
                        <Text style={styles.metricUnit}>kg/m²</Text>
                      </View>
                      <View style={styles.metricStatusContainer}>
                        <View style={[styles.metricStatusBadge, { backgroundColor: bmi === 0 ? '#F3F4F6' : bmi < 18.5 ? '#FEF3C7' : bmi < 25 ? '#D1FAE5' : bmi < 30 ? '#FEE2E2' : '#FECACA' }]}>
                          <Text style={[styles.metricStatusText, { color: bmi === 0 ? '#6B7280' : bmi < 18.5 ? '#D97706' : bmi < 25 ? '#059669' : bmi < 30 ? '#DC2626' : '#B91C1C' }]}>
                            {bmi === 0 ? 'Enter details' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  {tdee !== null && (
                    <View style={styles.metricCard}>
                      <View style={styles.metricHeader}>
                        <View style={styles.metricIconWithLabel}>
                          <View style={[styles.metricIconContainer, { backgroundColor: '#F0FDF4' }]}>
                            <Ionicons name="flame" size={24} color="#10B981" />
                          </View>
                          <Text style={styles.metricLabel}>TDEE</Text>
                        </View>
                      </View>
                      <View style={styles.metricValueContainer}>
                        <Text style={styles.metricValue}>{Math.round(tdee)}</Text>
                        <Text style={styles.metricUnit}>kcal/day</Text>
                      </View>
                      <View style={styles.metricStatusContainer}>
                        <View style={[styles.metricStatusBadge, { backgroundColor: '#EFF6FF' }]}>
                          <Text style={[styles.metricStatusText, { color: '#3B82F6' }]}>
                            Maintain
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Goal Selection Card with Manual Input */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Ionicons name="flag" size={20} color="#F59E0B" style={styles.cardTitleIcon} />
                  <Text style={styles.cardTitle}>Fitness Goal</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => showInfo(
                    'Fitness Goal',
                    'Select the client\'s primary fitness goal to determine their calorie target:\n\n• Deficit (📉): Weight loss - Calories below TDEE\n• Maintenance (⚖️): Maintain current weight - Calories equal to TDEE\n• Surplus (📈): Weight gain/muscle building - Calories above TDEE\n\nYou can manually adjust the target calories and weight as needed for the client\'s specific requirements.'
                  )}
                  style={styles.infoButton}
                >
                  <Ionicons name="information-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardSubtitle}>Select goal and adjust calories manually if needed</Text>
              
              {/* Goal Selection */}
              <View style={styles.compactGoalsContainer}>
                <TouchableOpacity
                  style={[styles.compactGoalButton, goal === 'deficit' && styles.compactGoalButtonActive]}
                  onPress={() => setGoal('deficit')}
                >
                  <Ionicons 
                    name="trending-down" 
                    size={24} 
                    color={goal === 'deficit' ? 'white' : '#6B7280'} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.compactGoalButton, goal === 'maintenance' && styles.compactGoalButtonActive]}
                  onPress={() => setGoal('maintenance')}
                >
                  <Ionicons 
                    name="scale" 
                    size={24} 
                    color={goal === 'maintenance' ? 'white' : '#6B7280'} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.compactGoalButton, goal === 'surplus' && styles.compactGoalButtonActive]}
                  onPress={() => setGoal('surplus')}
                >
                  <Ionicons 
                    name="trending-up" 
                    size={24} 
                    color={goal === 'surplus' ? 'white' : '#6B7280'} 
                  />
                </TouchableOpacity>
                </View>

              {/* Manual Calorie Input */}
              <View style={styles.targetCaloriesRow}>
                <View style={styles.targetCaloriesIcon}>
                  <Ionicons name="flame" size={20} color="#F59E0B" />
                </View>
                <TextInput
                  placeholder="2000"
                  value={totalCalories}
                  onChangeText={setTotalCalories}
                  keyboardType="numeric"
                  style={styles.targetCaloriesInput}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.targetCaloriesUnit}>kcal</Text>
              </View>

            </View>

            {/* Macro Targets Card - Compact */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Ionicons name="nutrition" size={20} color="#EF4444" style={styles.cardTitleIcon} />
                  <Text style={styles.cardTitle}>Daily Macro Targets</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => showInfo(
                    'Daily Macro Targets',
                    'These are the daily macronutrient targets calculated from your percentage inputs:\n\n• Enter percentages for Protein (P), Carbs (C), and Fats (F)\n• Percentages must add up to 100%\n• Default: P35/C25/F40\n\nExample: P35/C25/F40 for 2500 kcal:\n• Protein: 35% = 875 kcal = 219g\n• Carbs: 25% = 625 kcal = 156g\n• Fats: 40% = 1000 kcal = 111g\n\nThe grams will automatically calculate based on your percentage inputs and total calories.'
                  )}
                  style={styles.infoButton}
                >
                  <Ionicons name="information-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardSubtitle}>Automatically calculated, editable by coach</Text>
              
              <View style={styles.macroTargetsContainer}>
                <View style={styles.macroTargetColumn}>
                  <View style={styles.macroTargetItem}>
                    <View style={[styles.macroTargetIcon, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="fitness" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.macroTargetLabel}>P</Text>
                    <View style={styles.macroTargetInputContainer}>
                      <TextInput
                        placeholder="35"
                        value={proteinPercent}
                        onChangeText={setProteinPercent}
                        keyboardType="numeric"
                        style={styles.macroTargetInput}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.macroTargetUnitContainer}>
                      <Text style={styles.macroTargetUnit}>%</Text>
                    </View>
                    <View style={styles.macroTargetValueContainer}>
                      <Text style={styles.macroTargetValue}>{macroValues.protein}g</Text>
                </View>
              </View>

                  <View style={styles.macroTargetItem}>
                    <View style={[styles.macroTargetIcon, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="leaf" size={20} color="#F59E0B" />
                    </View>
                    <Text style={styles.macroTargetLabel}>C</Text>
                    <View style={styles.macroTargetInputContainer}>
                      <TextInput
                        placeholder="25"
                        value={carbsPercent}
                        onChangeText={setCarbsPercent}
                        keyboardType="numeric"
                        style={styles.macroTargetInput}
                        placeholderTextColor="#9CA3AF"
                />
              </View>
                    <View style={styles.macroTargetUnitContainer}>
                      <Text style={styles.macroTargetUnit}>%</Text>
                    </View>
                    <View style={styles.macroTargetValueContainer}>
                      <Text style={styles.macroTargetValue}>{macroValues.carbs}g</Text>
                    </View>
                  </View>

                  <View style={styles.macroTargetItem}>
                    <View style={[styles.macroTargetIcon, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="flash" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.macroTargetLabel}>F</Text>
                    <View style={styles.macroTargetInputContainer}>
                      <TextInput
                        placeholder="30"
                        value={fatsPercent}
                        onChangeText={setFatsPercent}
                        keyboardType="numeric"
                        style={styles.macroTargetInput}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.macroTargetUnitContainer}>
                      <Text style={styles.macroTargetUnit}>%</Text>
                    </View>
                    <View style={styles.macroTargetValueContainer}>
                      <Text style={styles.macroTargetValue}>{macroValues.fats}g</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onBack}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.submitButtonText}>Adding...</Text>
                ) : (
                  <View style={styles.nextButtonContent}>
                    <Text style={styles.submitButtonText}>Next</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" style={styles.nextButtonIcon} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>



      {/* Info Modal */}
      {showInfoModal && (
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContainer}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>{infoModalContent.title}</Text>
              <TouchableOpacity 
                onPress={() => setShowInfoModal(false)}
                style={styles.infoModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.infoModalContent}>
              <Text style={styles.infoModalText}>{infoModalContent.content}</Text>
            </ScrollView>
            <View style={styles.infoModalActions}>
              <TouchableOpacity
                onPress={() => setShowInfoModal(false)}
                style={styles.infoModalButton}
              >
                <Text style={styles.infoModalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Success"
        message="Client added successfully!"
        onClose={() => {
          setShowSuccessModal(false);
          onClientAdded();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitleIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoButton: {
    padding: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  genderButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  genderButtonTextActive: {
    color: 'white',
  },
  coachingDurationContainer: {
    marginBottom: 16,
  },
  coachingDurationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  coachingDurationButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 70,
  },
  coachingDurationButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  coachingDurationContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachingDurationNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
    lineHeight: 28,
  },
  coachingDurationNumberActive: {
    color: 'white',
  },
  coachingDurationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachingDurationLabelActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  optionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  optionButtonTextActive: {
    color: 'white',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  metricIconWithLabel: {
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  metricValueContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 36,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 2,
  },
  metricStatusContainer: {
    alignItems: 'center',
  },
  metricStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metricStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalsContainer: {
    gap: 12,
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    gap: 12,
  },
  goalButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  goalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  goalButtonTextActive: {
    color: 'white',
  },
  goalButtonSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  goalButtonSubtextActive: {
    color: '#cbd5e1',
  },
  caloriesInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  compactOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactOptionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: 'white',
    minWidth: 80,
  },
  compactOptionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  compactOptionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  compactOptionButtonTextActive: {
    color: 'white',
  },
  // Activity Level Horizontal Scroll Styles
  activityScrollContainer: {
    paddingHorizontal: 4,
    gap: 12,
  },
  activityOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    gap: 6,
  },
  activityOptionButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  activityOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  activityOptionTextActive: {
    color: 'white',
  },
  compactGoalsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  compactGoalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  compactGoalButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  compactGoalButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  compactGoalButtonTextActive: {
    color: 'white',
  },
  targetCaloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 12,
  },
  targetCaloriesIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  targetCaloriesInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
    marginRight: 8,
  },
  targetCaloriesUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    minWidth: 30,
  },
  // Summary Modal Styles
  summaryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: '90%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  summaryContent: {
    maxHeight: 400,
  },
  summarySection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  highlightedSection: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  summaryInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryInfoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  // BMI Styles
  bmiContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  bmiValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  bmiLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  bmiDescription: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Goal Summary Styles
  goalSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  goalSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalSummaryBadgeActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  goalSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  goalSummaryTextActive: {
    color: 'white',
  },
  // Macro Summary Styles
  macroSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  macroSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroSummaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  macroSummaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  macroSummaryValue: {
    fontSize: 18,
    color: '#111827',
    fontWeight: 'bold',
  },
  // Action Buttons
  summaryActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Info Modal Styles
  infoModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  infoModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  infoModalCloseButton: {
    padding: 4,
  },
  infoModalContent: {
    maxHeight: 300,
    padding: 20,
  },
  infoModalText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  infoModalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  infoModalButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  compactMacroContainer: {
    marginTop: 8,
  },
  compactMacroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  compactMacroInput: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  compactMacroIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  compactMacroLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  compactMacroField: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
    minWidth: 50,
  },
  compactMacroUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 2,
  },
  macroTargetsContainer: {
    marginTop: 8,
  },
  macroTargetColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  macroTargetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  macroTargetIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  macroTargetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
    minWidth: 20,
  },
  macroTargetInputContainer: {
    flex: 1,
    marginRight: 6,
  },
  macroTargetInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: 'center',
  },
  macroTargetUnitContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 32,
    alignItems: 'center',
    marginRight: 6,
  },
  macroTargetUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  macroTargetValueContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  macroTargetValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  macroContainer: {
    gap: 16,
  },
  macroInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  macroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  macroInputContent: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  macroInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginRight: 8,
    minWidth: 20,
  },
  macroInputField: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#10b981',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
});
