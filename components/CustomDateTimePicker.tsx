import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface CustomDateTimePickerProps {
    visible: boolean;
    value: Date;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
    title?: string;
    accentColor?: string;
}

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function CustomDateTimePicker({ visible, value, onConfirm, onCancel, title = 'Tarih ve Saat Seçin', accentColor = '#3B82F6' }: CustomDateTimePickerProps) {
    const [selectedDate, setSelectedDate] = useState(new Date(value));
    const [viewYear, setViewYear] = useState(value.getFullYear());
    const [viewMonth, setViewMonth] = useState(value.getMonth());
    const [hour, setHour] = useState(value.getHours());
    const [minute, setMinute] = useState(value.getMinutes());

    useEffect(() => {
        if (visible) {
            setSelectedDate(new Date(value));
            setViewYear(value.getFullYear());
            setViewMonth(value.getMonth());
            setHour(value.getHours());
            setMinute(value.getMinutes());
        }
    }, [visible, value]);

    const calendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(viewYear, viewMonth);
        const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
        const days: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        return days;
    }, [viewYear, viewMonth]);

    const handlePrevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
        else setViewMonth(viewMonth - 1);
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
        else setViewMonth(viewMonth + 1);
    };

    const handleDayPress = (day: number) => {
        const newDate = new Date(viewYear, viewMonth, day, hour, minute);
        setSelectedDate(newDate);
    };

    const handleConfirm = () => {
        const finalDate = new Date(selectedDate);
        finalDate.setHours(hour, minute, 0, 0);
        onConfirm(finalDate);
    };

    const incrementHour = () => setHour(h => (h + 1) % 24);
    const decrementHour = () => setHour(h => (h - 1 + 24) % 24);
    const incrementMinute = () => setMinute(m => (m + 1) % 60);
    const decrementMinute = () => setMinute(m => (m - 1 + 60) % 60);

    const isSelectedDay = (day: number) => {
        return selectedDate.getDate() === day &&
               selectedDate.getMonth() === viewMonth &&
               selectedDate.getFullYear() === viewYear;
    };

    const isToday = (day: number) => {
        const today = new Date();
        return today.getDate() === day &&
               today.getMonth() === viewMonth &&
               today.getFullYear() === viewYear;
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                    </View>

                    {/* Calendar Navigation */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                            <IconSymbol name="chevron.left" size={18} color="#64748B" />
                        </TouchableOpacity>
                        <Text style={styles.monthLabel}>{MONTHS_TR[viewMonth]} {viewYear}</Text>
                        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                            <IconSymbol name="chevron.right" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Day Headers */}
                    <View style={styles.dayHeaders}>
                        {DAYS_TR.map(d => (
                            <Text key={d} style={styles.dayHeaderText}>{d}</Text>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendarGrid}>
                        {calendarDays.map((day, i) => (
                            <View key={i} style={styles.dayCell}>
                                {day !== null ? (
                                    <TouchableOpacity
                                        style={[
                                            styles.dayButton,
                                            isSelectedDay(day) && [styles.dayButtonSelected, { backgroundColor: accentColor }],
                                            isToday(day) && !isSelectedDay(day) && styles.dayButtonToday,
                                        ]}
                                        onPress={() => handleDayPress(day)}
                                    >
                                        <Text style={[
                                            styles.dayText,
                                            isSelectedDay(day) && styles.dayTextSelected,
                                            isToday(day) && !isSelectedDay(day) && [styles.dayTextToday, { color: accentColor }],
                                        ]}>{day}</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ))}
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Time Picker */}
                    <View style={styles.timeSection}>
                        <Text style={styles.timeLabel}>SAAT</Text>
                        <View style={styles.timePickerRow}>
                            {/* Hour */}
                            <View style={styles.timeColumn}>
                                <TouchableOpacity onPress={incrementHour} style={styles.timeArrow}>
                                    <IconSymbol name="chevron.up" size={20} color="#64748B" />
                                </TouchableOpacity>
                                <View style={[styles.timeValueBox, { borderColor: accentColor }]}>
                                    <Text style={[styles.timeValue, { color: accentColor }]}>{String(hour).padStart(2, '0')}</Text>
                                </View>
                                <TouchableOpacity onPress={decrementHour} style={styles.timeArrow}>
                                    <IconSymbol name="chevron.down" size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.timeSeparator}>:</Text>

                            {/* Minute */}
                            <View style={styles.timeColumn}>
                                <TouchableOpacity onPress={incrementMinute} style={styles.timeArrow}>
                                    <IconSymbol name="chevron.up" size={20} color="#64748B" />
                                </TouchableOpacity>
                                <View style={[styles.timeValueBox, { borderColor: accentColor }]}>
                                    <Text style={[styles.timeValue, { color: accentColor }]}>{String(minute).padStart(2, '0')}</Text>
                                </View>
                                <TouchableOpacity onPress={decrementMinute} style={styles.timeArrow}>
                                    <IconSymbol name="chevron.down" size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                            <Text style={styles.cancelButtonText}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.confirmButton, { backgroundColor: accentColor }]} onPress={handleConfirm}>
                            <Text style={styles.confirmButtonText}>Tamam</Text>
                        </TouchableOpacity>
                    </View>
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
    container: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 32,
        elevation: 12,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    navButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    dayHeaders: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 4,
    },
    dayHeaderText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    dayButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayButtonSelected: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    dayButtonToday: {
        backgroundColor: '#F1F5F9',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
    },
    dayTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    dayTextToday: {
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 24,
    },
    timeSection: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        alignItems: 'center',
    },
    timeLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    timePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeColumn: {
        alignItems: 'center',
        gap: 6,
    },
    timeArrow: {
        width: 44,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeValueBox: {
        width: 64,
        height: 52,
        borderRadius: 14,
        borderWidth: 2,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeValue: {
        fontSize: 28,
        fontWeight: '800',
    },
    timeSeparator: {
        fontSize: 28,
        fontWeight: '800',
        color: '#CBD5E1',
        marginBottom: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 8,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748B',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    confirmButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});
