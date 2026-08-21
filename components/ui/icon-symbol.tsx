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
  'chevron.down': 'expand-more',
  'map': 'map',
  // Below are added map targets to align SFSymbol to MaterialIcons
  'sun.max.fill': 'wb-sunny',
  'cloud.fill': 'cloud',
  'cloud.rain.fill': 'water-drop',
  'figure.walk': 'hiking',
  'fork.knife': 'restaurant',
  'building.columns.fill': 'museum', // Used for Mosque and other grand buildings
  'cup.and.saucer.fill': 'local-cafe',
  'leaf.fill': 'eco', // eco or park
  'tree.fill': 'park', // Tree / Gardener
  'tree': 'park',
  'flower': 'local-florist',
  'flower.fill': 'local-florist',
  'sprout': 'grass',
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
  'megaphone.fill': 'campaign', // For Megaphone / Announcements
  'megaphone': 'campaign',
  'doc.text.fill': 'menu-book', // For Restaurant Menus
  'info.circle.fill': 'info', // For Information and Details
  
  // Agora Forum icons
  'plus': 'add',
  'chevron.left': 'chevron-left',
  'mappin.and.ellipse': 'location-on',
  'bubble.left.fill': 'chat',
  'bubble.left': 'chat-bubble-outline',
  'heart.fill': 'favorite',
  'heart': 'favorite-border',
  'person.fill': 'person',
  'star.fill': 'star',
  'star': 'star-border',
  'person.badge.plus': 'person-add',
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
  'trash.fill': 'delete',
  'exclamationmark.triangle.fill': 'warning',
  'bubble.left.and.bubble.right': 'chat',
  'mappin.circle.fill': 'location-on',
  'safari.fill': 'explore',
  'checkmark.circle.fill': 'check-circle',
  'apple.logo': 'apple',
  'arrow.clockwise': 'refresh',
  'scope': 'my-location',
  'tag.fill': 'local-offer',
  'ticket.fill': 'local-activity',
  'person.3.fill': 'groups',
  'person.2.fill': 'group',
  'lock.fill': 'lock',
  'phone.fill': 'phone',
  'exclamationmark.circle.fill': 'error',
  'calendar.badge.exclamationmark': 'event-busy',
  'doc.text.magnifyingglass': 'find-in-page',
  'arrow.uturn.left.circle.fill': 'reply',
  'bolt.car.fill': 'electric-car',
  'car.fill': 'directions-car',
  'archivebox.fill': 'inventory',
  'wrench.and.screwdriver.fill': 'build',
  'paintbrush.fill': 'format-paint',
  'paintpalette.fill': 'format-paint',
  'slider.horizontal.3': 'tune',
  'pawprint.fill': 'pets',
  'cat.fill': 'pets',
  'cat': 'pets',
  'bag.fill': 'shopping-bag',
  'beach.umbrella.fill': 'beach-access',
  'building.2.fill': 'location-city',
  'arrow.left.and.right': 'swap-horiz',
  'arrow.right.arrow.left': 'compare-arrows',
  'clock.fill': 'access-time',
  'briefcase.fill': 'work',
  'gearshape.fill': 'settings',
  'rectangle.portrait.and.arrow.right': 'logout',
  'person.circle.fill': 'account-circle',
  'person.crop.circle.badge.exclamationmark': 'person-off',
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
