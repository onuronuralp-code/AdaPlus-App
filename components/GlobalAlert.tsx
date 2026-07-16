import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert as RNAlert, AlertButton } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

export function GlobalAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
  });

  useEffect(() => {
    const originalAlert = RNAlert.alert;

    // Override the global Alert.alert
    RNAlert.alert = (title, message, buttons) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'Tamam' }],
      });
    };

    return () => {
      // Restore original if component unmounts
      RNAlert.alert = originalAlert;
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

  const isError = alertState.title.toLowerCase().includes('hata') || alertState.title.toLowerCase().includes('error') || alertState.title.toLowerCase().includes('başarısız') || alertState.title.toLowerCase().includes('gerekli');
  const isSuccess = alertState.title.toLowerCase().includes('başarılı') || alertState.title.toLowerCase().includes('success') || alertState.title.toLowerCase().includes('alındı') || alertState.title.toLowerCase().includes('gönderildi');
  const isWarning = alertState.title.toLowerCase().includes('uyarı') || alertState.title.toLowerCase().includes('sil') || alertState.title.toLowerCase().includes('bildir');
  const isSettings = alertState.title.toLowerCase().includes('ayar') || alertState.title.toLowerCase().includes('setting');
  const isLogout = alertState.title.toLowerCase().includes('çıkış') || alertState.title.toLowerCase().includes('logout');
  
  let iconName = 'info.circle.fill';
  let iconColor = '#3B82F6';
  let iconBg = '#EFF6FF';

  if (isError) {
    iconName = 'exclamationmark.circle.fill';
    iconColor = '#EF4444';
    iconBg = '#FEF2F2';
  } else if (isSuccess) {
    iconName = 'checkmark.circle.fill';
    iconColor = '#10B981';
    iconBg = '#ECFDF5';
  } else if (isWarning) {
    iconName = 'exclamationmark.triangle.fill';
    iconColor = '#EF4444';
    iconBg = '#FEF2F2';
  } else if (isSettings) {
    iconName = 'gearshape.fill';
    iconColor = '#64748B';
    iconBg = '#F1F5F9';
  } else if (isLogout) {
    iconName = 'rectangle.portrait.and.arrow.right';
    iconColor = '#EF4444';
    iconBg = '#FEF2F2';
  }


  const renderButtons = () => {
    const buttons = alertState.buttons || [];
    
    // If there's only one button
    if (buttons.length === 1) {
      const btn = buttons[0];
      return (
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isSuccess && { backgroundColor: '#10B981' }]}
          onPress={() => handlePress(btn.onPress)}
        >
          <Text style={styles.primaryButtonText}>{btn.text}</Text>
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
            style={[styles.button, styles.secondaryButton, { flex: 1, marginRight: 8 }]}
            onPress={() => handlePress(cancelBtn.onPress)}
          >
            <Text style={styles.secondaryButtonText} numberOfLines={1} adjustsFontSizeToFit>{cancelBtn.text}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, isDestructive ? styles.destructiveButton : styles.primaryButton, isSuccess && !isDestructive && { backgroundColor: '#10B981' }, { flex: 1, marginLeft: 8 }]}
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
                isCancel ? styles.secondaryButton : (isDestructive ? styles.destructiveButton : styles.primaryButton),
                isSuccess && !isCancel && !isDestructive && { backgroundColor: '#10B981' }
              ]}
              onPress={() => handlePress(btn.onPress)}
            >
              <Text style={[
                isCancel ? styles.secondaryButtonText : (isDestructive ? styles.destructiveButtonText : styles.primaryButtonText)
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
      onRequestClose={() => handlePress(alertState.buttons?.find(b => b.style === 'cancel')?.onPress)}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <IconSymbol name={iconName as any} size={28} color={iconColor} />
          </View>
          
          <Text style={styles.title}>{alertState.title}</Text>
          {alertState.message ? <Text style={styles.message}>{alertState.message}</Text> : null}

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
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Dark overlay #0F172A
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
    borderRadius: 32,
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
    borderRadius: 16,
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
