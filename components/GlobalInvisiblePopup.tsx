import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text } from 'react-native';

export const GlobalPopupController = {
  show: (content?: React.ReactNode) => {},
  hide: () => {},
};

export function GlobalInvisiblePopup() {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<React.ReactNode>(null);

  useEffect(() => {
    GlobalPopupController.show = (newContent?: React.ReactNode) => {
      if (newContent) setContent(newContent);
      setVisible(true);
    };
    GlobalPopupController.hide = () => {
      setVisible(false);
      setContent(null);
    };
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          {content ? content : (
            <>
              <Text style={styles.title}>Büyük Pop-up Alanı</Text>
              <Text style={styles.text}>Bu alan uygulamanın her yerinden erişilebilir şekilde tasarlandı. Herhangi bir sayfadan GlobalPopupController.show() kullanarak açabilirsiniz.</Text>
            </>
          )}
          
          <TouchableOpacity style={styles.button} onPress={() => GlobalPopupController.hide()}>
            <Text style={styles.buttonText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupContainer: {
    backgroundColor: '#fff',
    width: '100%',
    minHeight: 400,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    color: '#0F172A',
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 'auto',
  },
  buttonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  }
});
