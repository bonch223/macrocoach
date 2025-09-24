import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showProfileButton?: boolean;
  onProfilePress?: () => void;
  showTime?: boolean;
  currentTime?: Date;
  rightComponent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'MacroCoach',
  subtitle = 'by Rage Fitness Gym',
  showBackButton = false,
  onBackPress,
  showProfileButton = true,
  onProfilePress,
  showTime = true,
  currentTime = new Date(),
  rightComponent,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {/* Header Background Gradient Effect */}
        <View style={styles.headerGradient} />
        
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {showBackButton ? (
                <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                  <View style={styles.backButtonInner}>
                    <Ionicons name="arrow-back" size={22} color="white" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.logoContainer}>
                  <Image 
                    source={require('../../assets/Logo/MacroCoach Logo without Name.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                </View>
              )}
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{title}</Text>
                {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
              </View>
            </View>
            <View style={styles.headerRight}>
              {rightComponent || (
                <View style={styles.rageLogoContainer}>
                  <Image 
                    source={require('../../assets/Logo/Rage Fitness Logo.png')} 
                    style={styles.rageLogo}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1e293b',
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1e293b',
    opacity: 0.95,
  },
  headerContent: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 64,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  backButton: {
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonInner: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    width: 28,
    height: 28,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.3,
    lineHeight: 28,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  headerRight: {
    alignItems: 'center',
  },
  rageLogoContainer: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rageLogo: {
    width: 24,
    height: 24,
  },
});
