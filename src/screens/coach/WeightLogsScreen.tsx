import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Header } from '../../components/Header';
import { DateInput } from '../../components/DateInput';
import { WeightChart } from '../../components/WeightChart';
import { FirestoreService } from '../../services/firestoreService';
import { UnifiedPhotoService } from '../../services/unifiedPhotoService';

interface WeightLogsScreenProps {
  clientData: {
    id: string;
    name: string;
    weight: number;
    goal?: 'maintenance' | 'fat_loss' | 'muscle_gain';
  };
  onBack: () => void;
  onDataChanged?: () => void;
}

interface WeightEntry {
  id: string;
  weight: number;
  date: Date;
  notes?: string;
  createdAt: Date;
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

export const WeightLogsScreen: React.FC<WeightLogsScreenProps> = ({
  clientData,
  onBack,
  onDataChanged,
}) => {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWeightModal, setShowAddWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightNotes, setNewWeightNotes] = useState('');
  const [newWeightDate, setNewWeightDate] = useState<Date>(new Date());
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newWeightPhoto, setNewWeightPhoto] = useState<string | null>(null);
  const [editWeightPhoto, setEditWeightPhoto] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  // Load weight entries
  useEffect(() => {
    loadWeightEntries();
  }, [clientData.id]);

  // Image compression helper with aggressive optimization
  const compressImage = async (uri: string): Promise<string> => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 300, height: 300 } }], // Smaller size for better compression
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // 50% quality for smaller file size
      );
      return result.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri;
    }
  };

  // Photo capture functions
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (showEditModal) {
          setEditWeightPhoto(result.assets[0].uri);
        } else {
          setNewWeightPhoto(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSelectPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library permissions.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (showEditModal) {
          setEditWeightPhoto(result.assets[0].uri);
        } else {
          setNewWeightPhoto(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleClearLogs = async () => {
    try {
      setLoading(true);
      await FirestoreService.clearWeightEntries(clientData.id);
      await loadWeightEntries();
      setShowClearModal(false);
      Alert.alert('Success', 'All weight logs have been cleared!');
    } catch (error) {
      console.error('Error clearing logs:', error);
      Alert.alert('Error', 'Failed to clear weight logs');
    } finally {
      setLoading(false);
    }
  };

  const loadWeightEntries = async () => {
    try {
      setLoading(true);
      const entries = await FirestoreService.getWeightEntries(clientData.id);
      setWeightEntries(entries);
    } catch (error) {
      console.error('Error loading weight entries:', error);
      Alert.alert('Error', 'Failed to load weight entries');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async () => {
    if (!newWeight.trim()) {
      Alert.alert('Error', 'Please enter a weight value');
      return;
    }

    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    try {
      setLoading(true);
      
      // Upload photo to Firebase Storage if provided
      let photoUri = undefined;
      if (newWeightPhoto) {
        const compressedPhotoUri = await compressImage(newWeightPhoto);
        const photoId = await UnifiedPhotoService.uploadPhoto(
          compressedPhotoUri,
          clientData.id,
          'weight'
        );
        photoUri = await UnifiedPhotoService.getPhoto(photoId);
      }
      
      await FirestoreService.addWeightEntry(
        clientData.id,
        weight,
        newWeightNotes.trim() || undefined,
        photoUri,
        newWeightDate
      );
      
      await loadWeightEntries();
      
      setNewWeight('');
      setNewWeightNotes('');
      setNewWeightDate(new Date());
      setNewWeightPhoto(null);
      setShowAddWeightModal(false);
      
      // Notify parent that data has changed
      if (onDataChanged) {
        onDataChanged();
      }
      
      Alert.alert('Success', 'Weight entry added successfully!');
    } catch (error) {
      console.error('Error adding weight entry:', error);
      Alert.alert('Error', 'Failed to add weight entry');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEntry = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setNewWeight(entry.weight.toString());
    setNewWeightNotes(entry.notes || '');
    setNewWeightDate(entry.date);
    setEditWeightPhoto(entry.photoUri || null);
    setShowEditModal(true);
  };

  const handleUpdateWeight = async () => {
    if (!newWeight.trim() || !editingEntry) {
      Alert.alert('Error', 'Please enter a weight value');
      return;
    }

    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    try {
      setLoading(true);
      
      // Upload photo to Firebase Storage if provided
      let photoId = undefined;
      if (editWeightPhoto) {
        const compressedPhotoUri = await compressImage(editWeightPhoto);
        photoId = await UnifiedPhotoService.uploadPhoto(
          compressedPhotoUri,
          clientData.id,
          'weight'
        );
      }
      
      await FirestoreService.updateWeightEntry(
        editingEntry.id,
        weight,
        newWeightNotes.trim() || undefined,
        newWeightDate,
        photoId
      );
      
      await loadWeightEntries();
      
      setNewWeight('');
      setNewWeightNotes('');
      setNewWeightDate(new Date());
      setEditWeightPhoto(null);
      setEditingEntry(null);
      setShowEditModal(false);
      
      // Notify parent that data has changed
      if (onDataChanged) {
        onDataChanged();
      }
      
      Alert.alert('Success', 'Weight entry updated successfully!');
    } catch (error) {
      console.error('Error updating weight entry:', error);
      Alert.alert('Error', 'Failed to update weight entry');
    } finally {
      setLoading(false);
    }
  };

  const getWeightChange = () => {
    if (weightEntries.length < 2) return 0;
    const latest = weightEntries[0].weight;
    const previous = weightEntries[1].weight;
    return latest - previous;
  };

  const getTotalWeightChange = () => {
    if (weightEntries.length < 2) return 0;
    const latest = weightEntries[0].weight;
    const oldest = weightEntries[weightEntries.length - 1].weight;
    return latest - oldest;
  };

  const getAverageWeight = () => {
    if (weightEntries.length === 0) return 0;
    const sum = weightEntries.reduce((acc, entry) => acc + entry.weight, 0);
    return sum / weightEntries.length;
  };

  const getGoalProgress = () => {
    if (!clientData.goal || weightEntries.length === 0) return null;
    
    const currentWeight = weightEntries[0].weight;
    const initialWeight = weightEntries[weightEntries.length - 1].weight;
    
    if (clientData.goal === 'fat_loss') {
      const targetLoss = initialWeight * 0.1; // 10% weight loss goal
      const actualLoss = initialWeight - currentWeight;
      return Math.min((actualLoss / targetLoss) * 100, 100);
    } else if (clientData.goal === 'muscle_gain') {
      const targetGain = initialWeight * 0.05; // 5% weight gain goal
      const actualGain = currentWeight - initialWeight;
      return Math.min((actualGain / targetGain) * 100, 100);
    }
    
    return null;
  };


  const renderWeightEntry = (entry: WeightEntry, index: number) => {
    const weightChange = index < weightEntries.length - 1 
      ? entry.weight - weightEntries[index + 1].weight 
      : 0;

    return (
      <View key={entry.id} style={styles.weightEntryCard}>
        <View style={styles.weightEntryHeader}>
          <View style={styles.weightEntryDate}>
            <Ionicons name="calendar" size={16} color="#6B7280" />
            <Text style={styles.weightEntryDateText}>
              {entry.date instanceof Date 
                ? entry.date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : new Date(entry.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
              }
            </Text>
          </View>
          <View style={styles.weightEntryActions}>
            {weightChange !== 0 && (
              <View style={[
                styles.weightChangeBadge,
                { backgroundColor: weightChange < 0 ? '#D1FAE5' : '#FEE2E2' }
              ]}>
                <Ionicons
                  name={weightChange < 0 ? "trending-down" : "trending-up"}
                  size={12}
                  color={weightChange < 0 ? '#059669' : '#DC2626'}
                />
                <Text style={[
                  styles.weightChangeText,
                  { color: weightChange < 0 ? '#059669' : '#DC2626' }
                ]}>
                  {Math.abs(weightChange).toFixed(1)} kg
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditEntry(entry)}
            >
              <Ionicons name="create-outline" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.weightEntryContent}>
          <Text style={styles.weightValue}>{entry.weight.toFixed(1)} kg</Text>
          {entry.notes && (
            <Text style={styles.weightNotes}>{entry.notes}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title="Weight Logs"
          subtitle={`${clientData.name}'s weight tracking`}
          showBackButton={true}
          onBackPress={onBack}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading weight data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Weight Logs"
        subtitle={`${clientData.name}'s weight tracking`}
        showBackButton={true}
        onBackPress={onBack}
      />
      
      {/* Clear Logs Button */}
      {weightEntries.length > 0 && (
        <View style={styles.clearButtonContainer}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setShowClearModal(true)}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.clearButtonText}>Clear All Logs</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#EBF8FF' }]}>
              <Ionicons name="scale" size={24} color="#3B82F6" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Current Weight</Text>
              <Text style={styles.summaryValue}>
                {weightEntries.length > 0 ? weightEntries[0].weight.toFixed(1) : clientData.weight.toFixed(1)} kg
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Total Change</Text>
              <Text style={[
                styles.summaryValue,
                { color: getTotalWeightChange() < 0 ? '#10B981' : getTotalWeightChange() > 0 ? '#EF4444' : '#6B7280' }
              ]}>
                {getTotalWeightChange() > 0 ? '+' : ''}{getTotalWeightChange().toFixed(1)} kg
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="analytics" size={24} color="#F59E0B" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Average</Text>
              <Text style={styles.summaryValue}>{getAverageWeight().toFixed(1)} kg</Text>
            </View>
          </View>

          {getGoalProgress() !== null && (
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="flag" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Goal Progress</Text>
                <Text style={styles.summaryValue}>{getGoalProgress()?.toFixed(0)}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bar-chart" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Weight Trend</Text>
          </View>
          
          <WeightChart 
            data={weightEntries}
            width={screenWidth - 80} // Account for container padding
            height={240} // Slightly taller for better visibility
          />
        </View>

        {/* Weight Entries List */}
        <View style={styles.entriesSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>All Entries ({weightEntries.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddWeightModal(true)}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {weightEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="scale-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Weight Entries</Text>
              <Text style={styles.emptyStateText}>
                Start tracking {clientData.name}'s weight progress
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowAddWeightModal(true)}
              >
                <Text style={styles.emptyStateButtonText}>Add First Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {weightEntries.map((entry, index) => renderWeightEntry(entry, index))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Weight Modal */}
      <Modal
        visible={showAddWeightModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddWeightModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Weight Entry</Text>
            <TouchableOpacity onPress={handleAddWeight}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <DateInput
                label="Date"
                value={newWeightDate}
                onDateChange={setNewWeightDate}
                placeholder="Select date"
                maximumDate={new Date()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current weight"
                value={newWeight}
                onChangeText={setNewWeight}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add coaching notes about this session..."
                value={newWeightNotes}
                onChangeText={setNewWeightNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Photo Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Progress Photo (Optional)</Text>
              <View style={styles.photoButtonsContainer}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={20} color="#3B82F6" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={handleSelectPhoto}
                >
                  <Ionicons name="images" size={20} color="#10B981" />
                  <Text style={styles.photoButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
              {newWeightPhoto && (
                <View style={styles.photoPreviewContainer}>
                  <Image 
                    source={{ uri: newWeightPhoto }} 
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setNewWeightPhoto(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Weight Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Weight Entry</Text>
            <TouchableOpacity onPress={handleUpdateWeight}>
              <Text style={styles.modalSaveButton}>Update</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <DateInput
                label="Date"
                value={newWeightDate}
                onDateChange={setNewWeightDate}
                placeholder="Select date"
                maximumDate={new Date()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current weight"
                value={newWeight}
                onChangeText={setNewWeight}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add coaching notes about this session..."
                value={newWeightNotes}
                onChangeText={setNewWeightNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Photo Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Progress Photo (Optional)</Text>
              <View style={styles.photoButtonsContainer}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={20} color="#3B82F6" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={handleSelectPhoto}
                >
                  <Ionicons name="images" size={20} color="#10B981" />
                  <Text style={styles.photoButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
              {editWeightPhoto && (
                <View style={styles.photoPreviewContainer}>
                  <Image 
                    source={{ uri: editWeightPhoto }} 
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setEditWeightPhoto(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Clear Confirmation Modal */}
      <Modal
        visible={showClearModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.clearModalContainer}>
            <View style={styles.clearModalHeader}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text style={styles.clearModalTitle}>Clear All Weight Logs</Text>
            </View>
            <Text style={styles.clearModalMessage}>
              Are you sure you want to delete all weight entries for {clientData.name}? This action cannot be undone.
            </Text>
            <View style={styles.clearModalButtons}>
              <TouchableOpacity
                style={styles.clearModalCancelButton}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={styles.clearModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearModalConfirmButton}
                onPress={handleClearLogs}
              >
                <Text style={styles.clearModalConfirmText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.08,
      radius: 8,
      elevation: 3,
    }),
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  chartSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.08,
      radius: 8,
      elevation: 3,
    }),
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
    marginLeft: 8,
    flex: 1,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entriesSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.08,
      radius: 8,
      elevation: 3,
    }),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  entriesList: {
    gap: 12,
  },
  weightEntryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  weightEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weightEntryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  weightEntryDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightEntryDateText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  weightChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  weightChangeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  weightEntryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  weightNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  photoPreviewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  clearButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  clearModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  clearModalMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  clearModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clearModalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  clearModalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  clearModalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  clearModalConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    textAlign: 'center',
  },
});
