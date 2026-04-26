import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
    Platform,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import AnimatedRE, { FadeInDown, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { fetchDepartures } from "../services/api";
import { IconSymbol } from "./ui/icon-symbol";

interface FerryRoute {
  id: string;
  departure: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  type: "Vapur" | "Motor";
  provider: string;
  isDirect: boolean;
  via?: string[];
}

const ISLANDS = ["Kınalıada", "Burgazada", "Heybeliada", "Büyükada"];
const MAINLAND = ["Kabataş", "Bostancı", "Kadıköy", "Beşiktaş"];
const ALL_LOCATIONS = [...ISLANDS, ...MAINLAND];
const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TRANSIT_MINUTES: Record<string, Record<string, number>> = {
  Kınalıada: { Burgazada: 15, Heybeliada: 30, Büyükada: 50, Bostancı: 25, Kabataş: 80, Kadıköy: 65, Beşiktaş: 90 },
  Burgazada: { Kınalıada: 15, Heybeliada: 15, Büyükada: 35, Bostancı: 35, Kabataş: 90, Kadıköy: 70, Beşiktaş: 100 },
  Heybeliada: { Kınalıada: 30, Burgazada: 15, Büyükada: 20, Bostancı: 50, Kabataş: 100, Kadıköy: 80 },
  Büyükada: { Kınalıada: 50, Burgazada: 35, Heybeliada: 20, Bostancı: 60, Kabataş: 110, Kadıköy: 90 },
  Bostancı: { Kınalıada: 25, Burgazada: 35, Heybeliada: 50, Büyükada: 60 },
  Kabataş: { Kınalıada: 80, Burgazada: 90, Heybeliada: 100, Büyükada: 110, Kadıköy: 30 },
  Kadıköy: { Kınalıada: 65, Büyükada: 90, Kabataş: 30 },
  Beşiktaş: { Kınalıada: 90, Büyükada: 110 },
};

const addMinutes = (time: string, mins: number): string => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const rh = Math.floor(total / 60) % 24;
  const rm = total % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
};

const getArrivalTime = (from: string, to: string, departureTime: string): string | null => {
  const mins = TRANSIT_MINUTES[from]?.[to];
  if (!mins) return null;
  return addMinutes(departureTime, mins);
};

const getRouteTimeValue = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const DEV_ALWAYS_TRACKABLE = true;

const getTrackingStatus = (route: FerryRoute, selectedDate: Date) => {
  if (DEV_ALWAYS_TRACKABLE) return { trackable: true, message: "Live tracking active" };
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  if (!isToday) return { trackable: false, message: "Only today's trips" };
  return { trackable: true, message: "Live tracking active" };
};

export function FerrySchedule() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const [destination, setDestination] = useState("Unselected");
  const [departure, setDeparture] = useState("Unselected");
  const [showDepartureDropdown, setShowDepartureDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [onlyDirect, setOnlyDirect] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<FerryRoute | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [ferryData, setFerryData] = useState<FerryRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(true);

  const calendarScrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Optimized Calendar Days (60 days scope)
  const monthDays = useMemo(() => {
    const today = new Date();
    const days: Date[] = [];
    for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push(d);
    }
    return days;
  }, []);

  const DAY_NAMES = i18n.language === 'tr' 
    ? ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const MONTHS = i18n.language === 'tr' ? MONTHS_TR : MONTHS_EN;

  useEffect(() => {
    const loadData = async () => {
      if (destination === "Unselected") {
        setFerryData([]);
        return;
      }
      setLoading(true);
      try {
        const froms = departure === "Unselected" ? ALL_LOCATIONS : [departure];
        const isTodaySelection = selectedDate.toDateString() === new Date().toDateString();
        const dateStr = (isTodaySelection && isLiveMode)
          ? undefined
          : `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

        const pairs = froms.filter(f => f !== destination).map(from => ({ from, to: destination }));
        const results = await Promise.all(pairs.map(p => fetchDepartures(p.from, p.to, dateStr)));
        
        const allRoutes: FerryRoute[] = [];
        results.forEach((data, idx) => {
          const { from, to } = pairs[idx];
          data.forEach(dto => {
            allRoutes.push({
              id: `${dto.from}|${dto.to}|${dto.time}|${dto.provider}`,
              departure: dto.from,
              destination: dto.to,
              departureTime: dto.time,
              arrivalTime: getArrivalTime(dto.from, dto.to, dto.time) || "",
              type: (dto.provider === "Şehir Hatları" ? "Vapur" : "Motor") as "Vapur" | "Motor",
              provider: dto.provider,
              isDirect: !dto.via || dto.via.length === 0,
              via: dto.via,
            });
          });
        });

        // De-duplicate: Keep only one entry for same departure, time, and provider
        const uniqueRoutesMap = new Map();
        allRoutes.forEach(route => {
          const key = `${route.departure}|${route.departureTime}|${route.provider}`;
          if (!uniqueRoutesMap.has(key)) {
            uniqueRoutesMap.set(key, route);
          }
        });
        
        setFerryData(Array.from(uniqueRoutesMap.values()).sort((a, b) => a.departureTime.localeCompare(b.departureTime)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [destination, departure, selectedDate]);

  const filteredData = useMemo(() => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return ferryData.filter(item => {
      if (onlyDirect && !item.isDirect) return false;
      if (isToday && isLiveMode) {
        const routeTime = getRouteTimeValue(item.departureTime);
        if (routeTime < nowMinutes) return false;
      }
      return true;
    });
  }, [ferryData, onlyDirect, selectedDate, isLiveMode]);

  const handleSwap = () => {
    if (departure === "Unselected" || destination === "Unselected") return;
    const temp = departure;
    setDeparture(destination);
    setDestination(temp);
  };

  const handleScheduleTypeSelect = (type: 'today' | 'weekday' | 'holiday') => {
    const today = new Date();
    const day = today.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    
    let target = new Date(today);
    if (type === 'today') {
        target = new Date(today);
        setIsLiveMode(true);
    } else if (type === 'weekday') {
        // If today is weekday/Sat, use same day next week to get full schedule from backend
        // If Sunday, use tomorrow
        if (day === 0) {
            target.setDate(today.getDate() + 1);
        } else {
            target.setDate(today.getDate() + 7);
        }
        setIsLiveMode(false);
    } else {
        // If Sunday, use same day next week
        // If weekday, use next Sunday
        if (day === 0) {
            target.setDate(today.getDate() + 7);
        } else {
            target.setDate(today.getDate() + (7 - day));
        }
        setIsLiveMode(false);
    }
    
    setSelectedDate(target);
    setShowDatePicker(false);
  };



  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
            <View style={styles.headerTitles}>
                <Text style={styles.headerTitle}>{t("common.ferrySchedule")}</Text>
            </View>
        </View>

        <View style={styles.largeRouteCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeCol}>
                <Text style={styles.largeLabel}>{t("common.from")}</Text>
                <TouchableOpacity onPress={() => setShowDepartureDropdown(true)} style={styles.largePlaceBtn}>
                    <Text 
                        style={[styles.largePlaceText, departure === "Unselected" && styles.placeholder]} 
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {departure === "Unselected" ? (i18n.language === 'tr' ? "Kalkış" : "Origin") : departure}
                    </Text>
                </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
                style={[styles.largeSwapBtn, (departure === "Unselected" || destination === "Unselected") && styles.swapDisabled]} 
                onPress={handleSwap}
                disabled={departure === "Unselected" || destination === "Unselected"}
            >
                <IconSymbol name="arrow.left.and.right" size={18} color="#fff" />
            </TouchableOpacity>

            <View style={styles.routeCol}>
                <Text style={styles.largeLabel}>{t("common.to")}</Text>
                <TouchableOpacity onPress={() => setShowDestinationDropdown(true)} style={styles.largePlaceBtn}>
                    <Text 
                        style={[styles.largePlaceText, destination === "Unselected" && styles.placeholder]} 
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {destination === "Unselected" ? (i18n.language === 'tr' ? "Varış" : "Destination") : destination}
                    </Text>
                </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.largeFilterBar}>
            <TouchableOpacity style={styles.filterItem} onPress={() => setOnlyDirect(!onlyDirect)}>
                <View style={[styles.miniCheck, onlyDirect && styles.miniCheckOn]}>
                    {onlyDirect && <IconSymbol name="checkmark" size={10} color="#fff" />}
                </View>
                <Text style={styles.filterLabel}>{t("common.directOnly")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.calendarTrigger}>
                <IconSymbol name="calendar" size={20} color="#EA580C" />
                <Text style={styles.scheduleTypeText}>
                    {(selectedDate.toDateString() === new Date().toDateString() && isLiveMode)
                        ? (i18n.language === 'tr' ? "Bugün" : "Today")
                        : (selectedDate.getDay() === 0 
                            ? (i18n.language === 'tr' ? "Pazar / Tatil" : "Sun / Holiday")
                            : (i18n.language === 'tr' ? "Haftaiçi / Cmt" : "Weekday / Sat"))}
                </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showDatePicker && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <TouchableOpacity 
            style={styles.modalBg} 
            activeOpacity={1} 
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>{i18n.language === 'tr' ? "Tarife Seçimi" : "Select Schedule"}</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <IconSymbol name="xmark.circle.fill" size={28} color="#F1F5F9" />
                    </TouchableOpacity>
                </View>
                
                <View style={{ gap: 12, paddingBottom: 40 }}>
                    <TouchableOpacity 
                        style={[
                            styles.scheduleOption, 
                            (selectedDate.toDateString() === new Date().toDateString() && isLiveMode) && styles.scheduleOptionActive
                        ]} 
                        onPress={() => handleScheduleTypeSelect('today')}
                    >
                        <View style={[styles.optionIconBox, { backgroundColor: '#ECFDF5' }]}>
                            <IconSymbol name="clock.fill" size={20} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>{i18n.language === 'tr' ? "Bugün" : "Today"}</Text>
                            <Text style={styles.optionSub}>{i18n.language === 'tr' ? "Şu anki saatten itibaren kalkacak tüm seferler" : "All departures from the current time onwards"}</Text>
                        </View>
                        { (selectedDate.toDateString() === new Date().toDateString() && isLiveMode) && <IconSymbol name="checkmark.circle.fill" size={24} color="#EA580C" />}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[
                            styles.scheduleOption, 
                            (selectedDate.getDay() !== 0 && !isLiveMode) && styles.scheduleOptionActive
                        ]} 
                        onPress={() => handleScheduleTypeSelect('weekday')}
                    >
                        <View style={[styles.optionIconBox, { backgroundColor: '#F0F9FF' }]}>
                            <IconSymbol name="briefcase.fill" size={20} color="#0284C7" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>{i18n.language === 'tr' ? "Haftaiçi ve Cumartesi" : "Weekdays & Saturday"}</Text>
                            <Text style={styles.optionSub}>{i18n.language === 'tr' ? "Ek seferler hariç genel tarife" : "General schedule excluding extra trips"}</Text>
                        </View>
                        {(selectedDate.getDay() !== 0 && !isLiveMode) && <IconSymbol name="checkmark.circle.fill" size={24} color="#EA580C" />}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[
                            styles.scheduleOption, 
                            (selectedDate.getDay() === 0 && !isLiveMode) && styles.scheduleOptionActive
                        ]} 
                        onPress={() => handleScheduleTypeSelect('holiday')}
                    >
                        <View style={[styles.optionIconBox, { backgroundColor: '#FFF7ED' }]}>
                            <IconSymbol name="sun.max.fill" size={20} color="#EA580C" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>{i18n.language === 'tr' ? "Pazar ve Tatil Günleri" : "Sunday & Public Holidays"}</Text>
                            <Text style={styles.optionSub}>{i18n.language === 'tr' ? "Tüm gün geçerli pazar tarifesi" : "Full Sunday schedule for all day"}</Text>
                        </View>
                        {(selectedDate.getDay() === 0 && !isLiveMode) && <IconSymbol name="checkmark.circle.fill" size={24} color="#EA580C" />}
                    </TouchableOpacity>
                </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}


      {/* Body */}
       <View style={styles.bodyWrapper}>
            <AnimatedRE.ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View style={styles.loader}><ActivityIndicator size="large" color="#EA580C" /></View>
                ) : destination === "Unselected" ? (
                    <View style={styles.empty}>
                        <IconSymbol name="ferry" size={56} color="#EA580C" />
                        <Text style={styles.emptyTitle}>{i18n.language === 'tr' ? "Sefer Seç" : "Select Trip"}</Text>
                        <Text style={styles.emptySub}>{i18n.language === 'tr' ? "Nereye gitmek istersin?" : "Where would you like to go?"}</Text>

                    </View>
                ) : filteredData.length === 0 ? (
                    <View style={styles.empty}>
                        <IconSymbol name="calendar.badge.exclamationmark" size={56} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>{t("common.noDepartures")}</Text>
                        <Text style={styles.emptySub}>{i18n.language === 'tr' ? "Bu tarih için sefer kalmadı." : "No trips left for this date."}</Text>
                    </View>
                ) : (
                    filteredData.map((item, idx) => (
                        <AnimatedRE.View key={item.id} entering={FadeInDown.delay(idx * 50).duration(400)}>
                            <TripTripCard item={item} onPress={() => setSelectedTrip(item)} isNext={isLiveMode && idx === 0} t={t} i18n={i18n} />
                        </AnimatedRE.View>
                    ))
                )}
            </AnimatedRE.ScrollView>
       </View>

      {/* Date Picker Removed */}


      {/* Pickers & Modals */}
      <LocationPicker visible={showDepartureDropdown} onClose={() => setShowDepartureDropdown(false)} onSelect={setDeparture} selected={departure} title={t("common.from")} t={t} />
      <LocationPicker visible={showDestinationDropdown} onClose={() => setShowDestinationDropdown(false)} onSelect={setDestination} selected={destination} title={t("common.to")} t={t} />
      {selectedTrip && (
        <TripDetailPopup 
          trip={selectedTrip} 
          onClose={() => setSelectedTrip(null)} 
          onTrack={() => {
            setSelectedTrip(null);
            router.push({
                pathname: "../ferry-tracking",
                params: {
                    tripId: selectedTrip.id,
                    from: selectedTrip.departure,
                    to: selectedTrip.destination,
                    departureTime: selectedTrip.departureTime,
                    arrivalTime: selectedTrip.arrivalTime,
                    provider: selectedTrip.provider,
                    type: selectedTrip.type,
                },
            });
          }}
          status={getTrackingStatus(selectedTrip, selectedDate)}
          t={t} i18n={i18n}
        />
      )}
    </View>
  );
}

function TripTripCard({ item, onPress, isNext, t, i18n }: any) {
    return (
        <TouchableOpacity style={[styles.card, isNext && styles.cardNext]} onPress={onPress}>
            {isNext && <View style={styles.nextBadge}><Text style={styles.nextText}>{t('common.next')}</Text></View>}
            <View style={styles.cardContent}>
                <View style={styles.timeGroup}>
                    <Text style={styles.timeMain}>{item.departureTime}</Text>
                    <View style={styles.timeLine}><View style={styles.tDot} /><View style={styles.tBar} /><View style={styles.tDot} /></View>
                    <Text style={styles.timeArrive}>{item.arrivalTime || "--:--"}</Text>
                </View>
                <View style={styles.infoGroup}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                        <View style={[styles.typeBadge, { backgroundColor: item.type === 'Vapur' ? '#FFF7ED' : '#F0F9FF', marginBottom: 0 }]}>
                            <IconSymbol name="ferry.fill" size={10} color={item.type === 'Vapur' ? '#EA580C' : '#0284C7'} />
                            <Text style={[styles.typeText, { color: item.type === 'Vapur' ? '#EA580C' : '#0284C7' }]}>{item.type === 'Vapur' ? t('common.ferry') : t('common.motorboat')}</Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: item.isDirect ? '#ECFDF5' : '#F5F3FF', marginBottom: 0 }]}>
                            <IconSymbol name={item.isDirect ? "bolt.fill" : "arrow.triangle.branch"} size={10} color={item.isDirect ? '#059669' : '#7C3AED'} />
                            <Text style={[styles.typeText, { color: item.isDirect ? '#059669' : '#7C3AED' }]}>{item.isDirect ? t('common.directOnly').toUpperCase() : (i18n.language === 'tr' ? "AKTARMALI" : "VIA STOPS")}</Text>
                        </View>
                    </View>
                    <Text style={styles.portLabel}>{t("places." + item.departure, { defaultValue: item.departure })} → {t("places." + item.destination, { defaultValue: item.destination })}</Text>
                    <Text style={styles.providerLabel}>{item.provider}</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color="#E2E8F0" />
            </View>
        </TouchableOpacity>
    );
}

function LocationPicker({ visible, onClose, onSelect, selected, title, t }: any) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalBg}>
                <View style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}><IconSymbol name="xmark.circle.fill" size={28} color="#F1F5F9" /></TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={styles.sheetSectionHeader}>
                            <View style={[styles.sectionIconBox, { backgroundColor: '#FFF7ED' }]}>
                                <IconSymbol name="beach.umbrella.fill" size={18} color="#EA580C" />
                            </View>
                            <Text style={[styles.sheetSec, { color: '#EA580C' }]}>ADALAR</Text>
                        </View>
                        <View style={styles.islandsGrid}>
                            {ISLANDS.map(l => (
                                <TouchableOpacity 
                                    key={l} 
                                    style={[styles.islandGridItem, selected === l && styles.islandGridItemActive]} 
                                    onPress={() => { onSelect(l); onClose(); }}
                                >
                                    <Text style={[styles.islandGridText, selected === l && styles.islandGridTextOn]}>{t("places." + l, { defaultValue: l })}</Text>
                                    {selected === l && <IconSymbol name="checkmark.circle.fill" size={16} color="#EA580C" style={styles.gridCheck} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={[styles.sheetSectionHeader, { marginTop: 32 }]}>
                            <View style={[styles.sectionIconBox, { backgroundColor: '#F0F9FF' }]}>
                                <IconSymbol name="building.2.fill" size={18} color="#0284C7" />
                            </View>
                            <Text style={[styles.sheetSec, { color: '#0284C7' }]}>ANAKARA</Text>
                        </View>
                        <View style={styles.mainlandList}>
                            {MAINLAND.map(l => (
                                <TouchableOpacity 
                                    key={l} 
                                    style={[styles.mainlandListItem, selected === l && styles.mainlandListItemActive]} 
                                    onPress={() => { onSelect(l); onClose(); }}
                                >
                                    <Text style={[styles.mainlandListText, selected === l && styles.mainlandListTextOn]}>{t("places." + l, { defaultValue: l })}</Text>
                                    {selected === l && <IconSymbol name="checkmark.circle.fill" size={20} color="#0284C7" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function TripDetailPopup({ trip, onClose, onTrack, status, i18n, t }: any) {
    const timeline = React.useMemo(() => {
        if (!trip.via || trip.via.length === 0) return [];
        let tt: { stop: string; time: string }[] = [];
        let currTime = trip.departureTime;
        let currStop = trip.departure;
        
        trip.via.forEach((v: string) => {
            const mins = TRANSIT_MINUTES[currStop]?.[v];
            if (mins) {
                currTime = addMinutes(currTime, mins);
                tt.push({ stop: v, time: currTime });
                currStop = v;
            }
        });
        return tt;
    }, [trip]);

    return (
        <Modal transparent animationType="fade">
            <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={styles.popup}>
                    <View style={styles.popupTop}>
                        <View style={[styles.popupIcon, { backgroundColor: trip.type === 'Vapur' ? '#FFF7ED' : '#F0F9FF' }]}>
                            <IconSymbol name="ferry.fill" size={28} color={trip.type === 'Vapur' ? '#EA580C' : '#0284C7'} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.popupTitle}>{t("places." + trip.departure, { defaultValue: trip.departure })} - {t("places." + trip.destination, { defaultValue: trip.destination })}</Text>
                            <Text style={styles.popupSub}>{trip.provider}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.popupTimes}>
                        <View style={styles.pTimeCol}><Text style={styles.pTimeLab}>KALKIŞ</Text><Text style={styles.pTimeVal}>{trip.departureTime}</Text></View>
                        <IconSymbol name="arrow.right" size={20} color="#EA580C" />
                        <View style={styles.pTimeCol}><Text style={styles.pTimeLab}>VARIŞ</Text><Text style={styles.pTimeVal}>{trip.arrivalTime || "--:--"}</Text></View>
                    </View>

                    {timeline.length > 0 && (
                        <View style={styles.viaSection}>
                            <Text style={styles.viaTitle}>{i18n.language === 'tr' ? "GÜZERGAH" : "ROUTE"}</Text>
                            <View style={styles.timelineList}>
                                <View style={styles.timelineItem}>
                                    <View style={styles.timelineDotLine}>
                                        <View style={[styles.timelineDot, { backgroundColor: '#3B82F6' }]} />
                                        <View style={styles.timelineLine} />
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={[styles.timelineStop, { fontWeight: '800' }]} numberOfLines={1}>{t("places." + trip.departure, { defaultValue: trip.departure })}</Text>
                                        <Text style={[styles.timelineTime, { fontWeight: '800' }]} numberOfLines={1}>{trip.departureTime}</Text>
                                    </View>
                                </View>

                                {timeline.map((tline, idx) => (
                                    <View key={idx} style={styles.timelineItem}>
                                        <View style={styles.timelineDotLine}>
                                            <View style={styles.timelineDot} />
                                            <View style={styles.timelineLine} />
                                        </View>
                                        <View style={styles.timelineContent}>
                                            <Text style={styles.timelineStop} numberOfLines={1}>{t("places." + tline.stop, { defaultValue: tline.stop })}</Text>
                                            <Text style={styles.timelineTime} numberOfLines={1}>{tline.time}</Text>
                                        </View>
                                    </View>
                                ))}
                                <View style={styles.timelineItem}>
                                    <View style={styles.timelineDotLine}>
                                        <View style={[styles.timelineDot, { backgroundColor: '#EA580C' }]} />
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={[styles.timelineStop, { fontWeight: '800' }]} numberOfLines={1}>{t("places." + trip.destination, { defaultValue: trip.destination })}</Text>
                                        <Text style={[styles.timelineTime, { fontWeight: '800' }]} numberOfLines={1}>{trip.arrivalTime}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={[styles.trackBtn, !status.trackable && styles.trackOff]} onPress={onTrack} disabled={!status.trackable}>
                        <IconSymbol name="location.fill" size={18} color="#fff" />
                        <Text style={styles.trackBtnText}>{i18n.language === 'tr' ? "Canlı Takip Et" : "Track Live"}</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: '#778DA9', fontWeight: '600' },

  largeRouteCard: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 28, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  routeCol: { flex: 1, alignItems: 'center' },
  largeLabel: { fontSize: 10, fontWeight: '800', color: '#778DA9', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1.2, textAlign: 'center' },
  largePlaceBtn: { paddingVertical: 4, alignItems: 'center' },
  largePlaceText: { fontSize: 20, fontWeight: '900', color: '#0D1B2A', letterSpacing: -0.5, textAlign: 'center' },
  placeholder: { color: '#E2E8F0' },
  largeSwapBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EA580C', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12, shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  swapDisabled: { opacity: 0.3 },
  
  largeFilterBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 16, 
    marginTop: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#F8FAFC' 
  },
  calendarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  scheduleTypeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
    textTransform: 'uppercase',
  },
  scheduleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  scheduleOptionActive: {
    backgroundColor: '#fff',
    borderColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D1B2A',
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: '#778DA9',
    fontWeight: '500',
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#F1F5F9',
  },
  miniCheck: { 
    width: 18, 
    height: 18, 
    borderRadius: 6, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  miniCheckOn: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
  filterLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },

  bodyWrapper: { flex: 1, backgroundColor: '#fff' },
  scrollBody: { padding: 16, paddingBottom: 20 },
  loader: { marginTop: 100 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#0D1B2A', marginTop: 20 },
  emptySub: { fontSize: 15, color: '#778DA9', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  primaryBtn: { marginTop: 24, backgroundColor: '#0D1B2A', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 20 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardNext: { backgroundColor: '#FFFAF5', borderColor: '#FFF7ED' },
  nextBadge: { position: 'absolute', top: -10, right: 24, backgroundColor: '#EA580C', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  nextText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  timeGroup: { alignItems: 'center', marginRight: 24, width: 80 },
  timeMain: { fontSize: 20, fontWeight: '900', color: '#0D1B2A' },
  timeLine: { height: 24, alignItems: 'center', marginVertical: 4 },
  tDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#CBD5E1' },
  tBar: { width: 1.5, flex: 1, backgroundColor: '#F1F5F9' },
  timeArrive: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  infoGroup: { flex: 1 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4, marginBottom: 6 },
  typeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  portLabel: { fontSize: 17, fontWeight: '800', color: '#0D1B2A' },
  providerLabel: { fontSize: 12, fontWeight: '600', color: '#778DA9', marginTop: 2 },

  modalBg: { flex: 1, backgroundColor: 'rgba(13, 27, 42, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 26, fontWeight: '900', color: '#0D1B2A', letterSpacing: -0.5 },
  sheetSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetSec: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  
  islandsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  islandGridItem: { width: (SCREEN_WIDTH - 60) / 2, height: 60, backgroundColor: '#F8F9FA', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  islandGridItemActive: { backgroundColor: '#FFF7ED', borderColor: '#EA580C', borderWidth: 2 },
  islandGridText: { fontSize: 15, fontWeight: '800', color: '#0D1B2A' },
  islandGridTextOn: { color: '#EA580C' },
  gridCheck: { position: 'absolute', top: 6, right: 6 },

  mainlandList: { gap: 8 },
  mainlandListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F8F9FA', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  mainlandListItemActive: { backgroundColor: '#F0F9FF', borderColor: '#0284C7', borderWidth: 2 },
  mainlandListText: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  mainlandListTextOn: { color: '#0284C7' },

  popup: { backgroundColor: '#fff', borderRadius: 32, padding: 24, width: '90%', alignSelf: 'center', marginBottom: 'auto', marginTop: 'auto' },
  popupTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  popupIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  popupTitle: { fontSize: 20, fontWeight: '900', color: '#0D1B2A' },
  popupSub: { fontSize: 14, color: '#778DA9', fontWeight: '600' },
  popupTimes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FA', padding: 20, borderRadius: 24, marginBottom: 24 },
  pTimeCol: { alignItems: 'center', flex: 1 },
  pTimeLab: { fontSize: 10, fontWeight: '800', color: '#778DA9', marginBottom: 8 },
  pTimeVal: { fontSize: 24, fontWeight: '900', color: '#0D1B2A' },
  trackBtn: { flexDirection: 'row', backgroundColor: '#EA580C', height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 10 },
  trackOff: { backgroundColor: '#F1F5F9' },
  trackBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  viaSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viaTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#778DA9',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
    minHeight: 44,
  },
  timelineDotLine: {
    alignItems: 'center',
    width: 20,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    height: 38,
    backgroundColor: '#F1F5F9',
    position: 'absolute',
    top: 8,
  },
  timelineStop: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    marginRight: 8,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});
