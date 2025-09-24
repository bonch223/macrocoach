export interface User {
  id: string;
  role: 'coach' | 'client';
  email: string;
  name: string;
  createdAt: Date;
}

export interface Client {
  id: string;
  linkedCoachId: string;
  name: string;
  email: string;
  phone?: string;
  birthday?: string;
  startDate?: string;
  address?: string;
  emergencyContact?: string;
  photoUri?: string;
  coachingDuration?: '4 weeks' | '8 weeks' | '12 weeks';
  weight: number;
  height?: number;
  age?: number;
  gender?: 'male' | 'female';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  goal?: 'maintenance' | 'fat_loss' | 'muscle_gain';
  calorieTarget: number;
  protein: number; // grams
  fat: number; // grams
  carbs: number; // grams
  foodList: string[]; // Array of food IDs
  questionnaire?: ClientQuestionnaire;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientQuestionnaire {
  // Medical History
  medicalConditions: string;
  medicalConditionsDetails?: string;
  recentSurgery: string;
  medications: string;
  bloodPressure: string;
  familyHistory: string;
  
  // Injury & Pain Assessment
  currentInjuries: string;
  currentInjuriesDetails?: string;
  painDuringActivity: string;
  exercisesToAvoid: string[];
  
  // Current Fitness & Activity Level
  exerciseDaysPerWeek: string;
  typicalActivities: string[];
  weightTrainingExperience: string;
  fitnessLevel: string;
  
  // Lifestyle & Nutrition
  smokingDrinking: string;
}

export interface Food {
  id: string;
  name: string;
  protein: number; // grams per serving
  fat: number; // grams per serving
  carbs: number; // grams per serving
  kcal: number; // calories per serving
  servingSize: string; // e.g., "100g", "1 cup", "1 piece"
  createdAt: Date;
}

export interface Log {
  id: string;
  clientId: string;
  date: string; // YYYY-MM-DD format
  foods: LoggedFood[];
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalCalories: number;
  weightCheck?: number;
  notes?: string;
  createdAt: Date;
}

export interface LoggedFood {
  foodId: string;
  foodName: string;
  quantity: number; // number of servings
  protein: number; // total protein for this food
  fat: number; // total fat for this food
  carbs: number; // total carbs for this food
  calories: number; // total calories for this food
}

export interface WeeklyReport {
  clientId: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  averageCompliance: number; // percentage
  totalDaysLogged: number;
  averageWeight?: number;
  notes?: string;
}

export type UserRole = 'coach' | 'client';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
export type Goal = 'maintenance' | 'fat_loss' | 'muscle_gain';
