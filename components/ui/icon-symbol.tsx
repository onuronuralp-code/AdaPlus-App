// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'calendar': 'calendar-today',
  'safari': 'explore', // Compass-like icon
  'restaurant': 'restaurant',
  'directions-bus': 'directions-bus',
  'camera-alt': 'camera-alt',
  'chat': 'chat-bubble-outline',
  'sunny': 'wb-sunny',
  'boat': 'directions-boat',
  'ferry': 'directions-boat',
  'chevron.up': 'expand-less',
  'map': 'map',
  // Below are added map targets to align SFSymbol to MaterialIcons
  'sun.max.fill': 'beach-access',
  'figure.walk': 'hiking',
  'fork.knife': 'restaurant',
  'building.columns.fill': 'museum', // Used for Mosque and other grand buildings
  'cup.and.saucer.fill': 'local-cafe',
  'leaf.fill': 'eco', // eco or park
  'camera.fill': 'camera-alt',
  'graduationcap.fill': 'school',
  'bicycle': 'directions-bike',
  'sailboat.fill': 'sailing',
  'bed.double.fill': 'hotel',
  'bus.fill': 'directions-bus',
  'map.fill': 'map',
  'bubble.left.and.bubble.right.fill': 'forum',
  // Landmark specific icons
  'cross.fill': 'church', // For Orthodox and Armenian Churches
  'mountain.2.fill': 'landscape', // For Monastery on the hill
  'ferry.fill': 'directions-boat', // For the Pier
  'bell.fill': 'notifications', // For Notifications
  'doc.text.fill': 'menu-book', // For Restaurant Menus
  'info.circle.fill': 'info', // For Information and Details
  
  // Agora Forum icons
  'plus': 'add',
  'chevron.left': 'chevron-left',
  'bubble.left.fill': 'chat',
  'heart.fill': 'favorite',
  'heart': 'favorite-border',
  'person.fill': 'person',
  'envelope.fill': 'mail',
  'ellipsis': 'more-horiz',
  'square.and.arrow.up': 'share',
  'globe': 'language',
  'sparkles': 'auto-awesome',
  'sunset.fill': 'brightness-high',
  'thermometer.medium': 'thermostat',
  'wind': 'air',
  'square.grid.2x2.fill': 'grid-view',
  'flame.fill': 'local-fire-department',
  'chart.bar.fill': 'bar-chart',
  'chart.pie.fill': 'pie-chart',
  'pencil': 'edit',
  'pencil.tip': 'draw',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'exclamationmark.triangle.fill': 'warning',
  'bubble.left.and.bubble.right': 'chat',
  'mappin.circle.fill': 'location-on',
  'safari.fill': 'explore',
  'megaphone.fill': 'campaign',
  'checkmark.circle.fill': 'check-circle',
  'apple.logo': 'apple',
  'arrow.clockwise': 'refresh',
  'scope': 'my-location',
  'tag.fill': 'local-offer',
  'ticket.fill': 'local-activity',
  'person.3.fill': 'groups',
  'phone.fill': 'phone',
  'exclamationmark.circle.fill': 'error',
  'calendar.badge.exclamationmark': 'event-busy',
  'doc.text.magnifyingglass': 'find-in-page',
  'arrow.uturn.left.circle.fill': 'reply',
} as Partial<IconMapping>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
