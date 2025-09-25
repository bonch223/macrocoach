import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Header } from '../../components/Header';
import { FirestoreService } from '../../services/firestoreService';
import { AuthService } from '../../services/authService';
import { HybridLocalImgBBService } from '../../services/hybridLocalImgBBService';
import { SimpleImgBBService } from '../../services/simpleImgBBService';
import { StandalonePhotoService } from '../../services/standalonePhotoService';
import { Client } from '../../types';

interface ClientsScreenProps {
  onBack: () => void;
  onAddClient: () => void;
  onViewClient: (client: Client) => void;
}

export const ClientsScreen: React.FC<ClientsScreenProps> = ({
  onBack,
  onAddClient,
  onViewClient,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      
      // Get the current authenticated user
      const currentUser = await AuthService.getCurrentUser();
      const coachId = currentUser?.id || 'coach-1'; // Fallback to 'coach-1' if no user
      
      const clientsData = await FirestoreService.getClientsByCoach(coachId);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  };

  const compressImage = async (uri: string) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }], // Resize to max 400x400
        { 
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri; // Return original if compression fails
    }
  };

  const handlePhotoUpload = async (client: Client) => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
        return;
      }

      // Show action sheet
      Alert.alert(
        'Add Client Photo',
        'Choose how you want to add a photo',
        [
          { text: 'Camera', onPress: () => openCamera(client) },
          { text: 'Photo Library', onPress: () => openImagePicker(client) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error handling photo upload:', error);
      Alert.alert('Error', 'Failed to open photo options');
    }
  };

  const openCamera = async (client: Client) => {
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
        await processAndUploadPhoto(client, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImagePicker = async (client: Client) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processAndUploadPhoto(client, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to open photo library');
    }
  };

  const processAndUploadPhoto = async (client: Client, uri: string) => {
    try {
      setUploadingPhoto(true);
      
      let displayUri: string | null = null;
      
      try {
        // Use standalone service first (no Firestore dependencies)
        displayUri = await StandalonePhotoService.uploadPhoto(
          uri,
          client.id,
          'client'
        );
        console.log('Standalone photo upload successful');
      } catch (standaloneError) {
        console.warn('Standalone upload failed, trying hybrid:', standaloneError);
        
        try {
          // Fallback to hybrid storage (local + ImgBB + Firestore metadata)
          const photoId = await HybridLocalImgBBService.uploadPhoto(
            uri,
            client.id,
            'client'
          );
          
          // Get the display URI (local or ImgBB fallback)
          displayUri = await HybridLocalImgBBService.getPhoto(photoId);
        } catch (hybridError) {
          console.warn('Hybrid upload failed, trying simple ImgBB:', hybridError);
          
          // Final fallback to simple ImgBB service (no Firestore metadata)
          displayUri = await SimpleImgBBService.uploadPhoto(
            uri,
            client.id,
            'client'
          );
        }
      }
      
      if (displayUri) {
        // Update client's photoUri in database
        await FirestoreService.updateClient(client.id, {
          photoUri: displayUri
        });
        
        // Update local state
        await loadClients();
        
        Alert.alert('Success', 'Photo uploaded successfully!');
      } else {
        Alert.alert('Error', 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client.name}? This action cannot be undone and will remove all client data including progress logs and photos.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await FirestoreService.deleteClient(client.id);
              await loadClients();
              Alert.alert('Success', 'Client deleted successfully!');
            } catch (error) {
              console.error('Error deleting client:', error);
              Alert.alert('Error', 'Failed to delete client');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };


  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getProgressColor = (client: Client) => {
    // This is a placeholder - you can implement actual progress calculation
    const daysSinceCreated = Math.floor((Date.now() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated < 7) return '#10B981'; // Green for new clients
    if (daysSinceCreated < 30) return '#F59E0B'; // Yellow for recent clients
    return '#6B7280'; // Gray for older clients
  };

  const getStatusText = (client: Client) => {
    const daysSinceCreated = Math.floor((Date.now() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated < 7) return 'New';
    if (daysSinceCreated < 30) return 'Active';
    return 'Established';
  };

  const getDaysSinceCreated = (client: Client) => {
    return Math.floor((Date.now() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getGoalText = (goal: string) => {
    switch (goal) {
      case 'deficit': return 'Fat Loss';
      case 'surplus': return 'Muscle Gain';
      case 'maintenance': return 'Maintenance';
      default: return 'Maintenance';
    }
  };

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case 'deficit': return '#EF4444';
      case 'surplus': return '#10B981';
      case 'maintenance': return '#3B82F6';
      default: return '#3B82F6';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header 
          title="Clients"
          subtitle="Manage your clients"
          showBackButton={true}
          onBackPress={onBack}
          showProfileButton={false}
          showTime={false}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Clients"
        subtitle="Manage your clients"
        showBackButton={true}
        onBackPress={onBack}
        showProfileButton={false}
        showTime={false}
        rightComponent={
          <View style={styles.macroLogoContainer}>
            <Image 
              source={require('../../../assets/Logo/MacroCoach Logo without Name.png')} 
              style={styles.macroLogo}
              resizeMode="contain"
              fadeDuration={0}
              loadingIndicatorSource={require('../../../assets/Logo/MacroCoach Logo without Name.png')}
            />
          </View>
        }
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* Clients List */}
        {clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No clients yet</Text>
            <Text style={styles.emptyDescription}>
              Start by adding your first client to begin tracking their progress
            </Text>
            <TouchableOpacity style={styles.emptyActionButton} onPress={onAddClient}>
              <Ionicons name="person-add-outline" size={20} color="white" />
              <Text style={styles.emptyActionButtonText}>Add First Client</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.clientsList}>
            {clients.map((client) => (
              <View key={client.id} style={styles.clientCard}>
                {/* Card Header with Photo */}
                <View style={styles.clientCardHeader}>
                  <TouchableOpacity 
                    style={styles.clientAvatarContainer}
                    onPress={() => handlePhotoUpload(client)}
                  >
                    <View style={styles.clientAvatar}>
                      {client.photoUri && typeof client.photoUri === 'string' ? (
                        <Image 
                          source={{ uri: client.photoUri }} 
                          style={styles.clientAvatarImage}
                          resizeMode="cover"
                          onError={() => {
                            console.log('Failed to load image, falling back to initials');
                          }}
                        />
                      ) : (
                        <Text style={styles.clientInitials}>
                          {getClientInitials(client.name)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.photoUploadOverlay}>
                      <Ionicons name="camera" size={16} color="white" />
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.clientBasicInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientEmail}>{client.email}</Text>
                    <View style={styles.clientStatusRow}>
                      <View style={[styles.statusBadge, { backgroundColor: getProgressColor(client) }]}>
                        <Text style={styles.statusText}>{getStatusText(client)}</Text>
                      </View>
                      <Text style={styles.clientDays}>
                        {getDaysSinceCreated(client)} days ago
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.clientMenuButton}
                    onPress={() => {
                      Alert.alert(
                        'Client Options',
                        'What would you like to do?',
                        [
                          { text: 'View Details', onPress: () => onViewClient(client) },
                          { text: 'Add Photo', onPress: () => handlePhotoUpload(client) },
                          { text: '🗑️ Delete Client', style: 'destructive', onPress: () => handleDeleteClient(client) },
                          { text: 'Cancel', style: 'cancel' }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Card Body with Stats */}
                <View style={styles.clientCardBody}>
                  <View style={styles.clientStats}>
                    <View style={styles.clientStatItem}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#EBF8FF' }]}>
                        <Ionicons name="fitness" size={16} color="#3B82F6" />
                      </View>
                      <Text style={styles.clientStatLabel}>Weight</Text>
                      <Text style={styles.clientStatValue}>{client.weight}kg</Text>
                    </View>
                    
                    <View style={styles.clientStatItem}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#F0FDF4' }]}>
                        <Ionicons name="resize" size={16} color="#10B981" />
                      </View>
                      <Text style={styles.clientStatLabel}>Height</Text>
                      <Text style={styles.clientStatValue}>{client.height}cm</Text>
                    </View>
                    
                    <View style={styles.clientStatItem}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#FFFBEB' }]}>
                        <Ionicons name="calendar" size={16} color="#F59E0B" />
                      </View>
                      <Text style={styles.clientStatLabel}>Age</Text>
                      <Text style={styles.clientStatValue}>{client.age}y</Text>
                    </View>
                  </View>

                  <View style={styles.clientGoalSection}>
                    <View style={styles.clientGoalHeader}>
                      <Ionicons name="flag" size={16} color="#6B7280" />
                      <Text style={styles.clientGoalLabel}>Fitness Goal</Text>
                    </View>
                    <View style={[styles.clientGoalBadge, { backgroundColor: getGoalColor(client.goal || 'maintenance') }]}>
                      <Text style={styles.clientGoalText}>{getGoalText(client.goal || 'maintenance')}</Text>
                    </View>
                  </View>

                  {client.coachingDuration && (
                    <View style={styles.clientDurationSection}>
                      <View style={styles.clientDurationHeader}>
                        <Ionicons name="time" size={16} color="#6B7280" />
                        <Text style={styles.clientDurationLabel}>Coaching Duration</Text>
                      </View>
                      <Text style={styles.clientDurationValue}>{client.coachingDuration}</Text>
                    </View>
                  )}
                </View>

                {/* Card Footer */}
                <TouchableOpacity 
                  style={styles.clientCardFooter}
                  onPress={() => onViewClient(client)}
                >
                  <View style={styles.clientFooterLeft}>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.clientFooterText}>
                      Joined {client.createdAt.toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.clientFooterRight}>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={onAddClient}>
        <Ionicons name="person-add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  macroLogoContainer: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  macroLogo: {
    width: 24,
    height: 24,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyActionButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  clientsList: {
    marginBottom: 120, // Space for centered FAB
  },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
  },
  clientAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  clientAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  clientAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  clientInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  photoUploadOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  clientBasicInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  clientEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  clientStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  clientDays: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  clientMenuButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  clientCardBody: {
    padding: 24,
    paddingTop: 20,
  },
  clientStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  clientStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  clientStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  clientGoalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clientGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientGoalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '600',
  },
  clientGoalBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clientGoalText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  clientDurationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clientDurationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientDurationLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '600',
  },
  clientDurationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  clientCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFBFC',
  },
  clientFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientFooterText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 8,
    fontWeight: '500',
  },
  clientFooterRight: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
});
