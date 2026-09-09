import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert as RNAlert, AlertButton } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

// Module-level (not component-state) so the override survives regardless of any single
// GlobalAlert instance's mount/unmount lifecycle. Previously the override was installed
// and torn down inside a useEffect tied to one component instance — if that instance ever
// unmounted and remounted (Fast Refresh, React StrictMode's dev-mode double-invoke, a
// parent re-render), the override could end up pointing at a dead instance's setState,
// silently swallowing every Alert.alert call app-wide with no error at all.
const originalAlert = RNAlert.alert;
let showAlertImpl: ((state: AlertState) => void) | null = null;

RNAlert.alert = (title, message, buttons) => {
  if (showAlertImpl) {
    showAlertImpl({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'Tamam' }],
    });
  } else {
    // No live renderer registered — fall back to the real native alert rather than
    // silently doing nothing.
    originalAlert(title, message, buttons);
  }
};

export function GlobalAlert() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
  });

  useEffect(() => {
    showAlertImpl = setAlertState;
    return () => {
      // Only clear if we're still the registered instance — an out-of-order unmount
      // from a stale instance must not clobber a newer instance's registration.
      if (showAlertImpl === setAlertState) {
        showAlertImpl = null;
      }
    };
  }, []);

  const handlePress = (onPress?: () => void) => {
    setAlertState((prev) => ({ ...prev, visible: false }));
    if (onPress) {
      setTimeout(() => {
        onPress();
      }, 100);
    }
  };

  if (!alertState.visible) return null;

  const isError = alertState.title.toLowerCase().includes('hata') || alertState.title.toLowerCase().includes('error') || alertState.title.toLowerCase().includes('başarısız') || alertState.title.toLowerCase().includes('failed') || alertState.title.toLowerCase().includes('erişim') || alertState.title.toLowerCase().includes('access') || alertState.title.toLowerCase().includes('deaktif') || alertState.title.toLowerCase().includes('disabled') || alertState.title.toLowerCase().includes('kapalı') || alertState.title.toLowerCase().includes('bakım');
  const isSuccess = alertState.title.toLowerCase().includes('başarılı') || alertState.title.toLowerCase().includes('success') || alertState.title.toLowerCase().includes('tebrik') || alertState.title.toLowerCase().includes('harika');
  const isWarning = alertState.title.toLowerCase().includes('uyarı') || alertState.title.toLowerCase().includes('warning') || alertState.title.toLowerCase().includes('dikkat');
  const isDelivery = alertState.title.toLowerCase().includes('paket') || 
                     alertState.title.toLowerCase().includes('delivery') ||
                     (alertState.message?.toLowerCase().includes('paket servis') ?? false) ||
                     (alertState.message?.toLowerCase().includes('delivery service') ?? false);
  
  let iconName = 'info.circle.fill';
  let iconColor = '#3B82F6';
  let iconBg = '#EFF6FF';

  if (isError) {
    iconName = 'exclamationmark.triangle.fill';
    iconColor = '#EF4444';
    iconBg = '#FEF2F2';
  } else if (isSuccess) {
    iconName = 'checkmark.circle.fill';
    iconColor = '#10B981';
    iconBg = '#ECFDF5';
  } else if (isWarning) {
    iconName = 'exclamationmark.triangle.fill';
    iconColor = '#F59E0B';
    iconBg = '#FFFBEB';
  } else if (isDelivery) {
    iconName = 'bag.fill';
    iconColor = '#8B5CF6';
    iconBg = '#EDE9FE';
  }

  if (isDark) {
    if (isError) iconBg = '#450A0A';
    else if (isWarning) iconBg = '#451A03';
    else if (isSuccess) iconBg = '#064E3B';
    else if (isDelivery) iconBg = '#2E1065';
    else iconBg = '#1E1B4B';
  }

  const renderButtons = () => {
    const buttons = alertState.buttons || [];
    
    // If there's only one button
    if (buttons.length === 1) {
      const btn = buttons[0];
      const buttonText = isDelivery && (btn.text === 'Tamam' || btn.text === 'OK') ? 'Anladım' : btn.text;
      return (
        <TouchableOpacity
          style={[
            styles.button, 
            styles.primaryButton, 
            isSuccess && { backgroundColor: '#10B981' },
            isDelivery && { backgroundColor: '#8B5CF6' }
          ]}
          onPress={() => handlePress(btn.onPress)}
        >
          <Text style={styles.primaryButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      );
    }

    // If there are exactly two buttons (usually Cancel and Confirm)
    if (buttons.length === 2) {
      const isFirstCancel = buttons[0].style === 'cancel';
      const cancelBtn = isFirstCancel ? buttons[0] : buttons[1];
      const confirmBtn = isFirstCancel ? buttons[1] : buttons[0];
      
      const isDestructive = confirmBtn.style === 'destructive' || isWarning || isError;

      return (
        <View style={styles.twoButtonRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, isDark && { backgroundColor: '#27272A' }, { flex: 1, marginRight: 8 }]}
            onPress={() => handlePress(cancelBtn.onPress)}
          >
            <Text style={[styles.secondaryButtonText, isDark && { color: '#E4E4E7' }]} numberOfLines={1} adjustsFontSizeToFit>{cancelBtn.text}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button, 
              isDestructive ? styles.destructiveButton : styles.primaryButton, 
              isSuccess && !isDestructive && { backgroundColor: '#10B981' }, 
              isDelivery && !isDestructive && { backgroundColor: '#8B5CF6' },
              { flex: 1, marginLeft: 8 }
            ]}
            onPress={() => handlePress(confirmBtn.onPress)}
          >
            <Text style={isDestructive ? styles.destructiveButtonText : styles.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit>{confirmBtn.text}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // If 3 or more buttons, render vertically
    return (
      <View style={{ width: '100%', gap: 12 }}>
        {buttons.map((btn, index) => {
          const isCancel = btn.style === 'cancel';
          const isDestructive = btn.style === 'destructive';
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.button,
                isCancel ? (isDark ? { backgroundColor: '#27272A' } : styles.secondaryButton) : (isDestructive ? styles.destructiveButton : styles.primaryButton),
                isSuccess && !isCancel && !isDestructive && { backgroundColor: '#10B981' },
                isDelivery && !isCancel && !isDestructive && { backgroundColor: '#8B5CF6' }
              ]}
              onPress={() => handlePress(btn.onPress)}
            >
              <Text style={[
                isCancel ? (isDark ? { color: '#E4E4E7' } : styles.secondaryButtonText) : (isDestructive ? styles.destructiveButtonText : styles.primaryButtonText)
              ]}>
                {btn.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Modal
      transparent
      visible={alertState.visible}
      animationType="fade"
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      onRequestClose={() => handlePress(alertState.buttons?.find(b => b.style === 'cancel')?.onPress)}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertContainer, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#27272A' }]}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }, isDelivery && { marginBottom: 16 }]}>
            <IconSymbol name={iconName as any} size={isDelivery ? 32 : 28} color={iconColor} />
          </View>
          
          {isDelivery ? (
            <View style={{ backgroundColor: isDark ? '#2E1065' : '#EDE9FE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 16 }}>
              <Text style={{ color: '#8B5CF6', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>
                {alertState.title.toLowerCase().includes('delivery') || alertState.title.toLowerCase().includes('soon')
                  ? 'COMING SOON'
                  : 'YAKINDA'}
              </Text>
            </View>
          ) : (
            <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>{alertState.title}</Text>
          )}
          {alertState.message ? (
            <Text
              style={[
                styles.message,
                isDark && { color: '#CBD5E1' },
                isDelivery && {
                  fontSize: 14,
                  fontWeight: '500',
                  lineHeight: 22,
                  color: isDark ? '#FFFFFF' : '#000000',
                  marginBottom: 24,
                },
              ]}
            >
              {alertState.message}
            </Text>
          ) : null}

          <View style={styles.buttonContainer}>
            {renderButtons()}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  twoButtonRow: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
