import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { FirestoreService } from '../../services/firestoreService';
import { Client } from '../../types';

const { width } = Dimensions.get('window');

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

interface CoachDashboardProps {
  onAddClient: () => void;
  onManageFoods: () => void;
  onViewClient: (client: Client) => void;
  onViewAllClients: () => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({
  onAddClient,
  onManageFoods,
  onViewClient,
  onViewAllClients
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClients = async () => {
    try {
      // For now, we'll use a hardcoded coach ID
      const clientsData = await FirestoreService.getClientsByCoach("coach-1");
      setClients(clientsData);
    } catch (error) {
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

  useEffect(() => {
    loadClients();
    
    // Subscribe to real-time updates
    const unsubscribe = FirestoreService.subscribeToClients("coach-1", setClients);
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Helper functions for analytics
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };


  const getRecentClients = () => {
    return clients
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3);
  };

  return (
    <View style={styles.container}>
      <Header />
      
      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>{getGreeting()}, Coach!</Text>
        <Text style={styles.greetingSubtext}>
          Here's your coaching overview for today
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash-outline" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                onPress={onAddClient}
                style={[styles.actionButton, styles.addClientButton]}
                activeOpacity={0.8}
              >
                <View style={styles.actionButtonContent}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="person-add" size={28} color="white" />
                  </View>
                  <Text style={styles.actionButtonText}>Add Client</Text>
                  <Text style={styles.actionButtonSubtext}>Create new profile</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onManageFoods}
                style={[styles.actionButton, styles.manageFoodsButton]}
                activeOpacity={0.8}
              >
                <View style={styles.actionButtonContent}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="restaurant" size={28} color="white" />
                  </View>
                  <Text style={styles.actionButtonText}>Manage Foods</Text>
                  <Text style={styles.actionButtonSubtext}>Update database</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Key Metrics */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics-outline" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Key Metrics</Text>
            </View>
            
            <View style={styles.metricsContainer}>
              <View style={[styles.metricCard, styles.totalClientsCard]}>
                <View style={styles.metricCardHeader}>
                  <View style={styles.metricIconWrapper}>
                    <View style={[styles.metricIconContainer, { backgroundColor: '#EBF8FF' }]}>
                      <Ionicons name="people" size={20} color="#3B82F6" />
                    </View>
                  </View>
                  <View style={styles.metricCardContent}>
                    <Text style={styles.metricNumber}>{clients.length}</Text>
                    <Text style={styles.metricLabel}>Total Clients</Text>
                  </View>
                </View>
                <View style={styles.metricCardFooter}>
                  <View style={styles.metricTrend}>
                    <Ionicons name="trending-up" size={12} color="#10B981" />
                    <Text style={styles.metricTrendText}>+{clients.length} this month</Text>
                  </View>
                </View>
              </View>
              
              <View style={[styles.metricCard, styles.activeClientsCard]}>
                <View style={styles.metricCardHeader}>
                  <View style={styles.metricIconWrapper}>
                    <View style={[styles.metricIconContainer, { backgroundColor: '#F0FDF4' }]}>
                      <Ionicons name="trending-up" size={20} color="#10B981" />
                    </View>
                  </View>
                  <View style={styles.metricCardContent}>
                    <Text style={styles.metricNumber}>
                      {clients.filter(client => {
                        const daysSinceCreated = Math.floor((Date.now() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                        return daysSinceCreated < 30;
                      }).length}
                    </Text>
                    <Text style={styles.metricLabel}>Active Clients</Text>
                  </View>
                </View>
                <View style={styles.metricCardFooter}>
                  <View style={styles.metricTrend}>
                    <Ionicons name="time" size={12} color="#F59E0B" />
                    <Text style={styles.metricTrendText}>Last 30 days</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Recent Clients */}
          {getRecentClients().length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithAction}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="time-outline" size={20} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Recent Clients</Text>
                </View>
                <TouchableOpacity style={styles.viewAllButton} onPress={onViewAllClients}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.recentClientsContainer}>
                {getRecentClients().map((client, index) => (
                  <TouchableOpacity
                    key={client.id}
                    style={styles.recentClientCard}
                    onPress={() => onViewClient(client)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentClientAvatar}>
                      <Text style={styles.recentClientInitials}>
                        {client.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.recentClientInfo}>
                      <Text style={styles.recentClientName}>{client.name}</Text>
                      <Text style={styles.recentClientEmail}>{client.email}</Text>
                      <Text style={styles.recentClientDate}>
                        Added {client.createdAt.toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.recentClientStatus}>
                      <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quick Insights */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Quick Insights</Text>
            </View>
            
            <View style={styles.insightsContainer}>
              <View style={styles.insightCard}>
                <Ionicons name="trophy" size={24} color="#F59E0B" />
                <Text style={styles.insightText}>
                  You've helped {clients.length} clients achieve their goals this month!
                </Text>
              </View>
              
              <View style={styles.insightCard}>
                <Ionicons name="people" size={24} color="#3B82F6" />
                <Text style={styles.insightText}>
                  You have {clients.filter(client => {
                    const daysSinceCreated = Math.floor((Date.now() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                    return daysSinceCreated < 30;
                  }).length} active clients currently!
                </Text>
              </View>
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
    backgroundColor: '#f8fafc',
  },
  greetingSection: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
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
  greetingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  greetingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  contentContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  section: {
    marginBottom: 24,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 10,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 4 },
      opacity: 0.12,
      radius: 8,
      elevation: 4,
    }),
  },
  actionButtonContent: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  addClientButton: {
    backgroundColor: '#10B981',
  },
  manageFoodsButton: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  actionButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 6 },
      opacity: 0.12,
      radius: 12,
      elevation: 6,
    }),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  totalClientsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  activeClientsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricIconWrapper: {
    marginRight: 16,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...createShadowStyle({
      color: '#000',
      offset: { width: 0, height: 2 },
      opacity: 0.1,
      radius: 4,
      elevation: 2,
    }),
  },
  metricCardContent: {
    flex: 1,
  },
  metricCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricTrendText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  metricNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  recentClientsContainer: {
    gap: 12,
  },
  recentClientCard: {
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
  recentClientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recentClientInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  recentClientInfo: {
    flex: 1,
  },
  recentClientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  recentClientEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  recentClientDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  recentClientStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 16,
    lineHeight: 20,
  },
});
