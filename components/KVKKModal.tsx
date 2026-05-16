import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { IconSymbol } from './ui/icon-symbol';

interface KVKKModalProps {
    isVisible: boolean;
    onClose: () => void;
    onAccept?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const KVKKModal: React.FC<KVKKModalProps> = ({ isVisible, onClose, onAccept }) => {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                <TouchableOpacity 
                    style={styles.backdrop} 
                    activeOpacity={1} 
                    onPress={onClose} 
                />
                
                <View style={[styles.modalContainer, { maxHeight: SCREEN_HEIGHT * 0.8, marginBottom: insets.bottom + 20 }]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>KVKK ve Aydınlatma Metni</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <IconSymbol name="xmark.circle.fill" size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
                        <Text style={styles.title}>6698 SAYILI KİŞİSEL VERİLERİN KORUNMASI KANUNU KAPSAMINDA ADAPLUS UYGULAMASI KULLANICILARI İÇİN AYDINLATMA METNİ</Text>
                        
                        <Text style={styles.sectionTitle}>1. Veri Sorumlusu</Text>
                        <Text style={styles.text}>AdaPlus, bir girişim projesi olup aşağıdaki gerçek kişiler tarafından yürütülmektedir:</Text>
                        <Text style={styles.bullet}>• Onur Önüralp — İstanbul</Text>
                        <Text style={styles.bullet}>• Ara Kris Ütücü — İstanbul</Text>
                        <Text style={styles.text}>İletişim: adaplusapp@gmail.com</Text>

                        <Text style={styles.sectionTitle}>2. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi</Text>
                        <Text style={styles.text}>Kişisel verileriniz aşağıdaki yöntemlerle toplanmaktadır:</Text>
                        <Text style={styles.text}>a) Elektronik form aracılığıyla: Uygulama üzerinden hesap oluşturma sırasında ad-soyad, e-posta adresi ve şifre bilgileriniz tarafınızca doğrudan iletilmektedir.</Text>
                        <Text style={styles.text}>b) Otomatik yollarla: Uygulamayı kullandığınızda forum gönderileri, beğeniler ve yanıtlar gibi içerik etkileşimleri sistem tarafından otomatik olarak kaydedilmektedir.</Text>
                        <Text style={styles.text}>c) İleride eklenmesi planlanan özellik kapsamında: Bildirim tercihinizi etkinleştirmeniz halinde push notification token'ı cihazınızdan alınacaktır.</Text>
                        <Text style={styles.text}>Hukuki dayanak: KVKK m.5/2(c) — sözleşmenin kurulması ve ifası; KVKK m.5/2(f) — meşru menfaat.</Text>

                        <Text style={styles.sectionTitle}>3. İşlenen Kişisel Veriler ve Amaçları</Text>
                        <Text style={styles.bullet}>• Ad, Soyad, E-posta: Hesap oluşturma, kimlik doğrulama, şifre sıfırlama ve kullanıcıyla iletişim kurulması.</Text>
                        <Text style={styles.bullet}>• İçerik Etkileşimleri (gönderiler, beğeniler, yanıtlar): Topluluk özelliklerinin sunulması.</Text>
                        <Text style={styles.bullet}>• Push Notification Token (ileride): Forum bildirimleri (beğeni, yanıt) gönderilmesi.</Text>

                        <Text style={styles.sectionTitle}>4. Kişisel Verilerin Aktarımı</Text>
                        <Text style={styles.text}>Kişisel verileriniz yalnızca aşağıdaki üçüncü taraflarla ve belirtilen kapsamda paylaşılmaktadır:</Text>
                        <Text style={styles.bullet}>• Amazon Web Services (AWS SES) — E-posta altyapı sağlayıcısı. Aktarılan veri: Yalnızca e-posta adresi. Amaç: Doğrulama ve bildirim e-postalarının iletimi. AWS'nin gizlilik politikası GDPR ve KVKK ile uyumludur.</Text>
                        <Text style={styles.bullet}>• Yasal zorunluluk: Yetkili kamu kurum ve kuruluşlarının talepleri doğrultusunda, talep kapsamıyla sınırlı olarak.</Text>
                        <Text style={styles.text}>Bunlar dışında hiçbir üçüncü tarafla veri paylaşımı yapılmamaktadır.</Text>

                        <Text style={styles.sectionTitle}>5. Veri Saklama Süresi</Text>
                        <Text style={styles.text}>Verileriniz hesabınız aktif olduğu sürece saklanır. Hesap silme talebinde 30 gün içinde verileriniz silinir veya anonim hale getirilir. Yasal yükümlülükler gerektirdiğinde ilgili mevzuat süreleri esas alınır.</Text>

                        <Text style={styles.sectionTitle}>6. KVKK Kapsamındaki Haklarınız</Text>
                        <Text style={styles.text}>KVKK m.11 uyarınca şu haklara sahipsiniz: verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, işlenme amacını öğrenme, aktarıldığı kişileri öğrenme, düzeltilmesini isteme, silinmesini isteme, otomatik analiz sonucu aleyhine karara itiraz etme, zararın giderilmesini talep etme.</Text>
                        
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.acceptButton} onPress={onAccept || onClose}>
                            <Text style={styles.acceptButtonText}>Okudum, Anladım</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end', // Moved from center to bottom
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingBottom: 40, // Added padding to position it slightly above the very bottom
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center content horizontally
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        position: 'relative', // For absolute positioning of close button
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        textAlign: 'center',
    },
    closeButton: {
        padding: 4,
        position: 'absolute',
        right: 16,
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 16,
        textAlign: 'center',
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#334155',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center', // Center section titles too for consistency if desired, or just the main ones
    },
    text: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
        marginBottom: 8,
    },
    bullet: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
        marginBottom: 4,
        paddingLeft: 8,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    acceptButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
