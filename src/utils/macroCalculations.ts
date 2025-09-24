import { ActivityLevel, Goal } from '../types';

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 */
export const calculateBMR = (
  weight: number, // in kg
  height: number, // in cm
  age: number,
  gender: 'male' | 'female'
): number => {
  if (gender === 'male') {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    return (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
};

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 */
export const calculateTDEE = (bmr: number, activityLevel: ActivityLevel): number => {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };
  
  return Math.round(bmr * multipliers[activityLevel]);
};

/**
 * Adjust TDEE based on goal
 */
export const adjustForGoal = (tdee: number, goal: Goal): number => {
  switch (goal) {
    case 'fat_loss':
      return Math.round(tdee - 500); // 500 calorie deficit
    case 'muscle_gain':
      return Math.round(tdee + 500); // 500 calorie surplus
    case 'maintenance':
    default:
      return tdee;
  }
};

/**
 * Calculate macro targets based on calorie target
 * Default ratios: 25% protein, 30% fat, 45% carbs
 */
export const calculateMacroTargets = (
  calorieTarget: number,
  customRatios?: {
    proteinPercent?: number;
    fatPercent?: number;
    carbPercent?: number;
  }
) => {
  const proteinPercent = customRatios?.proteinPercent || 25;
  const fatPercent = customRatios?.fatPercent || 30;
  const carbPercent = customRatios?.carbPercent || 45;

  // Ensure percentages add up to 100
  const total = proteinPercent + fatPercent + carbPercent;
  const normalizedProtein = proteinPercent / total;
  const normalizedFat = fatPercent / total;
  const normalizedCarb = carbPercent / total;

  const protein = Math.round((calorieTarget * normalizedProtein) / 4); // 4 cal/g
  const fat = Math.round((calorieTarget * normalizedFat) / 9); // 9 cal/g
  const carbs = Math.round((calorieTarget * normalizedCarb) / 4); // 4 cal/g

  return {
    protein,
    fat,
    carbs,
    calories: calorieTarget
  };
};

/**
 * Calculate complete macro targets from user data
 */
export const calculateCompleteMacroTargets = (
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female',
  activityLevel: ActivityLevel,
  goal: Goal,
  customRatios?: {
    proteinPercent?: number;
    fatPercent?: number;
    carbPercent?: number;
  }
) => {
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const calorieTarget = adjustForGoal(tdee, goal);
  const macros = calculateMacroTargets(calorieTarget, customRatios);

  return {
    bmr: Math.round(bmr),
    tdee,
    calorieTarget,
    ...macros
  };
};
