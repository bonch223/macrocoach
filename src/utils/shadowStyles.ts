import { Platform } from 'react-native';

/**
 * Creates platform-appropriate shadow styles
 * For web: uses boxShadow CSS property
 * For native: uses shadowColor, shadowOffset, shadowOpacity, shadowRadius
 */
export const createShadowStyle = (config: {
  color?: string;
  offset?: { width: number; height: number };
  opacity?: number;
  radius?: number;
  elevation?: number;
}) => {
  const {
    color = '#000',
    offset = { width: 0, height: 2 },
    opacity = 0.1,
    radius = 4,
    elevation = 2
  } = config;

  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    };
  }

  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: elevation,
  };
};

/**
 * Common shadow presets
 */
export const shadowPresets = {
  small: createShadowStyle({
    offset: { width: 0, height: 1 },
    opacity: 0.05,
    radius: 2,
    elevation: 1,
  }),
  medium: createShadowStyle({
    offset: { width: 0, height: 2 },
    opacity: 0.1,
    radius: 4,
    elevation: 2,
  }),
  large: createShadowStyle({
    offset: { width: 0, height: 4 },
    opacity: 0.15,
    radius: 8,
    elevation: 4,
  }),
  xlarge: createShadowStyle({
    offset: { width: 0, height: 8 },
    opacity: 0.2,
    radius: 16,
    elevation: 8,
  }),
  button: createShadowStyle({
    offset: { width: 0, height: 4 },
    opacity: 0.3,
    radius: 8,
    elevation: 4,
  }),
  card: createShadowStyle({
    offset: { width: 0, height: 2 },
    opacity: 0.1,
    radius: 4,
    elevation: 2,
  }),
};
