import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PalmiyeIcon } from '@/components/PalmiyeIcon';

interface NetworkContextType {
  showNetworkError: () => void;
}

const NetworkContext = createContext<NetworkContextType>({
  showNetworkError: () => {},
});

export const useNetwork = () => useContext(NetworkContext);

// Singleton so the API layer can trigger it without React hooks
let _showNetworkError: (() => void) | null = null;
export function triggerNetworkError() {
  _showNetworkError?.();
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const cooldownRef = useRef(false);

  const showNetworkError = useCallback(() => {
    // Prevent spamming — 5 second cooldown
    if (cooldownRef.current || visible) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 5000);

    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fadeAnim, scaleAnim]);

  // Register singleton
  React.useEffect(() => {
    _showNetworkError = showNetworkError;
    return () => { _showNetworkError = null; };
  }, [showNetworkError]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [fadeAnim, scaleAnim]);

  return (
    <NetworkContext.Provider value={{ showNetworkError }}>
      {children}
      <Modal
        transparent
        visible={visible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
            {/* Icon circle */}
            <View style={styles.iconCircle}>
              <IconSymbol name="wifi.exclamationmark" size={40} color="#EF4444" />
            </View>

            {/* Title */}
            <Text style={styles.title}>Bağlantı Hatası</Text>

            {/* Message */}
            <Text style={styles.message}>
              Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.
            </Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Dismiss button */}
            <TouchableOpacity style={styles.button} onPress={dismiss} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Tamam</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </NetworkContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: SCREEN_WIDTH - 64,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
