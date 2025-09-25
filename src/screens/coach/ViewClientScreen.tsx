import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Header } from '../../components/Header';
import { DateInput } from '../../components/DateInput';
import { FirestoreService } from '../../services/firestoreService';
import { HybridLocalImgBBService } from '../../services/hybridLocalImgBBService';
import { StandalonePhotoService } from '../../services/standalonePhotoService';
import { SimpleImgBBService } from '../../services/simpleImgBBService';
import { WeightLogsScreen } from './WeightLogsScreen';


interface ViewClientScreenProps {
  clientData: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    weight: number;
    height?: number;
    age?: number;
    gender?: 'male' | 'female';
    goal?: 'maintenance' | 'fat_loss' | 'muscle_gain';
    createdAt: Date;
    startDate?: string;
    questionnaire?: {
      medicalConditions: string;
      medicalConditionsDetails?: string;
      recentSurgery: string;
      medications: string;
      bloodPressure: string;
      familyHistory: string;
      currentInjuries: string;
      currentInjuriesDetails?: string;
      painDuringActivity: string;
      exercisesToAvoid: string[];
      exerciseDaysPerWeek: string;
      typicalActivities: string[];
      weightTrainingExperience: string;
      fitnessLevel: string;
      smokingDrinking: string;
    };
  };
  onBack: () => void;
}

interface WeightEntry {
  id: string;
  date: Date;
  weight: number;
  notes?: string;
  photoUri?: string;
}


// Helper function for platform-specific shadows
const createShadowStyle = (shadowConfig: {
  color: string;
  offset: { width: number; height: number };
  opacity: number;
  radius: number;
  elevation?: number;
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
      elevation: shadowConfig.elevation || 4,
    };
  }
};

export const ViewClientScreen: React.FC<ViewClientScreenProps> = ({
  clientData,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'progress' | 'photos'>('info');
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<any[]>([]);
  const [coachNotes, setCoachNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddWeightModal, setShowAddWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightNotes, setNewWeightNotes] = useState('');
  const [newWeightDate, setNewWeightDate] = useState<Date>(new Date());
  const [newWeightPhotoUri, setNewWeightPhotoUri] = useState<string | null>(null);
  const [showWeightLogs, setShowWeightLogs] = useState(false);
  
  // Progress photo states
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoDate, setNewPhotoDate] = useState<Date>(new Date());
  const [newPhotoNotes, setNewPhotoNotes] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  

  // Load client data from database
  useEffect(() => {
    loadClientData();
    // Test ImagePicker on component mount
    testImagePicker();
  }, [clientData.id]);

  // Refresh data when returning from Weight Logs screen
  useEffect(() => {
    if (!showWeightLogs) {
      // When Weight Logs screen is closed, refresh the data
      loadClientData();
    }
  }, [showWeightLogs]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      
      // Handle client profile photo - should use ImgBB URL for web
      if (clientData.photoUri && clientData.photoUri.startsWith('file://')) {
        console.log('Local file URI detected, should use ImgBB fallback for web');
        // For web, we should have ImgBB URLs stored in the database
        // This local file URI won't work on web, so we'll fall back to initials
      }
      
      // Load weight entries
      const weightData = await FirestoreService.getWeightEntries(clientData.id);
      
      // Process weight entries with photos
      const weightDataWithPhotos = await Promise.all(
        weightData.map(async (entry: any) => {
          // If entry already has photoUri, use it
          if (entry.photoUri && entry.photoUri.trim()) {
            console.log('Weight entry already has photoUri:', entry.photoUri);
            return entry;
          }
          
          // If entry has photoId, try to get the photo
          if (entry.photoId) {
            try {
              let photoUri: string | null = null;
              
              // Try standalone service first
              try {
                photoUri = await StandalonePhotoService.getPhoto(entry.photoId);
              } catch (standaloneError) {
                console.warn('Standalone photo retrieval failed:', standaloneError);
                
                // Fallback to hybrid service
                try {
                  photoUri = await HybridLocalImgBBService.getPhoto(entry.photoId);
                } catch (hybridError) {
                  console.warn('Hybrid photo retrieval failed:', hybridError);
                }
              }
              
              if (photoUri) {
                entry.photoUri = photoUri;
                console.log('Photo loaded for weight entry:', entry.photoId);
              } else {
                console.log('No photo found for weight entry:', entry.photoId);
              }
            } catch (error) {
              console.error('Error loading photo for weight entry:', error);
            }
          }
          return entry;
        })
      );
      
      setWeightEntries(weightDataWithPhotos);
      
      // Load progress photos
      const photosData = await FirestoreService.getProgressPhotos(clientData.id);
      
      // Process progress photos with proper photo services
      const photosDataWithPhotos = await Promise.all(
        photosData.map(async (photo: any) => {
          try {
            let photoUri: string | null = null;
            
            // If photo already has uri, use it
            if (photo.uri && photo.uri.trim()) {
              photoUri = photo.uri;
            } else if (photo.base64Data) {
              // Legacy base64 support
              photoUri = `data:image/jpeg;base64,${photo.base64Data}`;
            } else {
              // Try standalone service first
              try {
                photoUri = await StandalonePhotoService.getPhoto(photo.id);
              } catch (standaloneError) {
                console.warn('Standalone progress photo retrieval failed:', standaloneError);
                
                // Fallback to hybrid service
                try {
                  photoUri = await HybridLocalImgBBService.getPhoto(photo.id);
                } catch (hybridError) {
                  console.warn('Hybrid progress photo retrieval failed:', hybridError);
                }
              }
            }
            
            return { ...photo, uri: photoUri };
          } catch (error) {
            console.error('Error loading progress photo:', error);
            return { ...photo, uri: null };
          }
        })
      );
      
      setProgressPhotos(photosDataWithPhotos);
      
      // Load coach notes
      const notesData = await FirestoreService.getCoachNotes(clientData.id);
      setCoachNotes(notesData);
      
    } catch (error) {
      console.error('Error loading client data:', error);
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: '#F59E0B' };
    if (bmi < 25) return { category: 'Normal', color: '#10B981' };
    if (bmi < 30) return { category: 'Overweight', color: '#F59E0B' };
    return { category: 'Obese', color: '#EF4444' };
  };

  const calculateBMI = () => {
    if (!clientData.height) return 0;
    const heightInMeters = clientData.height / 100;
    return clientData.weight / (heightInMeters * heightInMeters);
  };

  const getGoalDisplay = (goal?: string) => {
    if (!goal) return 'Not specified';
    switch (goal) {
      case 'fat_loss': return 'Weight Loss';
      case 'maintenance': return 'Weight Maintenance';
      case 'muscle_gain': return 'Weight Gain';
      default: return goal;
    }
  };

  const getProgressPercentage = () => {
    // For now, return a mock progress percentage
    // In a real app, this would be calculated based on goal and target weight
    return 65;
  };

  const getWeightChange = () => {
    if (weightEntries.length < 2) return 0;
    const latest = weightEntries[0].weight;
    const previous = weightEntries[1].weight;
    return latest - previous;
  };



  const handleTabChange = (tab: 'info' | 'progress' | 'photos') => {
    setActiveTab(tab);
  };

  // Image compression function
  const compressImage = async (uri: string) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }],
        { 
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      return manipResult.uri;
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

      // Handle different result structures
      if (!result.canceled) {
        if (result.assets && result.assets[0]) {
          setSelectedPhotoUri(result.assets[0].uri);
          setShowAddPhotoModal(true);
        } else if (result.uri) {
          // Fallback for older API structure
          setSelectedPhotoUri(result.uri);
          setShowAddPhotoModal(true);
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

      // Handle different result structures
      if (!result.canceled) {
        if (result.assets && result.assets[0]) {
          setSelectedPhotoUri(result.assets[0].uri);
          setShowAddPhotoModal(true);
        } else if (result.uri) {
          // Fallback for older API structure
          setSelectedPhotoUri(result.uri);
          setShowAddPhotoModal(true);
        }
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  // Profile photo handlers
  const handleTakeProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        if (result.assets && result.assets[0]) {
          await handleProfilePhotoUpload(result.assets[0].uri);
        } else if (result.uri) {
          await handleProfilePhotoUpload(result.uri);
        }
      }
    } catch (error) {
      console.error('Error taking profile photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSelectProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        if (result.assets && result.assets[0]) {
          await handleProfilePhotoUpload(result.assets[0].uri);
        } else if (result.uri) {
          await handleProfilePhotoUpload(result.uri);
        }
      }
    } catch (error) {
      console.error('Error selecting profile photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleProfilePhotoUpload = async (uri: string) => {
    try {
      setLoading(true);
      
      // Compress the image
      const compressedUri = await compressImage(uri);
      
      // Upload profile photo using standalone service
      let displayUri: string | null = null;
      
      try {
        displayUri = await StandalonePhotoService.uploadPhoto(
          compressedUri,
          clientData.id,
          'client'
        );
        console.log('Profile photo upload successful');
      } catch (uploadError) {
        console.warn('Standalone upload failed, trying hybrid:', uploadError);
        
        try {
          const photoId = await HybridLocalImgBBService.uploadPhoto(
            compressedUri,
            clientData.id,
            'client'
          );
          
          displayUri = await HybridLocalImgBBService.getPhoto(photoId);
        } catch (hybridError) {
          console.warn('Hybrid upload failed, trying simple ImgBB:', hybridError);
          
          displayUri = await SimpleImgBBService.uploadPhoto(
            compressedUri,
            clientData.id,
            'client'
          );
        }
      }
      
      if (displayUri) {
        // Update client's photoUri in database
        await FirestoreService.updateClient(clientData.id, {
          photoUri: displayUri
        });
        
        // Update local state
        await loadClientData();
        
        Alert.alert('Success', 'Profile photo updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to upload profile photo');
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      Alert.alert('Error', 'Failed to upload profile photo');
    } finally {
      setLoading(false);
    }
  };

  const processAndUploadPhoto = async (uri: string, date: Date, notes?: string) => {
    try {
      setLoading(true);
      
      // Compress the image
      const compressedUri = await compressImage(uri);
      
      // Save photo using standalone service with fallbacks
      let displayUri: string | null = null;
      
      try {
        displayUri = await StandalonePhotoService.uploadPhoto(
          compressedUri,
          clientData.id,
          'progress',
          notes
        );
        console.log('Standalone progress photo upload successful');
      } catch (standaloneError) {
        console.warn('Standalone upload failed, trying hybrid:', standaloneError);
        
        try {
          const photoId = await HybridLocalImgBBService.uploadPhoto(
            compressedUri,
            clientData.id,
            'progress',
            notes
          );
          
          displayUri = await HybridLocalImgBBService.getPhoto(photoId);
        } catch (hybridError) {
          console.warn('Hybrid upload failed, trying simple ImgBB:', hybridError);
          
          displayUri = await SimpleImgBBService.uploadPhoto(
            compressedUri,
            clientData.id,
            'progress',
            notes
          );
        }
      }
      
      if (displayUri) {
        // Add progress photo to database with display URI
        await FirestoreService.addProgressPhoto(
          clientData.id,
          displayUri,
          notes,
          date
        );
        
        // Reload data
        await loadClientData();
        
        Alert.alert('Success', 'Progress photo uploaded successfully!');
      } else {
        Alert.alert('Error', 'Failed to upload progress photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!selectedPhotoUri) {
      Alert.alert('Error', 'No photo selected');
      return;
    }

    try {
      await processAndUploadPhoto(selectedPhotoUri, newPhotoDate, newPhotoNotes.trim() || undefined);
      
      // Reset form
      setSelectedPhotoUri(null);
      setNewPhotoDate(new Date());
      setNewPhotoNotes('');
      setShowAddPhotoModal(false);
    } catch (error) {
      console.error('Error adding photo:', error);
    }
  };

  // Photo handling for weight entries
  const handleTakeWeightPhoto = async () => {
    try {
      console.log('Starting camera...');
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
        return;
      }

      console.log('Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('Camera result:', result);

      // Handle different result structures
      if (!result.canceled) {
        if (result.assets && result.assets[0]) {
          console.log('Photo taken:', result.assets[0].uri);
          setNewWeightPhotoUri(result.assets[0].uri);
        } else if (result.uri) {
          // Fallback for older API structure
          console.log('Photo taken (fallback):', result.uri);
          setNewWeightPhotoUri(result.uri);
        } else {
          console.log('Camera result has no assets or uri');
          console.log('Result structure:', JSON.stringify(result, null, 2));
        }
      } else {
        console.log('Camera canceled');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Error', `Failed to take photo: ${error.message}`);
    }
  };

  const handleSelectWeightPhoto = async () => {
    try {
      console.log('Starting photo selection...');
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library permissions.');
        return;
      }

      console.log('Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('Image picker result:', result);

      // Handle different result structures
      if (!result.canceled) {
        if (result.assets && result.assets[0]) {
          console.log('Photo selected:', result.assets[0].uri);
          setNewWeightPhotoUri(result.assets[0].uri);
        } else if (result.uri) {
          // Fallback for older API structure
          console.log('Photo selected (fallback):', result.uri);
          setNewWeightPhotoUri(result.uri);
        } else {
          console.log('Photo selection result has no assets or uri');
          console.log('Result structure:', JSON.stringify(result, null, 2));
        }
      } else {
        console.log('Photo selection canceled');
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Error', `Failed to select photo: ${error.message}`);
    }
  };

  const handleWeightPhotoOptions = () => {
    Alert.alert(
      'Add Progress Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Take Photo', onPress: handleTakeWeightPhoto },
        { text: 'Choose from Library', onPress: handleSelectWeightPhoto },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Test function to verify ImagePicker is working
  const testImagePicker = async () => {
    try {
      console.log('Testing ImagePicker...');
      console.log('ImagePicker object:', ImagePicker);
      console.log('MediaTypeOptions:', ImagePicker.MediaTypeOptions);
      console.log('MediaType:', ImagePicker.MediaType);
      
      // Test permissions
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      console.log('Camera permission:', cameraStatus);
      console.log('Library permission:', libraryStatus);
      
    } catch (error) {
      console.error('ImagePicker test error:', error);
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
      
      let photoUri: string | undefined = undefined;
      
      // Process photo if one was selected
      if (newWeightPhotoUri) {
        try {
          // Compress the image for optimal storage
          const compressedUri = await compressImage(newWeightPhotoUri);
          console.log('Image compressed successfully:', compressedUri);
          
          // Save photo using standalone service with fallbacks
          try {
            let photoId: string | null = null;
            let photoUri: string | null = null;
            
            try {
              photoId = await StandalonePhotoService.uploadPhoto(
                compressedUri,
                clientData.id,
                'weight',
                newWeightNotes.trim() || undefined
              );
              console.log('Standalone photo upload successful, photoId:', photoId);
              
              // Get the photoUri from the service
              photoUri = await StandalonePhotoService.getPhoto(photoId);
              console.log('Retrieved photoUri from StandalonePhotoService:', photoUri);
            } catch (standaloneError) {
              console.warn('Standalone upload failed, trying hybrid:', standaloneError);
              
              try {
                photoId = await HybridLocalImgBBService.uploadPhoto(
                  compressedUri,
                  clientData.id,
                  'weight',
                  newWeightNotes.trim() || undefined
                );
                console.log('Hybrid photo upload successful, photoId:', photoId);
              } catch (hybridError) {
                console.warn('Hybrid upload failed, trying simple ImgBB:', hybridError);
                
                // For SimpleImgBBService, we get the URI directly
                photoUri = await SimpleImgBBService.uploadPhoto(
                  compressedUri,
                  clientData.id,
                  'weight',
                  newWeightNotes.trim() || undefined
                );
                
                if (photoUri) {
                  console.log('SimpleImgBB photo upload successful, URI:', photoUri);
                } else {
                  throw new Error('SimpleImgBB upload failed');
                }
              }
            }
            
            if (photoUri) {
              console.log('Photo saved successfully with photoUri:', photoUri);
            } else {
              throw new Error('All photo upload methods failed - no photoUri obtained');
            }
            
          } catch (photoError) {
            console.error('Photo storage failed:', photoError);
            Alert.alert('Error', 'Photo could not be saved. Weight entry will be saved without photo.');
          }
        } catch (photoError) {
          console.error('Error processing photo:', photoError);
          Alert.alert('Error', 'Photo could not be processed. Weight entry will be saved without photo.');
        }
      }
      
      // Save to database with selected date and photo
      await FirestoreService.addWeightEntry(
        clientData.id,
        weight,
        newWeightNotes.trim() || undefined,
        photoUri, // Use the photoUri (either from SimpleImgBB or retrieved from services)
        newWeightDate
      );
      
      // Reload data
      await loadClientData();
      
      // Reset form
      setNewWeight('');
      setNewWeightNotes('');
      setNewWeightDate(new Date());
      setNewWeightPhotoUri(null);
      setShowAddWeightModal(false);
      
      Alert.alert('Success', 'Weight entry added successfully!');
    } catch (error) {
      console.error('Error adding weight entry:', error);
      Alert.alert('Error', 'Failed to add weight entry');
    } finally {
      setLoading(false);
    }
  };

  const bmi = calculateBMI();
  const bmiInfo = getBMICategory(bmi);
  const progressPercentage = getProgressPercentage();
  const weightChange = getWeightChange();

  // Helper function to get client initials
  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderTabButton = (tab: 'info' | 'progress' | 'photos', label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => handleTabChange(tab)}
      activeOpacity={0.7}
    >
      <View style={[styles.tabIconContainer, activeTab === tab && styles.activeTabIconContainer]}>
        <Ionicons
          name={icon as any}
          size={22}
          color={activeTab === tab ? '#FFFFFF' : '#6B7280'}
        />
      </View>
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {label}
      </Text>
      {activeTab === tab && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );

  const renderClientInfo = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Client Profile Header */}
      <View style={styles.clientProfileHeader}>
        <View style={styles.clientAvatarSection}>
          <View style={styles.clientAvatarLarge}>
            {clientData.photoUri ? (
              <Image 
                source={{ uri: clientData.photoUri }} 
                style={styles.clientAvatarImage}
                resizeMode="cover"
                onError={() => {
                  console.log('Failed to load image, falling back to initials');
                }}
              />
            ) : (
              <Text style={styles.clientAvatarText}>
                {getClientInitials(clientData.name)}
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.avatarEditButton}
            onPress={() => {
              Alert.alert(
                'Update Client Photo',
                'Choose how you want to add a profile photo',
                [
                  { text: 'Take Photo', onPress: handleTakeProfilePhoto },
                  { text: 'Choose from Library', onPress: handleSelectProfilePhoto },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <Ionicons name="camera" size={16} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.clientProfileInfo}>
          <Text style={styles.clientProfileName}>{clientData.name}</Text>
          <Text style={styles.clientProfileEmail}>{clientData.email}</Text>
          <View style={styles.clientProfileMeta}>
            <View style={styles.clientProfileMetaItem}>
              <Ionicons name="calendar" size={14} color="#6B7280" />
              <Text style={styles.clientProfileMetaText}>
                Started {clientData.startDate ? new Date(clientData.startDate).toLocaleDateString() : clientData.createdAt.toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.clientProfileMetaItem}>
              <Ionicons name="time" size={14} color="#6B7280" />
              <Text style={styles.clientProfileMetaText}>
                {Math.floor((Date.now() - (clientData.startDate ? new Date(clientData.startDate).getTime() : clientData.createdAt.getTime())) / (1000 * 60 * 60 * 24))} days
              </Text>
            </View>
          </View>
        </View>
      </View>

       {/* Key Metrics Overview */}
       <View style={styles.keyMetricsContainer}>
         {/* Top Row: Current Weight and BMI */}
         <View style={styles.keyMetricsTopRow}>
           <View style={styles.keyMetricCard}>
             <View style={[styles.keyMetricIcon, { backgroundColor: '#EBF8FF', alignSelf: 'center', marginBottom: 12, marginRight: 0 }]}>
               <Ionicons name="scale" size={20} color="#3B82F6" />
             </View>
             <Text style={[styles.keyMetricTitle, { textAlign: 'center', marginBottom: 8 }]}>Current Weight</Text>
             <Text style={[styles.keyMetricValue, { textAlign: 'center' }]}>{weightEntries[0]?.weight || clientData.weight} kg</Text>
             {weightChange !== 0 && (
               <View style={[styles.keyMetricChange, { alignSelf: 'center' }]}>
                 <Ionicons 
                   name={weightChange < 0 ? "trending-down" : "trending-up"} 
                   size={14} 
                   color={weightChange < 0 ? '#10B981' : '#EF4444'} 
                 />
                 <Text style={[styles.keyMetricChangeText, { color: weightChange < 0 ? '#10B981' : '#EF4444' }]}>
                   {Math.abs(weightChange).toFixed(1)} kg
                 </Text>
               </View>
             )}
           </View>

           <View style={styles.keyMetricCard}>
             <View style={[styles.keyMetricIcon, { backgroundColor: '#FEF3C7', alignSelf: 'center', marginBottom: 12, marginRight: 0 }]}>
               <Ionicons name="heart" size={20} color="#F59E0B" />
             </View>
             <Text style={[styles.keyMetricTitle, { textAlign: 'center', marginBottom: 8 }]}>BMI</Text>
             <Text style={[styles.keyMetricValue, { textAlign: 'center' }]}>{bmi.toFixed(1)}</Text>
             <View style={[styles.keyMetricBadge, { backgroundColor: bmiInfo.color, alignSelf: 'center' }]}>
               <Text style={styles.keyMetricBadgeText}>{bmiInfo.category}</Text>
             </View>
           </View>
         </View>

         {/* Bottom Row: Goal */}
         <View style={styles.keyMetricsBottomRow}>
           <View style={styles.keyMetricCardGoal}>
             <View style={[styles.keyMetricIcon, { backgroundColor: '#F0FDF4', alignSelf: 'center', marginBottom: 12, marginRight: 0 }]}>
               <Ionicons name="flag" size={20} color="#10B981" />
             </View>
             <Text style={[styles.keyMetricTitle, { textAlign: 'center', marginBottom: 8 }]}>Goal</Text>
             <Text style={[styles.keyMetricValue, { textAlign: 'center' }]}>{progressPercentage.toFixed(0)}%</Text>
             <Text style={[styles.keyMetricSubtext, { textAlign: 'center' }]}>{getGoalDisplay(clientData.goal)}</Text>
           </View>
         </View>
       </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#EBF8FF' }]}>
            <Ionicons name="person" size={20} color="#3B82F6" />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.sectionSubtitle}>Basic client details</Text>
          </View>
        </View>

         <View style={styles.personalInfoContainer}>
           {/* Full Name - Single Row */}
           <View style={styles.personalInfoItemFull}>
             <View style={styles.personalInfoIconContainer}>
               <Ionicons name="person-circle" size={20} color="#3B82F6" />
             </View>
             <View style={styles.personalInfoContent}>
               <Text style={styles.personalInfoLabel}>Full Name</Text>
               <Text style={styles.personalInfoValue}>{clientData.name}</Text>
             </View>
           </View>

           {/* Email Address - Single Row */}
           <View style={styles.personalInfoItemFull}>
             <View style={styles.personalInfoIconContainer}>
               <Ionicons name="mail" size={20} color="#10B981" />
             </View>
             <View style={styles.personalInfoContent}>
               <Text style={styles.personalInfoLabel}>Email Address</Text>
               <Text style={styles.personalInfoValue}>{clientData.email}</Text>
             </View>
           </View>

           {/* Phone Number - Single Row */}
           <View style={styles.personalInfoItemFull}>
             <View style={styles.personalInfoIconContainer}>
               <Ionicons name="call" size={20} color="#F59E0B" />
             </View>
             <View style={styles.personalInfoContent}>
               <Text style={styles.personalInfoLabel}>Phone Number</Text>
               <Text style={styles.personalInfoValue}>{clientData.phone || 'Not provided'}</Text>
             </View>
           </View>

           {/* Age - Single Row */}
           <View style={styles.personalInfoItemFull}>
             <View style={styles.personalInfoIconContainer}>
               <Ionicons name="calendar" size={20} color="#8B5CF6" />
             </View>
             <View style={styles.personalInfoContent}>
               <Text style={styles.personalInfoLabel}>Age</Text>
               <Text style={styles.personalInfoValue}>{clientData.age || 'Not specified'} years</Text>
             </View>
           </View>

           {/* Height and Gender - Same Row */}
           <View style={styles.personalInfoRow}>
             <View style={styles.personalInfoItem}>
               <View style={styles.personalInfoIconContainer}>
                 <Ionicons name="resize" size={20} color="#EF4444" />
               </View>
               <View style={styles.personalInfoContent}>
                 <Text style={styles.personalInfoLabel}>Height</Text>
                 <Text style={styles.personalInfoValue}>{clientData.height || 'Not specified'} cm</Text>
               </View>
             </View>
             
             <View style={styles.personalInfoItem}>
               <View style={styles.personalInfoIconContainer}>
                 <Ionicons name="male-female" size={20} color="#06B6D4" />
               </View>
               <View style={styles.personalInfoContent}>
                 <Text style={styles.personalInfoLabel}>Gender</Text>
                 <Text style={styles.personalInfoValue}>{clientData.gender || 'Not specified'}</Text>
               </View>
             </View>
           </View>
         </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="flash" size={20} color="#10B981" />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionSubtitle}>Common tasks</Text>
          </View>
        </View>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => setShowAddWeightModal(true)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EBF8FF' }]}>
              <Ionicons name="add-circle" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.quickActionText}>Add Weight</Text>
            <Text style={styles.quickActionSubtext}>Log new weight entry</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => {
              Alert.alert(
                'Add Progress Photo',
                'Choose how you want to add a photo',
                [
                  { text: 'Take Photo', onPress: handleTakePhoto },
                  { text: 'Choose from Library', onPress: handleSelectPhoto },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="camera" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Add Photo</Text>
            <Text style={styles.quickActionSubtext}>Progress photo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => {
              Alert.alert(
                'Add Coach Note',
                'This feature will allow you to add coaching notes for this client.',
                [
                  { text: 'OK', style: 'default' }
                ]
              );
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="document-text" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.quickActionText}>Add Note</Text>
            <Text style={styles.quickActionSubtext}>Coach notes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => {
              Alert.alert(
                'Schedule Session',
                'This feature will allow you to schedule training sessions with this client.',
                [
                  { text: 'OK', style: 'default' }
                ]
              );
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FECACA' }]}>
              <Ionicons name="calendar" size={24} color="#EF4444" />
            </View>
            <Text style={styles.quickActionText}>Schedule</Text>
            <Text style={styles.quickActionSubtext}>Book session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Health & Fitness Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="fitness" size={20} color="#F59E0B" />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Health & Fitness</Text>
            <Text style={styles.sectionSubtitle}>Goal and health metrics</Text>
          </View>
        </View>

        <View style={styles.healthFitnessContainer}>
          <View style={styles.healthFitnessCard}>
            <View style={styles.healthFitnessHeader}>
              <Ionicons name="flag" size={20} color="#10B981" />
              <Text style={styles.healthFitnessTitle}>Fitness Goal</Text>
            </View>
            <Text style={styles.healthFitnessValue}>{getGoalDisplay(clientData.goal)}</Text>
            <View style={styles.healthFitnessProgress}>
              <View style={styles.healthFitnessProgressBar}>
                <View style={[styles.healthFitnessProgressFill, { width: `${progressPercentage}%` }]} />
              </View>
              <Text style={styles.healthFitnessProgressText}>{progressPercentage.toFixed(0)}% Complete</Text>
            </View>
          </View>

          <View style={styles.healthFitnessCard}>
            <View style={styles.healthFitnessHeader}>
              <Ionicons name="heart" size={20} color="#EF4444" />
              <Text style={styles.healthFitnessTitle}>Health Status</Text>
            </View>
            <Text style={styles.healthFitnessValue}>BMI: {bmi.toFixed(1)}</Text>
            <View style={[styles.healthFitnessBadge, { backgroundColor: bmiInfo.color }]}>
              <Text style={styles.healthFitnessBadgeText}>{bmiInfo.category}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Health Metrics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="fitness" size={20} color="#F59E0B" />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Health Metrics</Text>
            <Text style={styles.sectionSubtitle}>BMI and goal information</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>BMI</Text>
            <Text style={[styles.infoValue, { color: bmiInfo.color }]}>
              {bmi > 0 ? `${bmi.toFixed(1)} (${bmiInfo.category})` : 'Not calculated'}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Goal</Text>
            <Text style={styles.infoValue}>{getGoalDisplay(clientData.goal)}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Started</Text>
            <Text style={styles.infoValue}>{clientData.startDate ? new Date(clientData.startDate).toLocaleDateString() : clientData.createdAt.toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      {/* Questionnaire Section - Placeholder for now */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="document-text" size={20} color="#10B981" />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Health Questionnaire</Text>
            <Text style={styles.sectionSubtitle}>Medical history and preferences</Text>
          </View>
        </View>

        {clientData.questionnaire ? (
          <View style={styles.questionnaireContent}>
            {/* Medical History */}
            <View style={styles.questionnaireSection}>
              <Text style={styles.questionnaireSectionTitle}>Medical History</Text>
              <View style={styles.questionnaireItem}>
                <Text style={styles.questionnaireLabel}>Medical Conditions:</Text>
                <Text style={styles.questionnaireValue}>{clientData.questionnaire.medicalConditions || 'None reported'}</Text>
              </View>
              <View style={styles.questionnaireItem}>
                <Text style={styles.questionnaireLabel}>Medications:</Text>
                <Text style={styles.questionnaireValue}>{clientData.questionnaire.medications || 'None reported'}</Text>
              </View>
              <View style={styles.questionnaireItem}>
                <Text style={styles.questionnaireLabel}>Blood Pressure:</Text>
                <Text style={styles.questionnaireValue}>{clientData.questionnaire.bloodPressure || 'Not provided'}</Text>
              </View>
            </View>

            {/* Fitness Level */}
            <View style={styles.questionnaireSection}>
              <Text style={styles.questionnaireSectionTitle}>Fitness Level</Text>
              <View style={styles.questionnaireItem}>
                <Text style={styles.questionnaireLabel}>Exercise Days/Week:</Text>
                <Text style={styles.questionnaireValue}>{clientData.questionnaire.exerciseDaysPerWeek || 'Not specified'}</Text>
              </View>
              <View style={styles.questionnaireItem}>
                <Text style={styles.questionnaireLabel}>Weight Training Experience:</Text>
                <Text style={styles.questionnaireValue}>{clientData.questionnaire.weightTrainingExperience || 'Not specified'}</Text>
              </View>
              <View style={styles.questionnaireItem}>
                <Text style={styles.questionnaireLabel}>Fitness Level:</Text>
                <Text style={styles.questionnaireValue}>{clientData.questionnaire.fitnessLevel || 'Not specified'}</Text>
              </View>
            </View>

            {/* Injuries & Pain */}
            <View style={styles.questionnaireSection}>
              <Text style={styles.questionnaireSectionTitle}>Injuries & Pain</Text>
              <View style={styles.questionnaireItem}>
                <Text style={styles.questionnaireLabel}>Current Injuries:</Text>
                <Text style={styles.questionnaireValue}>{clientData.questionnaire.currentInjuries || 'None reported'}</Text>
              </View>
              <View style={styles.questionnaireItem}>
                <Text style={styles.questionnaireLabel}>Pain During Activity:</Text>
                <Text style={styles.questionnaireValue}>{clientData.questionnaire.painDuringActivity || 'Not specified'}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.questionnairePlaceholder}>
            <Ionicons name="document-outline" size={48} color="#E5E7EB" />
            <Text style={styles.placeholderText}>No questionnaire data available</Text>
            <Text style={styles.placeholderSubtext}>Questionnaire was not completed during client setup</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderProgressTracking = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Progress Overview Cards */}
      <View style={styles.progressOverviewContainer}>
        <View style={styles.progressOverviewCard}>
          <View style={[styles.progressOverviewIcon, { backgroundColor: '#EBF8FF' }]}>
            <Ionicons name="trending-up" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.progressOverviewTitle}>Total Progress</Text>
          <Text style={styles.progressOverviewValue}>
            {weightEntries.length > 1 ? 
              `${(weightEntries[0].weight - weightEntries[weightEntries.length - 1].weight).toFixed(1)} kg` : 
              '0.0 kg'
            }
          </Text>
          <Text style={styles.progressOverviewSubtext}>Weight Change</Text>
        </View>

        <View style={styles.progressOverviewCard}>
          <View style={[styles.progressOverviewIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="calendar" size={24} color="#10B981" />
          </View>
          <Text style={styles.progressOverviewTitle}>Entries</Text>
          <Text style={styles.progressOverviewValue}>{weightEntries.length}</Text>
          <Text style={styles.progressOverviewSubtext}>Weight Logs</Text>
        </View>

        <View style={styles.progressOverviewCard}>
          <View style={[styles.progressOverviewIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.progressOverviewTitle}>Last Entry</Text>
          <Text style={styles.progressOverviewValue}>
            {weightEntries.length > 0 ? 
              `${Math.floor((Date.now() - weightEntries[0].date.getTime()) / (1000 * 60 * 60 * 24))}d` : 
              'N/A'
            }
          </Text>
          <Text style={styles.progressOverviewSubtext}>Days Ago</Text>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="analytics" size={20} color="#F59E0B" />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Progress Tracking</Text>
            <Text style={styles.sectionSubtitle}>Log weight & track trends</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddWeightModal(true)}
          >
            <Ionicons name="add" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Progress Status */}
        <View style={styles.progressStatusContainer}>
          <View style={styles.progressStatusHeader}>
            <Text style={styles.progressStatusTitle}>Current Status</Text>
            <View style={styles.progressStatusSubtitleContainer}>
              <Ionicons 
                name={weightChange < 0 ? "trending-down" : weightChange > 0 ? "trending-up" : "remove"} 
                size={16} 
                color={weightChange < 0 ? '#10B981' : weightChange > 0 ? '#EF4444' : '#6B7280'} 
              />
              <Text style={styles.progressStatusSubtitle}>
                {weightChange < 0 ? ' Losing weight' : weightChange > 0 ? ' Gaining weight' : ' Maintaining'}
              </Text>
            </View>
          </View>
          <View style={styles.progressStatusContent}>
            <View style={styles.progressStatusCard}>
              <Ionicons name="trending-up" size={24} color="#3B82F6" />
              <Text style={styles.progressStatusLabel}>Trend</Text>
              <Text style={styles.progressStatusValue}>
                {weightChange < 0 ? 'Downward' : weightChange > 0 ? 'Upward' : 'Stable'}
              </Text>
            </View>
            <View style={styles.progressStatusCard}>
              <Ionicons name="speedometer" size={24} color="#10B981" />
              <Text style={styles.progressStatusLabel}>Rate</Text>
              <Text style={styles.progressStatusValue}>
                {weightEntries.length > 1 ? 
                  `${Math.abs(weightChange).toFixed(1)} kg/week` : 
                  'N/A'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Weight Entries */}
        <View style={styles.weightEntriesContainer}>
          <View style={styles.weightEntriesHeader}>
            <Text style={styles.weightEntriesTitle}>Recent Weight Logs</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowWeightLogs(true)}
            >
              <Text style={styles.viewAllButtonText}>View All Logs</Text>
              <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          {weightEntries.slice(0, 3).map((entry, index) => (
            <View key={entry.id} style={styles.weightEntry}>
              <View style={styles.weightEntryLeft}>
                <View style={styles.weightEntryDate}>
                  <Text style={styles.weightEntryDateText}>
                    {entry.date instanceof Date ? entry.date.toLocaleDateString() : new Date(entry.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.weightEntryTimeText}>
                    {entry.date instanceof Date ? entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {entry.notes && (
                  <Text style={styles.weightEntryNotes}>{entry.notes}</Text>
                )}
              </View>
              <View style={styles.weightEntryRight}>
                <Text style={styles.weightEntryValue}>{entry.weight} kg</Text>
                {index < weightEntries.length - 1 && (
                  <View style={styles.weightEntryChangeContainer}>
                    <Ionicons 
                      name={entry.weight < weightEntries[index + 1].weight ? "trending-down" : "trending-up"} 
                      size={12} 
                      color={entry.weight < weightEntries[index + 1].weight ? '#10B981' : '#EF4444'} 
                    />
                    <Text style={[
                      styles.weightEntryChange,
                      { color: entry.weight < weightEntries[index + 1].weight ? '#10B981' : '#EF4444' }
                    ]}>
                      {Math.abs(entry.weight - weightEntries[index + 1].weight).toFixed(1)}kg
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
          {weightEntries.length === 0 && (
            <View style={styles.emptyWeightEntries}>
              <Ionicons name="scale-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyWeightEntriesText}>No weight entries yet</Text>
              <Text style={styles.emptyWeightEntriesSubtext}>Start tracking progress</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="flash" size={20} color="#10B981" />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Coach Actions</Text>
            <Text style={styles.sectionSubtitle}>Log data & manage client</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => {
              Alert.alert(
                'Add Session Notes',
                'This feature will allow you to add detailed session notes for this client.',
                [
                  { text: 'OK', style: 'default' }
                ]
              );
            }}
          >
            <Ionicons name="document-text" size={24} color="#F59E0B" />
            <Text style={styles.actionText}>Add Session Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => {
              Alert.alert(
                'Schedule Session',
                'This feature will allow you to schedule training sessions with this client.',
                [
                  { text: 'OK', style: 'default' }
                ]
              );
            }}
          >
            <Ionicons name="calendar" size={24} color="#8B5CF6" />
            <Text style={styles.actionText}>Schedule Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderPhotoComparison = () => {
    // Get only weight entry photos, sorted by date (oldest first)
    const weightPhotos = weightEntries
      .filter(entry => entry.photoUri)
      .map(entry => ({ 
        id: entry.id, 
        photoUri: entry.photoUri, 
        date: entry.date, 
        weight: entry.weight,
        notes: entry.notes
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort oldest first

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EBF8FF' }]}>
              <Ionicons name="camera" size={20} color="#3B82F6" />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Weight Progress Photos</Text>
              <Text style={styles.sectionSubtitle}>Photos from weight entries</Text>
            </View>
          </View>

          {/* Photo Comparison */}
          <View style={styles.photoComparisonContainer}>
            <View style={styles.photoComparisonHeader}>
              <Text style={styles.photoComparisonTitle}>Before & After</Text>
              <Text style={styles.photoComparisonSubtitle}>Visual progress comparison</Text>
            </View>
            
            <View style={styles.photoComparisonGrid}>
              <View style={styles.photoCard}>
                {weightPhotos.length > 0 ? (
                  <Image 
                    source={{ uri: weightPhotos[0].photoUri }} 
                    style={styles.photoImage}
                    resizeMode="cover"
                    onError={() => {
                      console.log('Failed to load photo');
                    }}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={48} color="#E5E7EB" />
                    <Text style={styles.photoPlaceholderText}>Before Photo</Text>
                  </View>
                )}
                <Text style={styles.photoDate}>
                  {weightPhotos.length > 0 ? weightPhotos[0].date.toLocaleDateString() : 'No photos yet'}
                </Text>
                {weightPhotos.length > 0 && (
                  <Text style={styles.photoWeightLabel}>
                    {weightPhotos[0].weight}kg
                  </Text>
                )}
              </View>
              
              <View style={styles.photoCard}>
                {weightPhotos.length > 1 ? (
                  <Image 
                    source={{ uri: weightPhotos[weightPhotos.length - 1].photoUri }} 
                    style={styles.photoImage}
                    resizeMode="cover"
                    onError={() => {
                      console.log('Failed to load photo');
                    }}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={48} color="#E5E7EB" />
                    <Text style={styles.photoPlaceholderText}>Current Photo</Text>
                  </View>
                )}
                <Text style={styles.photoDate}>
                  {weightPhotos.length > 1 ? weightPhotos[weightPhotos.length - 1].date.toLocaleDateString() : 'No photos yet'}
                </Text>
                {weightPhotos.length > 1 && (
                  <Text style={styles.photoWeightLabel}>
                    {weightPhotos[weightPhotos.length - 1].weight}kg
                  </Text>
                )}
              </View>
            </View>
          </View>

        {/* Photo Timeline */}
        <View style={styles.photoTimelineContainer}>
          <Text style={styles.photoTimelineTitle}>Photo Timeline</Text>
          <View style={styles.photoTimeline}>
            {weightPhotos.length > 0 ? (
              weightPhotos.slice(0, 4).map((photo, index) => (
                <View key={photo.id} style={styles.timelineItem}>
                  <View style={styles.timelinePhoto}>
                    {photo.photoUri ? (
                      <Image 
                        source={{ uri: photo.photoUri }} 
                        style={styles.timelinePhotoImage}
                        resizeMode="cover"
                        onError={() => {
                          console.log('Failed to load timeline photo');
                        }}
                      />
                    ) : (
                      <Ionicons name="camera-outline" size={24} color="#E5E7EB" />
                    )}
                  </View>
                  <Text style={styles.timelineWeek}>
                    Weight Entry {index + 1}
                  </Text>
                  <Text style={styles.timelineDate}>{photo.date.toLocaleDateString()}</Text>
                  <Text style={styles.timelineWeight}>{photo.weight}kg</Text>
                </View>
              ))
            ) : (
              [1, 2, 3, 4].map((week) => (
                <View key={week} style={styles.timelineItem}>
                  <View style={styles.timelinePhoto}>
                    <Ionicons name="camera-outline" size={24} color="#E5E7EB" />
                  </View>
                  <Text style={styles.timelineWeek}>Weight Entry {week}</Text>
                  <Text style={styles.timelineDate}>No photo</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={clientData.name}
          subtitle="Track & monitor client progress"
          showBackButton={true}
          onBackPress={onBack}
        />
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#6B7280" />
          <Text style={styles.loadingText}>Loading client data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={clientData.name}
        subtitle="Track & monitor client progress"
        showBackButton={true}
        onBackPress={onBack}
      />

      {/* Enhanced Tab Navigation */}
      <View style={styles.tabNavigation}>
        {renderTabButton('info', 'Info', 'person-outline')}
        {renderTabButton('progress', 'Progress', 'trending-up-outline')}
        {renderTabButton('photos', 'Photos', 'camera-outline')}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {activeTab === 'info' && renderClientInfo()}
        {activeTab === 'progress' && renderProgressTracking()}
        {activeTab === 'photos' && renderPhotoComparison()}
      </View>

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
            <Text style={styles.modalTitle}>Log Client Weight</Text>
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

             <TouchableOpacity 
               style={styles.photoButton}
               onPress={handleWeightPhotoOptions}
             >
               <Ionicons name="camera" size={20} color="#3B82F6" />
               <Text style={styles.photoButtonText}>
                 {newWeightPhotoUri ? 'Change Photo' : 'Take Progress Photo'}
               </Text>
             </TouchableOpacity>
             
             {/* Show selected photo preview */}
             {newWeightPhotoUri && (
               <View style={styles.photoPreviewContainer}>
                 <Image 
                   source={{ uri: newWeightPhotoUri }} 
                   style={styles.photoPreview}
                   resizeMode="cover"
                 />
                 <TouchableOpacity 
                   style={styles.removePhotoButton}
                   onPress={() => setNewWeightPhotoUri(null)}
                 >
                   <Ionicons name="close-circle" size={24} color="#EF4444" />
                 </TouchableOpacity>
               </View>
             )}
           </View>
        </View>
      </Modal>

      {/* Add Progress Photo Modal */}
      <Modal
        visible={showAddPhotoModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddPhotoModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Progress Photo</Text>
            <TouchableOpacity onPress={handleAddPhoto}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Photo Preview */}
            {selectedPhotoUri && (
              <View style={styles.photoPreviewContainer}>
                <Image 
                  source={{ uri: selectedPhotoUri }} 
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <DateInput
                label="Photo Date"
                value={newPhotoDate}
                onDateChange={setNewPhotoDate}
                placeholder="Select date"
                maximumDate={new Date()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes about this progress photo..."
                value={newPhotoNotes}
                onChangeText={setNewPhotoNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Weight Logs Screen */}
      <Modal
        visible={showWeightLogs}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <WeightLogsScreen
          clientData={clientData}
          onBack={() => setShowWeightLogs(false)}
          onDataChanged={() => loadClientData()}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.05,
      radius: 4,
      elevation: 2,
    }),
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginHorizontal: 4,
    position: 'relative',
  },
  activeTabButton: {
    backgroundColor: '#3B82F6',
    ...createShadowStyle({
      color: '#3B82F6',
      offset: { width: 0, height: 4 },
      opacity: 0.3,
      radius: 8,
      elevation: 6,
    }),
  },
  tabIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeTabIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  activeTabButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  statChange: {
    fontSize: 11,
    fontWeight: '600',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStatusContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  progressStatusHeader: {
    marginBottom: 16,
  },
  progressStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  progressStatusSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStatusSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  progressStatusContent: {
    flexDirection: 'row',
    gap: 12,
  },
  progressStatusCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressStatusLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  progressStatusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  weightEntriesContainer: {
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
  weightEntriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF8FF',
    borderRadius: 16,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginRight: 4,
  },
  emptyWeightEntries: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyWeightEntriesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyWeightEntriesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  photoPreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  weightEntriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  weightEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  weightEntryLeft: {
    flex: 1,
  },
  weightEntryDate: {
    marginBottom: 4,
  },
  weightEntryDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  weightEntryTimeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  weightEntryNotes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  weightEntryRight: {
    alignItems: 'flex-end',
  },
  weightEntryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  weightEntryChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  weightEntryChange: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionText: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 8,
  },
  photoPreviewContainer: {
    marginTop: 16,
    position: 'relative',
    alignItems: 'center',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.1,
      radius: 4,
    }),
  },
  questionnaireContent: {
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
  questionnaireSection: {
    marginBottom: 24,
  },
  questionnaireSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  questionnaireItem: {
    marginBottom: 12,
  },
  questionnaireLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  questionnaireValue: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  questionnairePlaceholder: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  photoComparisonContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  photoComparisonHeader: {
    marginBottom: 20,
  },
  photoComparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  photoComparisonSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  photoComparisonGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  photoCard: {
    flex: 1,
    alignItems: 'center',
  },
  photoPlaceholder: {
    width: 120,
    height: 160,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  photoDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  photoTimelineContainer: {
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
  photoTimelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  photoTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
  },
  timelinePhoto: {
    width: 48,
    height: 48,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  timelineWeek: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 10,
    color: '#6B7280',
  },
  timelineWeight: {
    fontSize: 9,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 2,
  },
  photoWeightLabel: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 4,
  },
  photoImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  timelinePhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  // New enhanced styles
  statChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  healthMetricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  healthMetricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.05,
      radius: 4,
      elevation: 2,
    }),
  },
  healthMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthMetricIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  healthMetricTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  healthMetricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  healthMetricSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  healthMetricBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  healthMetricBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.05,
      radius: 4,
      elevation: 2,
    }),
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  progressOverviewContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  progressOverviewCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.05,
      radius: 4,
      elevation: 2,
    }),
  },
  progressOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressOverviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressOverviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressOverviewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  progressOverviewSubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  weightLogsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginRight: 4,
  },
  weightLogItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 1 },
      opacity: 0.05,
      radius: 2,
      elevation: 1,
    }),
  },
  weightLogLeft: {
    flex: 1,
  },
  weightLogDateContainer: {
    marginBottom: 4,
  },
  weightLogDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  weightLogTimeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  weightLogChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightLogChange: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  weightLogRight: {
    alignItems: 'flex-end',
  },
  weightLogWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  weightLogNotes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightLogNotesText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
    maxWidth: 120,
  },
  noWeightLogs: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.05,
      radius: 4,
      elevation: 2,
    }),
  },
  noWeightLogsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  noWeightLogsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  startTrackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startTrackingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  // Enhanced Info Tab Styles
  clientProfileHeader: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 4 },
      opacity: 0.08,
      radius: 8,
      elevation: 4,
    }),
  },
  clientAvatarSection: {
    position: 'relative',
    marginRight: 20,
  },
  clientAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    ...createShadowStyle({
      color: '#3B82F6',
      offset: { width: 0, height: 4 },
      opacity: 0.3,
      radius: 8,
      elevation: 6,
    }),
  },
  clientAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  clientAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.2,
      radius: 4,
      elevation: 4,
    }),
  },
  clientProfileInfo: {
    flex: 1,
  },
  clientProfileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  clientProfileEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  clientProfileMeta: {
    gap: 8,
  },
  clientProfileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientProfileMetaText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '500',
  },
   keyMetricsContainer: {
     marginBottom: 24,
   },
   keyMetricsTopRow: {
     flexDirection: 'row',
     gap: 12,
     marginBottom: 12,
   },
   keyMetricsBottomRow: {
     alignItems: 'center',
   },
   keyMetricCard: {
     flex: 1,
     backgroundColor: 'white',
     borderRadius: 20,
     padding: 24,
     ...createShadowStyle({
       color: '#000',
       offset: { width: 0, height: 4 },
       opacity: 0.08,
       radius: 8,
       elevation: 6,
     }),
     borderWidth: 1,
     borderColor: 'rgba(0, 0, 0, 0.05)',
   },
   keyMetricCardGoal: {
     backgroundColor: 'white',
     borderRadius: 20,
     padding: 24,
     width: '100%',
     ...createShadowStyle({
       color: '#000',
       offset: { width: 0, height: 6 },
       opacity: 0.12,
       radius: 12,
       elevation: 8,
     }),
     borderWidth: 1,
     borderColor: 'rgba(16, 185, 129, 0.1)',
   },
  keyMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
   keyMetricIcon: {
     width: 40,
     height: 40,
     borderRadius: 20,
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 16,
     ...createShadowStyle({
       color: '#000',
       offset: { width: 0, height: 2 },
       opacity: 0.1,
       radius: 4,
       elevation: 3,
     }),
   },
   keyMetricTitle: {
     fontSize: 15,
     fontWeight: '700',
     color: '#6B7280',
     letterSpacing: 0.5,
   },
   keyMetricValue: {
     fontSize: 24,
     fontWeight: '900',
     color: '#1F2937',
     marginBottom: 12,
     letterSpacing: -0.5,
   },
   keyMetricChange: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: 'rgba(0, 0, 0, 0.05)',
     paddingHorizontal: 8,
     paddingVertical: 4,
     borderRadius: 12,
     alignSelf: 'flex-start',
   },
   keyMetricChangeText: {
     fontSize: 12,
     fontWeight: '700',
     marginLeft: 4,
     letterSpacing: 0.2,
   },
   keyMetricBadge: {
     paddingHorizontal: 12,
     paddingVertical: 6,
     borderRadius: 16,
     alignSelf: 'flex-start',
     ...createShadowStyle({
       color: '#000',
       offset: { width: 0, height: 2 },
       opacity: 0.15,
       radius: 4,
       elevation: 3,
     }),
   },
   keyMetricBadgeText: {
     fontSize: 11,
     fontWeight: '700',
     color: 'white',
     letterSpacing: 0.3,
   },
   keyMetricSubtext: {
     fontSize: 14,
     color: '#6B7280',
     fontWeight: '600',
     letterSpacing: 0.2,
   },
   personalInfoContainer: {
     gap: 16,
   },
   personalInfoRow: {
     flexDirection: 'row',
     gap: 12,
   },
   personalInfoItem: {
     flex: 1,
     backgroundColor: 'white',
     borderRadius: 12,
     padding: 16,
     flexDirection: 'row',
     alignItems: 'center',
     ...createShadowStyle({
       color: '#000',
       offset: { width: 0, height: 1 },
       opacity: 0.05,
       radius: 2,
       elevation: 1,
     }),
   },
   personalInfoItemFull: {
     backgroundColor: 'white',
     borderRadius: 12,
     padding: 16,
     flexDirection: 'row',
     alignItems: 'center',
     ...createShadowStyle({
       color: '#000',
       offset: { width: 0, height: 1 },
       opacity: 0.05,
       radius: 2,
       elevation: 1,
     }),
   },
  personalInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personalInfoContent: {
    flex: 1,
  },
  personalInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  personalInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  quickActionSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  healthFitnessContainer: {
    gap: 16,
  },
  healthFitnessCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.05,
      radius: 4,
      elevation: 2,
    }),
  },
  healthFitnessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthFitnessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  healthFitnessValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  healthFitnessProgress: {
    marginTop: 8,
  },
  healthFitnessProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  healthFitnessProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  healthFitnessProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  healthFitnessBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  healthFitnessBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
});
