import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';

interface ManageFoodsScreenProps {
  onBack: () => void;
}

export const ManageFoodsScreen: React.FC<ManageFoodsScreenProps> = ({ onBack }) => {
  // Protein Sources Data
  const proteinSources = [
    { emoji: '🐔', name: 'Chicken Breast', protein: '28g', serving: '100g', fats: '6g', description: 'skinless, boneless' },
    { emoji: '🥚', name: 'Medium Egg', protein: '7g', serving: '1 piece', fats: '5g', description: '' },
    { emoji: '🦈', name: 'Salmon', protein: '27g', serving: '100g', fats: '12g', description: '' },
    { emoji: '🐄', name: 'Sirloin Beef', protein: '27g', serving: '100g', fats: '12g', description: '' },
    { emoji: '🐄', name: 'Ground Beef', protein: '18g', serving: '100g', fats: '22g', description: '' },
    { emoji: '🦐', name: 'Shrimp', protein: '20g', serving: '100g', fats: '2g', description: '' },
    { emoji: '🍫', name: 'Whey Protein', protein: '24g', serving: '1 scoop', fats: '0g', description: '' },
  ];

  // Carbohydrates Data
  const carbohydrates = [
    { emoji: '🥦', name: 'Broccoli', carbs: '4g', serving: '50g', description: 'daily recommended' },
    { emoji: '🍍', name: 'Pineapple', carbs: '43g', serving: '330g', description: 'daily recommended' },
    { emoji: '🥭', name: 'Papaya', carbs: '10.4g', serving: '150g', description: 'daily recommended' },
    { emoji: '🍚', name: 'White Rice', carbs: '26g', serving: '100g', description: '' },
    { emoji: '🍘', name: 'Brown Rice', carbs: '23g', serving: '100g', description: '' },
    { emoji: '🥔', name: 'Kamote', carbs: '20g', serving: '100g', description: '' },
    { emoji: '🥣', name: 'Oats (Raw)', carbs: '68g', serving: '100g', description: '' },
  ];

  // Fats Data
  const fats = [
    { emoji: '🪔', name: 'Olive Oil', fats: '14g', serving: '1 tbsp', description: '2 tbsp recommended daily' },
    { emoji: '🧈', name: 'Butter', fats: '12g', serving: '14g', description: '' },
  ];

  const renderFoodCard = (item: any, type: 'protein' | 'carbs' | 'fats') => {
    const getMacroValue = () => {
      switch (type) {
        case 'protein':
          return item.protein;
        case 'carbs':
          return item.carbs;
        case 'fats':
          return item.fats;
        default:
          return '';
      }
    };

    const getMacroColor = () => {
      switch (type) {
        case 'protein':
          return '#3B82F6';
        case 'carbs':
          return '#10B981';
        case 'fats':
          return '#F59E0B';
        default:
          return '#6B7280';
      }
    };

    return (
      <View key={item.name} style={styles.foodCard}>
        <View style={styles.foodCardHeader}>
          <View style={styles.foodEmoji}>
            <Text style={styles.emojiText}>{item.emoji}</Text>
          </View>
          <View style={styles.foodInfo}>
            <Text style={styles.foodName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.foodDescription}>{item.description}</Text>
            )}
          </View>
          <View style={[styles.macroBadge, { backgroundColor: getMacroColor() + '15' }]}>
            <Text style={[styles.macroValue, { color: getMacroColor() }]}>
              {getMacroValue()}
            </Text>
          </View>
        </View>
        <View style={styles.foodCardFooter}>
          <Text style={styles.servingText}>Serving: {item.serving}</Text>
          {item.fats && type === 'protein' && (
            <Text style={styles.fatsText}>Fats: {item.fats}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Foods"
        subtitle="Macro nutrition guide"
        showBackButton={true}
        onBackPress={onBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Protein Sources Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EBF8FF' }]}>
              <Ionicons name="fitness" size={20} color="#3B82F6" />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Protein Sources</Text>
              <Text style={styles.sectionSubtitle}>High-quality protein options</Text>
            </View>
          </View>
          
          <View style={styles.foodsGrid}>
            {proteinSources.map((item) => renderFoodCard(item, 'protein'))}
          </View>
        </View>

        {/* Carbohydrates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="leaf" size={20} color="#10B981" />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Carbohydrates</Text>
              <Text style={styles.sectionSubtitle}>Energy sources and fiber</Text>
            </View>
          </View>
          
          <View style={styles.foodsGrid}>
            {carbohydrates.map((item) => renderFoodCard(item, 'carbs'))}
          </View>
        </View>

        {/* Fats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="water" size={20} color="#F59E0B" />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Healthy Fats</Text>
              <Text style={styles.sectionSubtitle}>Essential fatty acids</Text>
            </View>
          </View>
          
          <View style={styles.foodsGrid}>
            {fats.map((item) => renderFoodCard(item, 'fats'))}
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color="#8B5CF6" />
            <Text style={styles.tipsTitle}>Nutrition Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Aim for 1.6-2.2g protein per kg body weight</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Include 2 tbsp olive oil daily for healthy fats</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Choose complex carbs like brown rice and oats</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Eat colorful vegetables for micronutrients</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  foodsGrid: {
    gap: 12,
  },
  foodCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emojiText: {
    fontSize: 24,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  foodDescription: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  macroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  foodCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  servingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  fatsText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  tipsSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 12,
    letterSpacing: -0.2,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '700',
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    fontWeight: '500',
  },
});