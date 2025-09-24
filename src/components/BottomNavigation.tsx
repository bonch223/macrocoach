import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  userRole: 'coach' | 'client';
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate,
  userRole
}) => {
  const coachTabs = [
    {
      id: 'coach-dashboard',
      label: 'Dashboard',
      icon: 'grid-outline',
      activeIcon: 'grid'
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: 'people-outline',
      activeIcon: 'people'
    },
    {
      id: 'manage-foods',
      label: 'Foods',
      icon: 'restaurant-outline',
      activeIcon: 'restaurant'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings-outline',
      activeIcon: 'settings'
    }
  ];

  const clientTabs = [
    {
      id: 'client-dashboard',
      label: 'Dashboard',
      icon: 'grid-outline',
      activeIcon: 'grid'
    },
    {
      id: 'log-food',
      label: 'Log Food',
      icon: 'add-circle-outline',
      activeIcon: 'add-circle'
    },
    {
      id: 'weight-check',
      label: 'Weight',
      icon: 'fitness-outline',
      activeIcon: 'fitness'
    }
  ];

  const tabs = userRole === 'coach' ? coachTabs : clientTabs;

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onNavigate(tab.id)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name={isActive ? tab.activeIcon as any : tab.icon as any}
                  size={24}
                  color={isActive ? '#3B82F6' : '#6B7280'}
                />
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#6b7280',
  },
  activeTabLabel: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});
