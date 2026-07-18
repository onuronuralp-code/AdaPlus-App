import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
} from "react-native";
import AnimatedRE, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
const MAINLAND = ["Kabataş", "Bostancı", "Kadıköy", "Beşiktaş", "Maltepe"];
const ALL_LOCATIONS = [...ISLANDS, ...MAINLAND];
const MONTHS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TRANSIT_MINUTES: Record<string, Record<string, number>> = {
  Kınalıada: {
    Burgazada: 15,
    Heybeliada: 30,
    Büyükada: 45,
    Bostancı: 25,
    Kabataş: 65,
    Kadıköy: 35,
    Beşiktaş: 65,
    Maltepe: 65,
  },
  Burgazada: {
    Kınalıada: 15,
    Heybeliada: 15,
    Büyükada: 30,
    Bostancı: 40,
    Kabataş: 75,
    Kadıköy: 50,
    Beşiktaş: 80,
    Maltepe: 50,
  },
  Heybeliada: {
    Kınalıada: 30,
    Burgazada: 15,
    Büyükada: 15,
    Bostancı: 50,
    Kabataş: 95,
    Kadıköy: 65,
    Maltepe: 35,
  },
  Büyükada: {
    Kınalıada: 45,
    Burgazada: 30,
    Heybeliada: 15,
    Bostancı: 35,
    Kabataş: 110,
    Kadıköy: 80,
    Maltepe: 20,
  },
  Bostancı: { Kınalıada: 25, Burgazada: 35, Heybeliada: 50, Büyükada: 35 },
  Kabataş: {
    Kınalıada: 60,
    Burgazada: 75,
    Heybeliada: 90,
    Büyükada: 105,
    Kadıköy: 25,
    Eminönü: 15,
  },
  Kadıköy: {
    Kınalıada: 35,
    Burgazada: 50,
    Heybeliada: 65,
    Büyükada: 80,
    Kabataş: 30,
  },
  Beşiktaş: { Kınalıada: 50, Burgazada: 65, Heybeliada: 80, Büyükada: 95 },
  Maltepe: { Kınalıada: 65, Burgazada: 50, Heybeliada: 35, Büyükada: 20 },
  Eminönü: {
    Kadıköy: 20,
    Kınalıada: 55,
    Burgazada: 70,
    Heybeliada: 85,
    Büyükada: 100,
  },
};

const addMinutes = (time: string, mins: number): string => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const rh = Math.floor(total / 60) % 24;
  const rm = total % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
};

const getArrivalTime = (
  from: string,
  to: string,
  departureTime: string,
): string | null => {
  const mins = TRANSIT_MINUTES[from]?.[to];
  if (!mins) return null;
  return addMinutes(departureTime, mins);
};

const computeArrivalWithVia = (
  from: string,
  to: string,
  departureTime: string,
  via?: string[],
): string => {
  if (!via || via.length === 0) {
    return getArrivalTime(from, to, departureTime) || "";
  }
  let currTime = departureTime;
  let currStop = from;
  for (const stop of [...via, to]) {
    const mins = TRANSIT_MINUTES[currStop]?.[stop];
    if (!mins) return getArrivalTime(from, to, departureTime) || "";
    currTime = addMinutes(currTime, mins);
    currStop = stop;
  }
  return currTime;
};

const getRouteTimeValue = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const DEV_ALWAYS_TRACKABLE = false;

const getTrackingStatus = (route: FerryRoute, selectedDate: Date) => {
  if (DEV_ALWAYS_TRACKABLE)
    return { trackable: true, message: "Live tracking active" };
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  if (!isToday) return { trackable: false, message: "Only today's trips" };
  return { trackable: true, message: "Live tracking active" };
};

export function FerrySchedule() {
  const router = useRouter();
  const params = useLocalSearchParams<{from?: string, to?: string, time?: string}>();
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
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [alarmModalVisible, setAlarmModalVisible] = useState(false);

  // Monitor all modals to hide the navbar
  const isAnyModalVisible = showDepartureDropdown || showDestinationDropdown || showScheduleDropdown || alarmModalVisible || showDatePicker;

  useEffect(() => {
    DeviceEventEmitter.emit('toggleNavbar', !isAnyModalVisible);
  }, [isAnyModalVisible]);

  const [isFavorite, setIsFavorite] = useState(false);

  const calendarScrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Load initial route (from params or favorites)
  useEffect(() => {
    const loadInitial = async () => {
      if (params.from && params.to) {
        setDeparture(params.from as string);
        setDestination(params.to as string);
      } else {
        try {
          const fav = await AsyncStorage.getItem('favorite_route');
          if (fav) {
            const parsed = JSON.parse(fav);
            setDeparture(parsed.departure);
            setDestination(parsed.destination);
          }
        } catch (e) {
          console.error("Failed to load favorite route", e);
        }
      }
    };
    loadInitial();
  }, [params.from, params.to]);

  // Handle auto-selecting the specific ferry trip passed in params
  useEffect(() => {
    if (params.time && ferryData.length > 0) {
      const match = ferryData.find(f => f.departureTime === params.time);
      if (match) {
        setSelectedTrip(match);
      }
    }
  }, [ferryData, params.time]);

  // Check if current selection is favorite
  useEffect(() => {
    const checkFav = async () => {
      if (departure === "Unselected" || destination === "Unselected") {
        setIsFavorite(false);
        return;
      }
      try {
        const fav = await AsyncStorage.getItem('favorite_route');
        if (fav) {
          const parsed = JSON.parse(fav);
          setIsFavorite(parsed.departure === departure && parsed.destination === destination);
        } else {
          setIsFavorite(false);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkFav();
  }, [departure, destination]);

  const handleToggleFavorite = async () => {
    if (departure === "Unselected" || destination === "Unselected") return;
    try {
      if (isFavorite) {
        await AsyncStorage.removeItem('favorite_route');
        setIsFavorite(false);
      } else {
        await AsyncStorage.setItem('favorite_route', JSON.stringify({ departure, destination }));
        setIsFavorite(true);
      }
    } catch(e) {
      console.error("Failed to save favorite route", e);
    }
  };

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

  const DAY_NAMES =
    i18n.language === "tr"
      ? ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const MONTHS = i18n.language === "tr" ? MONTHS_TR : MONTHS_EN;

  useEffect(() => {
    const loadData = async () => {
      if (destination === "Unselected") {
        setFerryData([]);
        return;
      }
      setLoading(true);
      try {
        const froms = departure === "Unselected" ? ALL_LOCATIONS : [departure];
        const isTodaySelection =
          selectedDate.toDateString() === new Date().toDateString();
        // To prevent the backend from filtering out past ferries for today,
        // we request the schedule for exactly 7 days from now (which has the same schedule).
        const queryDate = isTodaySelection && isLiveMode 
          ? new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000) 
          : selectedDate;
          
        const dateStr = `${queryDate.getFullYear()}-${String(queryDate.getMonth() + 1).padStart(2, "0")}-${String(queryDate.getDate()).padStart(2, "0")}`;

        const pairs = froms
          .filter((f) => f !== destination)
          .map((from) => ({ from, to: destination }));
        const results = await Promise.all(
          pairs.map((p) => fetchDepartures(p.from, p.to, dateStr)),
        );

        const allRoutes: FerryRoute[] = [];
        results.forEach((data, idx) => {
          const { from, to } = pairs[idx];
          data.forEach((dto) => {
            allRoutes.push({
              id: `${dto.from}|${dto.to}|${dto.time}|${dto.provider}`,
              departure: dto.from,
              destination: dto.to,
              departureTime: dto.time,
              arrivalTime: computeArrivalWithVia(dto.from, dto.to, dto.time, dto.via),
              type: (dto.provider === "Şehir Hatları" ? "Vapur" : "Motor") as
                | "Vapur"
                | "Motor",
              provider: dto.provider,
              isDirect: !dto.via || dto.via.length === 0,
              via: dto.via,
            });
          });
        });

        // De-duplicate: Keep only one entry for same departure, time, and provider
        const uniqueRoutesMap = new Map();
        allRoutes.forEach((route) => {
          const key = `${route.departure}|${route.departureTime}|${route.provider}`;
          if (!uniqueRoutesMap.has(key)) {
            uniqueRoutesMap.set(key, route);
          }
        });

        setFerryData(
          Array.from(uniqueRoutesMap.values()).sort((a, b) =>
            a.departureTime.localeCompare(b.departureTime),
          ),
        );
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
    
    if (isToday && isLiveMode) {
      const upcoming = ferryData.filter((item) => {
        if (onlyDirect && !item.isDirect) return false;
        const routeTime = getRouteTimeValue(item.departureTime);
        return routeTime >= nowMinutes;
      });
      
      // Find the most recent past departure
      const past = ferryData
        .filter((item) => {
          if (onlyDirect && !item.isDirect) return false;
          const routeTime = getRouteTimeValue(item.departureTime);
          return routeTime < nowMinutes;
        })
        .slice(-1); // last one = most recent past
      
      return [...past, ...upcoming];
    }
    
    return ferryData.filter((item) => {
      if (onlyDirect && !item.isDirect) return false;
      return true;
    });
  }, [ferryData, onlyDirect, selectedDate, isLiveMode]);

  const handleSwap = () => {
    if (departure === "Unselected" || destination === "Unselected") return;
    const temp = departure;
    setDeparture(destination);
    setDestination(temp);
  };

  const handleScheduleTypeSelect = (type: "today" | "weekday" | "holiday") => {
    const today = new Date();
    const day = today.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat

    let target = new Date(today);
    if (type === "today") {
      target = new Date(today);
      setIsLiveMode(true);
    } else if (type === "weekday") {
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
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>{t("common.ferrySchedule")}</Text>
          </View>
        </View>

        <View style={styles.largeRouteCard}>
          {departure !== "Unselected" && destination !== "Unselected" && (
            <TouchableOpacity 
              onPress={handleToggleFavorite} 
              activeOpacity={0.7}
              style={{ position: 'absolute', top: 12, right: 16, zIndex: 10, padding: 8 }}
            >
              <IconSymbol name={isFavorite ? "star.fill" : "star"} size={22} color={isFavorite ? "#EAB308" : "#94A3B8"} />
            </TouchableOpacity>
          )}
          <View style={styles.routeRow}>
            <View style={styles.routeCol}>
              <Text style={styles.largeLabel}>{t("common.from")}</Text>
              <TouchableOpacity
                onPress={() => setShowDepartureDropdown(true)}
                style={styles.largePlaceBtn}
              >
                <Text
                  style={[
                    styles.largePlaceText,
                    departure === "Unselected" && styles.placeholder,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {departure === "Unselected"
                    ? i18n.language === "tr"
                      ? "Kalkış"
                      : "Departure"
                    : departure}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.largeSwapBtn,
                (departure === "Unselected" || destination === "Unselected") &&
                  styles.swapDisabled,
              ]}
              onPress={handleSwap}
              disabled={
                departure === "Unselected" || destination === "Unselected"
              }
            >
              <IconSymbol name="arrow.right.arrow.left" size={18} color="#fff" />
            </TouchableOpacity>

            <View style={styles.routeCol}>
              <Text style={styles.largeLabel}>{t("common.to")}</Text>
              <TouchableOpacity
                onPress={() => setShowDestinationDropdown(true)}
                style={styles.largePlaceBtn}
              >
                <Text
                  style={[
                    styles.largePlaceText,
                    destination === "Unselected" && styles.placeholder,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {destination === "Unselected"
                    ? i18n.language === "tr"
                      ? "Varış"
                      : "Arrival"
                    : destination}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.largeFilterBar}>
            <TouchableOpacity
              style={styles.filterItem}
              onPress={() => setOnlyDirect(!onlyDirect)}
            >
              <View
                style={[styles.miniCheck, onlyDirect && styles.miniCheckOn]}
              >
                {onlyDirect && (
                  <IconSymbol name="checkmark" size={10} color="#fff" />
                )}
              </View>
              <Text style={styles.filterLabel}>{t("common.directOnly")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.calendarTrigger}
            >
              <IconSymbol name="calendar" size={20} color="#EA580C" />
              <Text style={styles.scheduleTypeText}>
                {selectedDate.toDateString() === new Date().toDateString() &&
                isLiveMode
                  ? i18n.language === "tr"
                    ? "Bugün"
                    : "Today"
                  : selectedDate.getDay() === 0
                    ? i18n.language === "tr"
                      ? "Pazar / Tatil"
                      : "Sun / Holiday"
                    : i18n.language === "tr"
                      ? "Haftaiçi / Cmt"
                      : "Weekday / Sat"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScheduleDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleScheduleTypeSelect}
        selectedDate={selectedDate}
        isLiveMode={isLiveMode}
        i18n={i18n}
      />

      {/* Body */}
      <View style={styles.bodyWrapper}>
        <AnimatedRE.ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="auto"
        >
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#EA580C" />
            </View>
          ) : destination === "Unselected" ? (
            <View style={styles.empty}>
              <IconSymbol name="ferry" size={48} color="#EA580C" />
              <Text style={styles.emptyTitle}>
                {i18n.language === "tr" ? "Sefer Seç" : "Select Trip"}
              </Text>
              <Text style={styles.emptySub}>
                {i18n.language === "tr"
                  ? "Nereye gitmek istersin?"
                  : "Where would you like to go?"}
              </Text>
            </View>
          ) : filteredData.length === 0 ? (
            <View style={styles.empty}>
              <IconSymbol
                name="calendar.badge.exclamationmark"
                size={48}
                color="#CBD5E1"
              />
              <Text style={styles.emptyTitle}>{t("common.noDepartures")}</Text>
              <Text style={styles.emptySub}>
                {i18n.language === "tr"
                  ? "Bu tarih için sefer kalmadı."
                  : "No trips left for this date."}
              </Text>
            </View>
          ) : (
            filteredData.map((item, idx) => {
              const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
              const routeTime = getRouteTimeValue(item.departureTime);
              const isPast = isLiveMode && routeTime < nowMinutes;
              const isNext = isLiveMode && !isPast && idx === filteredData.findIndex(f => getRouteTimeValue(f.departureTime) >= nowMinutes);
              return (
                <AnimatedRE.View
                  key={item.id}
                  entering={FadeInDown.delay(idx * 50).duration(400)}
                >
                  <TripTripCard
                    item={item}
                    onPress={() => setSelectedTrip(item)}
                    isNext={isNext}
                    isPast={isPast}
                    t={t}
                    i18n={i18n}
                  />
                </AnimatedRE.View>
              );
            })
          )}
          
          {(!loading && filteredData.length > 0) && (
            <AnimatedRE.View entering={FadeInDown.delay(filteredData.length * 50).duration(400)}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#EFF6FF',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 16,
                  marginBottom: 32,
                  flexDirection: 'row',
                  gap: 8,
                }}
                onPress={() => {
                  const nextDay = new Date(selectedDate);
                  nextDay.setDate(selectedDate.getDate() + 1);
                  setSelectedDate(nextDay);
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#3B82F6' }}>
                  {i18n.language === 'tr' ? 'Sonraki Güne Geç' : 'Go to Next Day'}
                </Text>
                <IconSymbol name="chevron.right" size={16} color="#3B82F6" />
              </TouchableOpacity>
            </AnimatedRE.View>
          )}
        </AnimatedRE.ScrollView>
      </View>

      {/* Date Picker Removed */}

      {/* Pickers & Modals */}
      <LocationPicker
        visible={showDepartureDropdown}
        onClose={() => setShowDepartureDropdown(false)}
        onSelect={setDeparture}
        selected={departure}
        otherSelected={destination}
        title={t("common.from")}
        t={t}
      />
      <LocationPicker
        visible={showDestinationDropdown}
        onClose={() => setShowDestinationDropdown(false)}
        onSelect={setDestination}
        selected={destination}
        otherSelected={departure}
        title={t("common.to")}
        t={t}
      />
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
          selectedDate={selectedDate}
          t={t}
          i18n={i18n}
        />
      )}
    </View>
  );
}

function TripTripCard({ item, onPress, isNext, isPast, t, i18n }: any) {
  return (
    <TouchableOpacity
      style={[styles.card, isNext && styles.cardNext, isPast && { opacity: 0.45 }]}
      onPress={onPress}
    >
      {isNext && (
        <View style={styles.nextBadge}>
          <Text style={styles.nextText}>{t("common.next")}</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.timeGroup}>
          <Text style={styles.timeMain} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{item.departureTime}</Text>
          <View style={styles.timeLine}>
            <View style={styles.tDot} />
            <View style={styles.tBar} />
            <View style={styles.tDot} />
          </View>
          <Text style={styles.timeArrive}>{item.arrivalTime || "--:--"}</Text>
        </View>
        <View style={styles.infoGroup}>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor:
                    item.type === "Vapur" ? "#FFF7ED" : "#F0F9FF",
                  marginBottom: 0,
                },
              ]}
            >
              <IconSymbol
                name="ferry.fill"
                size={10}
                color={item.type === "Vapur" ? "#EA580C" : "#0284C7"}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: item.type === "Vapur" ? "#EA580C" : "#0284C7" },
                ]}
              >
                {item.type === "Vapur"
                  ? t("common.ferry")
                  : t("common.motorboat")}
              </Text>
            </View>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: item.isDirect ? "#ECFDF5" : "#F5F3FF",
                  marginBottom: 0,
                },
              ]}
            >
              <IconSymbol
                name={item.isDirect ? "bolt.fill" : "arrow.triangle.branch"}
                size={10}
                color={item.isDirect ? "#059669" : "#7C3AED"}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: item.isDirect ? "#059669" : "#7C3AED" },
                ]}
              >
                {item.isDirect
                  ? t("common.directOnly").toUpperCase()
                  : i18n.language === "tr"
                    ? "AKTARMALI"
                    : "VIA STOPS"}
              </Text>
            </View>
          </View>
          <Text style={styles.portLabel}>
            {t("places." + item.departure, { defaultValue: item.departure })} →{" "}
            {t("places." + item.destination, {
              defaultValue: item.destination,
            })}
          </Text>
          <Text style={styles.providerLabel}>{item.provider}</Text>
        </View>
        <IconSymbol name="chevron.right" size={16} color="#E2E8F0" />
      </View>
    </TouchableOpacity>
  );
}

function ScheduleDatePicker({
  visible,
  onClose,
  onSelect,
  selectedDate,
  isLiveMode,
  i18n,
}: any) {
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").height),
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(Dimensions.get("window").height);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
      <View style={styles.modalBg}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {i18n.language === "tr" ? "Tarife Seçimi" : "Select Schedule"}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <IconSymbol name="xmark.circle.fill" size={28} color="#F1F5F9" />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 12, paddingBottom: 40 }}>
            <TouchableOpacity
              style={[
                styles.scheduleOption,
                selectedDate.toDateString() === new Date().toDateString() &&
                  isLiveMode &&
                  styles.scheduleOptionActive,
              ]}
              onPress={() => {
                onSelect("today");
                handleClose();
              }}
            >
              <View
                style={[styles.optionIconBox, { backgroundColor: "#ECFDF5" }]}
              >
                <IconSymbol name="clock.fill" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>
                  {i18n.language === "tr" ? "Bugün" : "Today"}
                </Text>
                <Text style={styles.optionSub}>
                  {i18n.language === "tr"
                    ? "Şu anki saatten itibaren kalkacak tüm seferler"
                    : "All departures from the current time onwards"}
                </Text>
              </View>
              {selectedDate.toDateString() === new Date().toDateString() &&
                isLiveMode && (
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={24}
                    color="#EA580C"
                  />
                )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.scheduleOption,
                selectedDate.getDay() !== 0 &&
                  !isLiveMode &&
                  styles.scheduleOptionActive,
              ]}
              onPress={() => {
                onSelect("weekday");
                handleClose();
              }}
            >
              <View
                style={[styles.optionIconBox, { backgroundColor: "#F0F9FF" }]}
              >
                <IconSymbol name="briefcase.fill" size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>
                  {i18n.language === "tr"
                    ? "Haftaiçi ve Cumartesi"
                    : "Weekdays & Saturday"}
                </Text>
                <Text style={styles.optionSub}>
                  {i18n.language === "tr"
                    ? "Ek seferler hariç genel tarife"
                    : "General schedule excluding extra trips"}
                </Text>
              </View>
              {selectedDate.getDay() !== 0 && !isLiveMode && (
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={24}
                  color="#EA580C"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.scheduleOption,
                selectedDate.getDay() === 0 &&
                  !isLiveMode &&
                  styles.scheduleOptionActive,
              ]}
              onPress={() => {
                onSelect("holiday");
                handleClose();
              }}
            >
              <View
                style={[styles.optionIconBox, { backgroundColor: "#FFF7ED" }]}
              >
                <IconSymbol name="sun.max.fill" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>
                  {i18n.language === "tr"
                    ? "Pazar ve Tatil Günleri"
                    : "Sunday & Public Holidays"}
                </Text>
                <Text style={styles.optionSub}>
                  {i18n.language === "tr"
                    ? "Tüm gün geçerli pazar tarifesi"
                    : "Full Sunday schedule for all day"}
                </Text>
              </View>
              {selectedDate.getDay() === 0 && !isLiveMode && (
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={24}
                  color="#EA580C"
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function LocationPicker({
  visible,
  onClose,
  onSelect,
  selected,
  otherSelected,
  title,
  t,
}: any) {
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").height),
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(Dimensions.get("window").height);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
      <View style={styles.modalBg}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={handleClose}>
              <IconSymbol name="xmark.circle.fill" size={28} color="#F1F5F9" />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View style={styles.sheetSectionHeader}>
              <View
                style={[styles.sectionIconBox, { backgroundColor: "#FFF7ED" }]}
              >
                <IconSymbol
                  name="beach.umbrella.fill"
                  size={18}
                  color="#EA580C"
                />
              </View>
              <Text style={[styles.sheetSec, { color: "#EA580C" }]}>
                {t("common.islands").toUpperCase()}
              </Text>
            </View>
            <View style={styles.islandsGrid}>
              {ISLANDS.map((l) => {
                const isDisabled = l === otherSelected;
                return (
                  <TouchableOpacity
                    key={l}
                    disabled={isDisabled}
                    style={[
                      styles.islandGridItem,
                      selected === l && styles.islandGridItemActive,
                      isDisabled && styles.locationDisabled,
                    ]}
                    onPress={() => {
                      onSelect(l);
                      handleClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.islandGridText,
                        selected === l && styles.islandGridTextOn,
                        isDisabled && styles.locationDisabledText,
                      ]}
                    >
                      {t("places." + l, { defaultValue: l })}
                    </Text>
                    {selected === l && (
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={16}
                        color="#EA580C"
                        style={styles.gridCheck}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.sheetSectionHeader, { marginTop: 32 }]}>
              <View
                style={[styles.sectionIconBox, { backgroundColor: "#F0F9FF" }]}
              >
                <IconSymbol name="building.2.fill" size={18} color="#0284C7" />
              </View>
              <Text style={[styles.sheetSec, { color: "#0284C7" }]}>
                {t("common.mainland").toUpperCase()}
              </Text>
            </View>
            <View style={styles.mainlandList}>
              {MAINLAND.map((l) => {
                const isDisabled = l === otherSelected;
                return (
                  <TouchableOpacity
                    key={l}
                    disabled={isDisabled}
                    style={[
                      styles.mainlandListItem,
                      selected === l && styles.mainlandListItemActive,
                      isDisabled && styles.locationDisabled,
                    ]}
                    onPress={() => {
                      onSelect(l);
                      handleClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.mainlandListText,
                        selected === l && styles.mainlandListTextOn,
                        isDisabled && styles.locationDisabledText,
                      ]}
                    >
                      {t("places." + l, { defaultValue: l })}
                    </Text>
                    {selected === l && (
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={20}
                        color="#0284C7"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function TripDetailPopup({
  trip,
  onClose,
  onTrack,
  status,
  i18n,
  t,
  selectedDate,
}: any) {
  const [showAlarmOptions, setShowAlarmOptions] = useState(false);
  const [alarmSet, setAlarmSet] = useState<number | null>(null);

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

  const scheduleAlarm = async (minutesBefore: number) => {
    try {
      const { status: permStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = permStatus;
      if (permStatus !== "granted") {
        const { status: asked } = await Notifications.requestPermissionsAsync();
        finalStatus = asked;
      }
      if (finalStatus !== "granted") {
        onClose();
        setTimeout(() => {
          Alert.alert(
            i18n.language === "tr" ? "İzin Gerekli" : "Permission Required",
            i18n.language === "tr"
              ? "Bildirim gönderebilmek için bildirim izni vermeniz gerekmektedir."
              : "Notification permission is required to send notifications.",
          );
        }, 400);
        return;
      }

      // Calculate the departure Date object
      const [depH, depM] = trip.departureTime.split(":").map(Number);
      const departureDate = new Date(selectedDate || new Date());
      departureDate.setHours(depH, depM, 0, 0);

      // Subtract minutesBefore
      const alarmDate = new Date(
        departureDate.getTime() - minutesBefore * 60 * 1000,
      );

      const timeUntilDeparture = departureDate.getTime() - Date.now();

      // Check if departure is less than 30 minutes away
      if (timeUntilDeparture < 30 * 60 * 1000) {
        onClose();
        setTimeout(() => {
          Alert.alert(
            i18n.language === "tr" ? "Yetersiz Süre" : "Not Enough Time",
            i18n.language === "tr"
              ? "Seferin kalkmasına 30 dakikadan az kaldığı için hatırlatıcı ayarlanamaz."
              : "A reminder cannot be set because there is less than 30 minutes left until departure."
          );
        }, 400);
        return;
      }

      // Check if alarm time is in the past (e.g. 60 min reminder for a trip 40 mins away)
      if (alarmDate.getTime() <= Date.now()) {
        onClose();
        setTimeout(() => {
          Alert.alert(
            i18n.language === "tr" ? "Geçersiz Süre" : "Invalid Duration",
            i18n.language === "tr"
              ? "Seçilen hatırlatma süresi, kalan süreden daha uzun. Lütfen daha kısa bir süre seçin."
              : "The selected reminder duration is longer than the time left. Please choose a shorter duration."
          );
        }, 400);
        return;
      }

      const routeLabel = `${t("places." + trip.departure, { defaultValue: trip.departure })} → ${t("places." + trip.destination, { defaultValue: trip.destination })}`;
      const alarmLabel =
        minutesBefore < 60
          ? i18n.language === "tr"
            ? `${minutesBefore} dakika`
            : `${minutesBefore} minutes`
          : i18n.language === "tr"
            ? `${minutesBefore / 60} saat`
            : `${minutesBefore / 60} hour${minutesBefore > 60 ? "s" : ""}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title:
            i18n.language === "tr"
              ? `🚢 Sefer Hatırlatması`
              : `🚢 Ferry Reminder`,
          body:
            i18n.language === "tr"
              ? `${routeLabel} seferinize ${alarmLabel} kaldı! Kalkış: ${trip.departureTime}`
              : `${alarmLabel} until your ${routeLabel} trip! Departure: ${trip.departureTime}`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: alarmDate,
        },
      });

      setAlarmSet(minutesBefore);
      setShowAlarmOptions(false);
    } catch (error) {
      console.error("Failed to schedule alarm:", error);
      onClose();
      setTimeout(() => {
        Alert.alert(
          i18n.language === "tr" ? "Hata" : "Error",
          i18n.language === "tr"
            ? "Bildirim gönderilirken bir hata oluştu."
            : "Failed to set the notification.",
        );
      }, 400);
    }
  };

  const ALARM_OPTIONS = [
    {
      label: i18n.language === "tr" ? "15 dk önce" : "15 min before",
      minutes: 15,
      icon: "⏱️",
    },
    {
      label: i18n.language === "tr" ? "30 dk önce" : "30 min before",
      minutes: 30,
      icon: "⏱️",
    },
    {
      label: i18n.language === "tr" ? "1 saat önce" : "1 hour before",
      minutes: 60,
      icon: "🕐",
    },
  ];

  return (
    <Modal transparent animationType="fade" statusBarTranslucent={true}>
      <TouchableOpacity
        style={styles.modalBg}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.popup}>
          <View style={styles.popupTop}>
            <View
              style={[
                styles.popupIcon,
                {
                  backgroundColor:
                    trip.type === "Vapur" ? "#FFF7ED" : "#F0F9FF",
                },
              ]}
            >
              <IconSymbol
                name="ferry.fill"
                size={28}
                color={trip.type === "Vapur" ? "#EA580C" : "#0284C7"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.popupTitle}>
                {t("places." + trip.departure, {
                  defaultValue: trip.departure,
                })}{" "}
                -{" "}
                {t("places." + trip.destination, {
                  defaultValue: trip.destination,
                })}
              </Text>
              <Text style={styles.popupSub}>{trip.provider}</Text>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              style={{ position: 'absolute', right: -12, top: -4, padding: 8, backgroundColor: '#F1F5F9', borderRadius: 14 }}
            >
              <IconSymbol name="xmark" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.popupTimes}>
            <View style={styles.pTimeCol}>
              <Text style={styles.pTimeLab}>
                {i18n.language === "tr" ? "KALKIŞ" : "DEPARTURE"}
              </Text>
              <Text style={styles.pTimeVal}>{trip.departureTime}</Text>
            </View>
            <IconSymbol name="arrow.right" size={20} color="#EA580C" />
            <View style={styles.pTimeCol}>
              <Text style={styles.pTimeLab}>
                {i18n.language === "tr" ? "VARIŞ" : "ARRIVAL"}
              </Text>
              <Text style={styles.pTimeVal}>{trip.arrivalTime || "--:--"}</Text>
            </View>
          </View>

          {timeline.length > 0 && (
            <View style={styles.viaSection}>
              <Text style={styles.viaTitle}>
                {i18n.language === "tr" ? "GÜZERGAH" : "ROUTE"}
              </Text>
              <View style={styles.timelineList}>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDotLine}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: "#3B82F6" },
                      ]}
                    />
                    <View style={styles.timelineLine} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[styles.timelineStop, { fontWeight: "800" }]}
                      numberOfLines={1}
                    >
                      {t("places." + trip.departure, {
                        defaultValue: trip.departure,
                      })}
                    </Text>
                    <Text
                      style={[styles.timelineTime, { fontWeight: "800" }]}
                      numberOfLines={1}
                    >
                      {trip.departureTime}
                    </Text>
                  </View>
                </View>

                {timeline.map((tline, idx) => (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineDotLine}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineLine} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStop} numberOfLines={1}>
                        {t("places." + tline.stop, {
                          defaultValue: tline.stop,
                        })}
                      </Text>
                      <Text style={styles.timelineTime} numberOfLines={1}>
                        {tline.time}
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDotLine}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: "#EA580C" },
                      ]}
                    />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[styles.timelineStop, { fontWeight: "800" }]}
                      numberOfLines={1}
                    >
                      {t("places." + trip.destination, {
                        defaultValue: trip.destination,
                      })}
                    </Text>
                    <Text
                      style={[styles.timelineTime, { fontWeight: "800" }]}
                      numberOfLines={1}
                    >
                      {trip.arrivalTime}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Alarm Section */}
          <View style={alarmStyles.alarmSection}>
            {!showAlarmOptions ? (
              <TouchableOpacity
                style={[
                  alarmStyles.alarmButton,
                  alarmSet ? alarmStyles.alarmButtonActive : null,
                ]}
                onPress={() => setShowAlarmOptions(true)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>{alarmSet ? "✅" : "⏰"}</Text>
                <Text
                  style={[
                    alarmStyles.alarmButtonText,
                    alarmSet ? alarmStyles.alarmButtonTextActive : null,
                  ]}
                >
                  {alarmSet
                    ? i18n.language === "tr"
                      ? `Bildirim ayarlandı (${alarmSet < 60 ? alarmSet + " dk" : alarmSet / 60 + " saat"} önce)`
                      : `Notification set (${alarmSet < 60 ? alarmSet + " min" : alarmSet / 60 + "h"} before)`
                    : i18n.language === "tr"
                      ? "Bildirim Gönder"
                      : "Send Notification"}
                </Text>
                {!alarmSet && (
                  <IconSymbol name="chevron.right" size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : (
              <View style={alarmStyles.alarmOptionsContainer}>
                <Text style={alarmStyles.alarmOptionsTitle}>
                  {i18n.language === "tr"
                    ? "Ne zaman hatırlatalım?"
                    : "When to remind you?"}
                </Text>
                {ALARM_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.minutes}
                    style={alarmStyles.alarmOption}
                    onPress={() => scheduleAlarm(opt.minutes)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
                    <Text style={alarmStyles.alarmOptionText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={alarmStyles.alarmCancelBtn}
                  onPress={() => setShowAlarmOptions(false)}
                >
                  <Text style={alarmStyles.alarmCancelText}>
                    {i18n.language === "tr" ? "İptal" : "Cancel"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const alarmStyles = StyleSheet.create({
  alarmSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  alarmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 10,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  alarmButtonActive: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  alarmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  alarmButtonTextActive: {
    color: "#FFFFFF",
  },
  alarmOptionsContainer: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  alarmOptionsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  alarmOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alarmOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E3A8A",
  },
  alarmCancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
  },
  alarmCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },
});

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerContainer: { paddingHorizontal: 20, paddingBottom: 16, zIndex: 10 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitles: { flex: 1 },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: { fontSize: 13, color: "#778DA9", fontWeight: "600" },

  largeRouteCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  routeCol: { flex: 1, alignItems: "center" },
  largeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#778DA9",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  largePlaceBtn: { paddingVertical: 4, alignItems: "center" },
  largePlaceText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0D1B2A",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  placeholder: { color: "#E2E8F0" },
  largeSwapBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  swapDisabled: { opacity: 0.3 },

  largeFilterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  calendarTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scheduleTypeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EA580C",
    textTransform: "uppercase",
  },
  scheduleOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    gap: 16,
  },
  scheduleOptionActive: {
    backgroundColor: "#fff",
    borderColor: "#EA580C",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0D1B2A",
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: "#778DA9",
    fontWeight: "500",
  },
  filterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#F1F5F9",
  },
  miniCheck: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  miniCheckOn: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  filterLabel: { fontSize: 13, fontWeight: "700", color: "#475569" },

  bodyWrapper: { flex: 1, backgroundColor: "#fff" },
  scrollBody: { padding: 16, paddingBottom: 20 },
  loader: { marginTop: 100 },
  empty: { alignItems: "center", marginTop: 140 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0D1B2A",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: "#778DA9",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: "#0D1B2A",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardNext: { backgroundColor: "#FFFAF5", borderColor: "#FFF7ED" },
  nextBadge: {
    position: "absolute",
    top: -10,
    right: 24,
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  cardContent: { flexDirection: "row", alignItems: "center" },
  timeGroup: { alignItems: "center", marginRight: 16, width: 64 },
  timeMain: { fontSize: 18, fontWeight: "900", color: "#0D1B2A" },
  timeLine: { height: 24, alignItems: "center", marginVertical: 4 },
  tDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#CBD5E1" },
  tBar: { width: 1.5, flex: 1, backgroundColor: "#F1F5F9" },
  timeArrive: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  infoGroup: { flex: 1 },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 6,
  },
  typeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  portLabel: { fontSize: 17, fontWeight: "800", color: "#0D1B2A" },
  providerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#778DA9",
    marginTop: 2,
  },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(13, 27, 42, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0D1B2A",
    letterSpacing: -0.5,
  },
  sheetSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSec: { fontSize: 13, fontWeight: "900", letterSpacing: 1.5 },

  islandsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  islandGridItem: {
    width: (SCREEN_WIDTH - 60) / 2,
    height: 60,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  islandGridItemActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#EA580C",
    borderWidth: 2,
  },
  islandGridText: { fontSize: 15, fontWeight: "800", color: "#0D1B2A" },
  islandGridTextOn: { color: "#EA580C" },
  gridCheck: { position: "absolute", top: 6, right: 6 },

  mainlandList: { gap: 8 },
  mainlandListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  mainlandListItemActive: {
    backgroundColor: "#F0F9FF",
    borderColor: "#0284C7",
    borderWidth: 2,
  },
  mainlandListText: { fontSize: 16, fontWeight: "700", color: "#0D1B2A" },
  mainlandListTextOn: { color: "#0284C7" },

  popup: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    alignSelf: "center",
    marginBottom: "auto",
    marginTop: "auto",
  },
  popupTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  popupIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  popupTitle: { fontSize: 20, fontWeight: "900", color: "#0D1B2A" },
  popupSub: { fontSize: 14, color: "#778DA9", fontWeight: "600" },
  popupTimes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 16,
    marginBottom: 4,
  },
  pTimeCol: { alignItems: "center", flex: 1 },
  pTimeLab: {
    fontSize: 10,
    fontWeight: "800",
    color: "#778DA9",
    marginBottom: 8,
  },
  pTimeVal: { fontSize: 24, fontWeight: "900", color: "#0D1B2A" },
  trackBtn: {
    flexDirection: "row",
    backgroundColor: "#EA580C",
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  trackOff: { backgroundColor: "#F1F5F9" },
  trackBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  viaSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  viaTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#778DA9",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
    minHeight: 44,
  },
  timelineDotLine: {
    alignItems: "center",
    width: 20,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 12,
    paddingRight: 60,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    height: 38,
    backgroundColor: "#F1F5F9",
    position: "absolute",
    top: 8,
  },
  timelineStop: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0D1B2A",
    marginRight: 8,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  locationDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    opacity: 0.5,
  },
  locationDisabledText: {
    color: "#94A3B8",
  },
});
