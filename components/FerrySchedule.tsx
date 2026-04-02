import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { fetchDepartures } from "../services/api";

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
const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DEPARTURE_LOCATIONS = ["Unselected", ...ALL_LOCATIONS];
const DESTINATION_LOCATIONS = ["Unselected", ...ALL_LOCATIONS];

// Turn this on during development if you want the tracking button always enabled
const DEV_ALWAYS_TRACKABLE = true;

const TRANSIT_MINUTES: Record<string, Record<string, number>> = {
  Kınalıada: {
    Burgazada: 15,
    Heybeliada: 30,
    Büyükada: 50,
    Bostancı: 25,
    Kabataş: 80,
    Kadıköy: 65,
    Beşiktaş: 90,
    Maltepe: 60,
  },
  Burgazada: {
    Kınalıada: 15,
    Heybeliada: 15,
    Büyükada: 35,
    Bostancı: 35,
    Kabataş: 90,
    Kadıköy: 70,
    Beşiktaş: 100,
  },
  Heybeliada: {
    Kınalıada: 30,
    Burgazada: 15,
    Büyükada: 20,
    Bostancı: 50,
    Kabataş: 100,
    Kadıköy: 80,
  },
  Büyükada: {
    Kınalıada: 50,
    Burgazada: 35,
    Heybeliada: 20,
    Bostancı: 60,
    Kabataş: 110,
    Kadıköy: 90,
    Maltepe: 45,
  },
  Bostancı: { Kınalıada: 25, Burgazada: 35, Heybeliada: 50, Büyükada: 60 },
  Kabataş: {
    Kınalıada: 80,
    Burgazada: 90,
    Heybeliada: 100,
    Büyükada: 110,
    Kadıköy: 30,
  },
  Kadıköy: { Kınalıada: 65, Büyükada: 90, Kabataş: 30 },
  Beşiktaş: { Kınalıada: 90, Büyükada: 110 },
  Maltepe: { Kınalıada: 60, Büyükada: 45 },
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

const calculateDuration = (start: string, end: string) => {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let durationM = endH * 60 + endM - (startH * 60 + startM);
  if (durationM < 0) durationM += 24 * 60;

  const h = Math.floor(durationM / 60);
  const m = durationM % 60;

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const getRouteTimeValue = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const isTripTrackable = (route: FerryRoute, selectedDate: Date): boolean => {
  if (DEV_ALWAYS_TRACKABLE) return true;

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  if (!isToday) return false;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const departureMinutes = getRouteTimeValue(route.departureTime);

  const arrival = getArrivalTime(
    route.departure,
    route.destination,
    route.departureTime,
  );
  const arrivalMinutes = arrival
    ? getRouteTimeValue(arrival)
    : departureMinutes + 40;

  const trackingStart = departureMinutes - 20;
  const trackingEnd = arrivalMinutes + 10;

  return nowMinutes >= trackingStart && nowMinutes <= trackingEnd;
};

const getTrackingStatus = (route: FerryRoute, selectedDate: Date) => {
  if (DEV_ALWAYS_TRACKABLE) {
    return {
      trackable: true,
      title: "Live tracking is available now.",
      subtitle: "Dev mode",
    };
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  if (!isToday) {
    return {
      trackable: false,
      title: "Live tracking is available only for today’s departures.",
      subtitle: null,
    };
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const departureMinutes = getRouteTimeValue(route.departureTime);

  const arrival = getArrivalTime(
    route.departure,
    route.destination,
    route.departureTime,
  );
  const arrivalMinutes = arrival
    ? getRouteTimeValue(arrival)
    : departureMinutes + 40;

  const trackingStart = departureMinutes - 20;
  const trackingEnd = arrivalMinutes + 10;

  if (nowMinutes < trackingStart) {
    return {
      trackable: false,
      title: "Tracking will be available closer to departure.",
      subtitle: `Live tracking opens about 20 minutes before ${route.departureTime}.`,
    };
  }

  if (nowMinutes > trackingEnd) {
    return {
      trackable: false,
      title: "This ferry trip has already ended.",
      subtitle: "Live tracking is no longer available for this departure.",
    };
  }

  return {
    trackable: true,
    title: "Live tracking is available now.",
    subtitle: "Updates roughly every 10 seconds on the map screen.",
  };
};

export function FerrySchedule() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [destination, setDestination] = useState("Unselected");
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

  const [departure, setDeparture] = useState("Unselected");
  const [showDepartureDropdown, setShowDepartureDropdown] = useState(false);

  const [onlyDirect, setOnlyDirect] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<FerryRoute | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  const nextTripY = useRef<number>(0);
  const hasFoundNextTrip = useRef(false);
  const calendarScrollRef = useRef<ScrollView>(null);
  const isLight = theme === "light";

  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [selectedDate]);

  const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [ferryData, setFerryData] = useState<FerryRoute[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadIds = async () => {
      if (destination === "Unselected") {
        setFerryData([]);
        return;
      }

      setLoading(true);
      try {
        const validDepartures =
          departure === "Unselected" ? ALL_LOCATIONS : [departure];
        const validDestinations = [destination];

        const pairs: { from: string; to: string }[] = [];

        validDepartures.forEach((from) => {
          validDestinations.forEach((to) => {
            if (from !== to) {
              pairs.push({ from, to });
            }
          });
        });

        let allRoutes: FerryRoute[] = [];

        const isToday =
          selectedDate.toDateString() === new Date().toDateString();

        const dateStr = isToday
          ? undefined
          : `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

        const dataPromises = pairs.map((pair) =>
          fetchDepartures(pair.from, pair.to, dateStr),
        );
        const results = await Promise.all(dataPromises);

        results.forEach((data) => {
          const mapped = data.map((dto) => ({
            id: `${dto.from}|${dto.to}|${dto.time}|${dto.provider}`,
            departure: dto.from,
            destination: dto.to,
            departureTime: dto.time,
            arrivalTime: "",
            type: (dto.provider === "Şehir Hatları" ? "Vapur" : "Motor") as
              | "Vapur"
              | "Motor",
            provider: dto.provider,
            isDirect: !dto.via || dto.via.length === 0,
            via: dto.via,
          }));
          allRoutes = [...allRoutes, ...mapped];
        });

        setFerryData(allRoutes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadIds();
  }, [destination, departure, selectedDate]);

  const groupedSections = useMemo(() => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const now = new Date();
    const currentTimeVal = now.getHours() * 60 + now.getMinutes();

    const filtered = ferryData.filter((item) => {
      if (destination !== "All") {
        if (item.destination !== destination) return false;
      }

      if (onlyDirect && !item.isDirect) return false;

      if (departure !== "Unselected") {
        const port = item.departure;
        if (port !== departure) return false;
      }

      if (isToday) {
        const [h, m] = item.departureTime.split(":").map(Number);
        const routeTimeVal = h * 60 + m;
        if (routeTimeVal < currentTimeVal) return false;
      }

      return true;
    });

    const uniqueItems = new Map<string, FerryRoute>();
    filtered.forEach((item) => {
      const key = `${item.departure}_${item.departureTime}_${item.destination}_${item.provider}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    });

    const groups: { [key: string]: FerryRoute[] } = {};

    Array.from(uniqueItems.values()).forEach((item) => {
      const port = item.departure;
      if (!groups[port]) groups[port] = [];
      groups[port].push(item);
    });

    const sortedKeys = Object.keys(groups).sort();

    return sortedKeys.map((port) => {
      const routes = groups[port];
      routes.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

      return {
        title: `From ${port}`,
        data: [routes],
      };
    });
  }, [destination, onlyDirect, departure, ferryData, selectedDate]);

  const nextTripIds = useMemo(() => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const ids = new Set<string>();

    if (!isToday) return ids;

    const now = new Date();
    const currentTimeVal = now.getHours() * 60 + now.getMinutes();

    groupedSections.forEach((section) => {
      let closestId: string | null = null;
      let minDiff = Infinity;

      section.data[0].forEach((route) => {
        const routeTimeVal = getRouteTimeValue(route.departureTime);

        if (routeTimeVal > currentTimeVal) {
          const diff = routeTimeVal - currentTimeVal;
          if (diff < minDiff) {
            minDiff = diff;
            closestId = route.id;
          }
        }
      });

      if (closestId) {
        ids.add(closestId);
      }
    });

    return ids;
  }, [groupedSections, selectedDate]);

  useEffect(() => {
    if (loading || groupedSections.length === 0 || nextTripIds.size === 0)
      return;

    hasFoundNextTrip.current = false;
    nextTripY.current = 0;

    const scrollTimer = setTimeout(() => {
      if (nextTripY.current > 0) {
        scrollViewRef.current?.scrollTo({
          y: nextTripY.current - 10,
          animated: true,
        });
      }
    }, 800);

    return () => clearTimeout(scrollTimer);
  }, [loading, groupedSections, nextTripIds]);

  const handleTrackFerry = (route: FerryRoute) => {
    const tracking = getTrackingStatus(route, selectedDate);
    if (!tracking.trackable) return;

    router.push({
      pathname: "../ferry-tracking",
      params: {
        tripId: route.id,
        from: route.departure,
        to: route.destination,
        departureTime: route.departureTime,
        arrivalTime:
          getArrivalTime(
            route.departure,
            route.destination,
            route.departureTime,
          ) ?? "",
        provider: route.provider,
        type: route.type,
      },
    });
  };

  const renderGridItem = ({ item }: { item: FerryRoute[] }) => {
    const now = new Date();
    const currentTimeVal = now.getHours() * 60 + now.getMinutes();

    return (
      <View style={styles.gridContainer}>
        {item.map((route) => {
          const isNext = nextTripIds.has(route.id);
          const isToday =
            selectedDate.toDateString() === new Date().toDateString();
          const [h, m] = route.departureTime.split(":").map(Number);
          const routeTimeVal = h * 60 + m;
          const isPast = isToday && routeTimeVal < currentTimeVal;
          const showLiveBadge = isTripTrackable(route, selectedDate);

          return (
            <TouchableOpacity
              key={route.id}
              style={[styles.timeChip, isNext && styles.timeChipNext]}
              onPress={() => setSelectedTrip(route)}
              activeOpacity={0.7}
              disabled={isPast}
            >
              <View style={styles.cardBadgeRow}>
                {isNext && (
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeText}>{t("common.next")}</Text>
                  </View>
                )}

                {showLiveBadge && (
                  <View style={styles.liveBadge}>
                    <Ionicons name="boat-outline" size={10} color="#0F6C7B" />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                )}
              </View>

              <Text
                style={[styles.timeChipText, isNext && styles.timeChipTextNext]}
              >
                {route.departureTime}
              </Text>

              {(() => {
                const arr = getArrivalTime(
                  route.departure,
                  route.destination,
                  route.departureTime,
                );
                return arr ? (
                  <Text style={styles.arrivalText}>→ {arr}</Text>
                ) : null;
              })()}

              <Text style={styles.providerText} numberOfLines={1}>
                {route.provider}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const selectedTripTracking = selectedTrip
    ? getTrackingStatus(selectedTrip, selectedDate)
    : null;

  return (
    <View style={styles.container}>
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t("common.ferrySchedule")}</Text>
        </View>

        <View style={styles.weekStripContainer}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                const today = new Date();
                const prevMonth = selectedDate.getMonth() - 1;
                const prevYear =
                  prevMonth < 0
                    ? selectedDate.getFullYear() - 1
                    : selectedDate.getFullYear();
                const actualMonth = prevMonth < 0 ? 11 : prevMonth;
                if (
                  actualMonth === today.getMonth() &&
                  prevYear === today.getFullYear()
                ) {
                  setSelectedDate(new Date(today));
                } else {
                  setSelectedDate(new Date(prevYear, actualMonth, 1));
                }
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#555" />
            </TouchableOpacity>
            <Text style={styles.weekStripMonth}>
              {MONTHS_EN[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const today = new Date();
                const nextMonth = selectedDate.getMonth() + 1;
                const nextYear =
                  nextMonth > 11
                    ? selectedDate.getFullYear() + 1
                    : selectedDate.getFullYear();
                const actualMonth = nextMonth > 11 ? 0 : nextMonth;
                if (
                  actualMonth === today.getMonth() &&
                  nextYear === today.getFullYear()
                ) {
                  setSelectedDate(new Date(today));
                } else {
                  setSelectedDate(new Date(nextYear, actualMonth, 1));
                }
              }}
            >
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={calendarScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
            onLayout={() => {
              const dayIndex = selectedDate.getDate() - 1;
              const screenWidth = Dimensions.get("window").width;
              const itemWidth = 45;
              const scrollX = Math.max(
                0,
                dayIndex * itemWidth - screenWidth / 2 + itemWidth / 2 + 20,
              );
              calendarScrollRef.current?.scrollTo({
                x: scrollX,
                animated: false,
              });
            }}
          >
            {monthDays.map((day, i) => {
              const isSelected =
                day.toDateString() === selectedDate.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();
              const dayName = DAY_NAMES_SHORT[day.getDay()];
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.weekStripDayCol}
                  onPress={() => setSelectedDate(day)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.weekStripDayName,
                      (day.getDay() === 0 || day.getDay() === 6) &&
                        styles.weekStripWeekend,
                      isSelected && { color: "#2196F3", fontWeight: "700" },
                    ]}
                  >
                    {dayName}
                  </Text>
                  <View
                    style={[
                      styles.weekStripDayCircle,
                      isSelected && styles.weekStripDaySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekStripDayNum,
                        (day.getDay() === 0 || day.getDay() === 6) &&
                          styles.weekStripWeekend,
                        isSelected && styles.weekStripDayNumSelected,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                  {isToday && <View style={styles.weekStripTodayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 12,
            backgroundColor: "#fff",
          }}
        >
          <View style={{ flex: 1, zIndex: 102 }}>
            <Text style={styles.dropdownLabel}>{t("common.from")}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDepartureDropdown(!showDepartureDropdown)}
            >
              <Text style={styles.dropdownButtonText} numberOfLines={1}>
                {departure}
              </Text>
              <Ionicons
                name={showDepartureDropdown ? "chevron-up" : "chevron-down"}
                size={14}
                color="#888"
              />
            </TouchableOpacity>
            {showDepartureDropdown && (
              <View style={styles.dropdownList}>
                {DEPARTURE_LOCATIONS.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDeparture(loc);
                      setShowDepartureDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        departure === loc && styles.selectedDropdownText,
                      ]}
                    >
                      {loc}
                    </Text>
                    {departure === loc && (
                      <Ionicons name="checkmark" size={16} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={{ flex: 1, zIndex: 101 }}>
            <Text style={styles.dropdownLabel}>{t("common.to")}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() =>
                setShowDestinationDropdown(!showDestinationDropdown)
              }
            >
              <Text style={styles.dropdownButtonText} numberOfLines={1}>
                {destination}
              </Text>
              <Ionicons
                name={showDestinationDropdown ? "chevron-up" : "chevron-down"}
                size={14}
                color="#888"
              />
            </TouchableOpacity>
            {showDestinationDropdown && (
              <View style={styles.dropdownList}>
                {DESTINATION_LOCATIONS.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDestination(loc);
                      setShowDestinationDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        destination === loc && styles.selectedDropdownText,
                      ]}
                    >
                      {loc}
                    </Text>
                    {destination === loc && (
                      <Ionicons name="checkmark" size={16} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
            zIndex: 100,
            backgroundColor: "#fff",
          }}
        >
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setOnlyDirect(!onlyDirect)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={onlyDirect ? "checkbox" : "square-outline"}
              size={18}
              color={onlyDirect ? "#000" : "#bbb"}
            />
            <Text
              style={[
                styles.checkboxText,
                onlyDirect && styles.checkboxTextActive,
              ]}
            >
              {t("common.directOnly")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {groupedSections.map((section, sectionIdx) => {
          const sectionHasNext = section.data[0].some((route) =>
            nextTripIds.has(route.id),
          );
          return (
            <View key={sectionIdx}>
              {sectionHasNext && (
                <View
                  onLayout={(e) => {
                    if (!hasFoundNextTrip.current) {
                      nextTripY.current = e.nativeEvent.layout.y;
                      hasFoundNextTrip.current = true;
                    }
                  }}
                />
              )}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
              {section.data.map((routes, itemIdx) => (
                <View key={itemIdx}>{renderGridItem({ item: routes })}</View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      )}

      <Modal
        visible={!!selectedTrip}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTrip(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedTrip(null)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            {selectedTrip && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {selectedTrip.departure} → {selectedTrip.destination}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedTrip.departureTime} departure
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedTrip(null)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.infoRow}>
                    <Ionicons name="boat-outline" size={18} color="#2B7A8E" />
                    <Text style={styles.infoText}>
                      {selectedTrip.type} (
                      {selectedTrip.isDirect ? "Direct" : "Indirect"})
                    </Text>
                  </View>

                  <View style={styles.routeContainer}>
                    <Text style={styles.routeLabel}>Route Stops:</Text>
                    <View style={styles.routeWrapper}>
                      {(() => {
                        const stops = [
                          selectedTrip.departure,
                          ...(selectedTrip.via ?? []),
                          selectedTrip.destination,
                        ];
                        const dotColors = [
                          "#2B7A8E",
                          ...(selectedTrip.via ?? []).map(() => "#FFA000"),
                          "#D32F2F",
                        ];

                        const times: string[] = [selectedTrip.departureTime];
                        for (let i = 1; i < stops.length; i++) {
                          const prev = stops[i - 1];
                          const curr = stops[i];
                          const mins = TRANSIT_MINUTES[prev]?.[curr];
                          times.push(
                            mins ? addMinutes(times[i - 1], mins) : "",
                          );
                        }

                        return stops.map((stop, i) => (
                          <View key={i} style={styles.routeNode}>
                            {i > 0 && <View style={styles.verticalLine} />}
                            <View
                              style={[
                                styles.dot,
                                { backgroundColor: dotColors[i] },
                              ]}
                            />
                            <View style={styles.routeNodeContent}>
                              <Text style={styles.nodeText}>{stop}</Text>
                              {times[i] ? (
                                <Text style={styles.nodeTime}>{times[i]}</Text>
                              ) : null}
                            </View>
                          </View>
                        ));
                      })()}
                    </View>
                  </View>

                  <View style={styles.liveTrackingContainer}>
                    <View style={styles.liveTrackingHeader}>
                      <Ionicons
                        name="navigate-circle-outline"
                        size={18}
                        color="#0F6C7B"
                      />
                      <Text style={styles.liveTrackingTitle}>
                        Live Tracking
                      </Text>
                    </View>

                    <Text style={styles.liveTrackingStatusTitle}>
                      {selectedTripTracking?.title}
                    </Text>

                    {selectedTripTracking?.subtitle ? (
                      <Text style={styles.liveTrackingStatusSubtitle}>
                        {selectedTripTracking.subtitle}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.trackButton,
                        !selectedTripTracking?.trackable &&
                          styles.trackButtonDisabled,
                      ]}
                      activeOpacity={0.8}
                      disabled={!selectedTripTracking?.trackable}
                      onPress={() => {
                        const trip = selectedTrip;
                        setSelectedTrip(null);
                        setTimeout(() => {
                          if (trip) handleTrackFerry(trip);
                        }, 150);
                      }}
                    >
                      <Ionicons
                        name="map-outline"
                        size={16}
                        color={
                          selectedTripTracking?.trackable ? "#fff" : "#999"
                        }
                      />
                      <Text
                        style={[
                          styles.trackButtonText,
                          !selectedTripTracking?.trackable &&
                            styles.trackButtonTextDisabled,
                        ]}
                      >
                        Track Ferry on Map
                      </Text>
                    </TouchableOpacity>

                    {selectedTripTracking?.trackable && (
                      <Text style={styles.liveTrackingFootnote}>
                        Map updates are fetched only while this trip is active.
                      </Text>
                    )}
                  </View>

                  <View style={styles.tripMetaRow}>
                    <Text style={styles.tripMetaText}>
                      Duration:{" "}
                      {calculateDuration(
                        selectedTrip.departureTime,
                        getArrivalTime(
                          selectedTrip.departure,
                          selectedTrip.destination,
                          selectedTrip.departureTime,
                        ) ?? selectedTrip.departureTime,
                      )}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#fff",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  fixedHeader: {
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 16,
    textAlign: "center",
  },
  tabsWrapper: {
    paddingRight: 16,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: "#000",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  activeTabText: {
    color: "#fff",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#aaa",
  },
  activeToggleText: {
    color: "#000",
    fontWeight: "700",
  },
  sectionHeader: {
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginTop: 0,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8e8e8",
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  timeChip: {
    position: "relative",
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderColor: "#e8e8e8",
    width: "48.8%",
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipNext: {
    borderColor: "#2E7D32",
    borderWidth: 1.5,
    backgroundColor: "#F1FBF1",
  },
  cardBadgeRow: {
    position: "absolute",
    top: -8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 2,
  },
  nextBadge: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  nextBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EAF8FA",
    borderColor: "#B9E3EA",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveBadgeText: {
    color: "#0F6C7B",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  timeChipText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 2,
  },
  timeChipTextNext: {
    color: "#1B5E20",
    fontWeight: "700",
  },
  arrivalText: {
    color: "#aaa",
    fontSize: 11,
    marginBottom: 2,
  },
  destinationText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#bbb",
    fontSize: 14,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: "#000",
    fontWeight: "500",
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f2f2f2",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#555",
  },
  selectedDropdownText: {
    color: "#000",
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkboxText: {
    fontSize: 13,
    color: "#aaa",
    fontWeight: "500",
  },
  checkboxTextActive: {
    color: "#000",
    fontWeight: "600",
  },
  providerText: {
    fontSize: 10,
    color: "#888",
    fontWeight: "500",
    marginTop: 1,
  },
  signatureContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  signatureText: {
    fontSize: 10,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#444",
  },
  routeContainer: {
    marginTop: 8,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  routeWrapper: {
    paddingLeft: 8,
  },
  routeNode: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
  },
  routeNodeContent: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    zIndex: 2,
  },
  verticalLine: {
    position: "absolute",
    left: 4,
    top: -22,
    bottom: 5,
    width: 2,
    backgroundColor: "#ddd",
    zIndex: 1,
  },
  nodeText: {
    fontSize: 15,
    color: "#444",
  },
  nodeTime: {
    fontSize: 13,
    color: "#2B7A8E",
    fontWeight: "600",
  },
  liveTrackingContainer: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#F7FBFC",
    borderWidth: 1,
    borderColor: "#E3EFF2",
    padding: 14,
    gap: 8,
  },
  liveTrackingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveTrackingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#184A54",
  },
  liveTrackingStatusTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#244047",
  },
  liveTrackingStatusSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6A7E84",
  },
  trackButton: {
    marginTop: 4,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0F6C7B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trackButtonDisabled: {
    backgroundColor: "#F0F2F4",
    borderWidth: 1,
    borderColor: "#E1E6EA",
  },
  trackButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  trackButtonTextDisabled: {
    color: "#999",
  },
  liveTrackingFootnote: {
    fontSize: 12,
    color: "#6A7E84",
  },
  tripMetaRow: {
    marginTop: 2,
  },
  tripMetaText: {
    fontSize: 13,
    color: "#7A7A7A",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#2B7A8E",
  },
  weekStripContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#eee",
  },
  weekStripMonth: {
    fontSize: 11,
    color: "#3B82F6",
    fontWeight: "500",
    marginBottom: 1,
    paddingHorizontal: 10,
  },
  weekStripToday: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2196F3",
    paddingHorizontal: 10,
  },
  weekStripDayCol: {
    width: 45,
    alignItems: "center",
    paddingVertical: 4,
  },
  weekStripDayName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },
  weekStripWeekend: {
    color: "#3B82F6",
  },
  weekStripDayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  weekStripDaySelected: {
    backgroundColor: "#E8F0FE",
  },
  weekStripDayNum: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },
  weekStripDayNumSelected: {
    color: "#3B82F6",
    fontWeight: "800",
  },
  weekStripTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3B82F6",
    marginTop: 2,
  },
});
