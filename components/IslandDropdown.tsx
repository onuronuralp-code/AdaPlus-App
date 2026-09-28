import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type IslandDropdownOption = {
  value: string;
  label: string;
};

type IslandDropdownProps = {
  options: IslandDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  isDark?: boolean;
  menuTop?: number;
  compact?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
  triggerLabel?: string;
};

export function IslandDropdown({
  options,
  value,
  onChange,
  isDark = false,
  menuTop,
  compact = false,
  fullWidth = false,
  iconOnly = false,
  triggerLabel,
}: IslandDropdownProps) {
  const [visible, setVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const selected = options.find(option => option.value === value) ?? options[0];

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const screen = Dimensions.get('window');
      const menuHeight = Math.min(options.length * 42 + 12, screen.height - 32);
      const calculatedTop = y + height + 6 + menuHeight <= screen.height - 16
        ? y + height + 6
        : Math.max(16, y - menuHeight - 6);
      const menuWidth = fullWidth ? width : Math.max(190, width);

      setMenuPosition({
        top: menuTop ?? calculatedTop,
        left: menuTop === undefined
          ? Math.max(16, Math.min(x, screen.width - menuWidth - 16))
          : screen.width - menuWidth - 16,
        width: menuWidth,
      });
      setVisible(true);
    });
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={[
          styles.trigger,
          compact && styles.triggerCompact,
          fullWidth && styles.triggerFullWidth,
          iconOnly && styles.triggerIconOnly,
          isDark && !iconOnly && styles.triggerDark,
        ]}
        onPress={openMenu}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Ada seçimi: ${selected?.label ?? ''}`}
      >
        <IconSymbol
          name="mappin.circle.fill"
          size={iconOnly ? 25 : 15}
          color="#3B82F6"
        />
        {!iconOnly && (
          <>
            <Text
              style={[styles.triggerText, isDark && styles.textLight]}
              numberOfLines={1}
            >
              {triggerLabel ?? selected?.label}
            </Text>
            <IconSymbol name="chevron.down" size={14} color={isDark ? '#94A3B8' : '#64748B'} />
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View
            style={[
              styles.menu,
              menuPosition ?? { top: menuTop ?? 70, right: 16 },
              isDark && styles.menuDark,
            ]}
          >
            {options.map(option => {
              const active = option.value === value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    active && styles.optionActive,
                    isDark && !active && styles.optionDark,
                  ]}
                  onPress={() => {
                    onChange(option.value);
                    setVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    name={active ? 'checkmark.circle.fill' : 'mappin.circle.fill'}
                    size={18}
                    color={active ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')}
                  />
                  <Text style={[
                    styles.optionText,
                    isDark && styles.textLight,
                    active && styles.optionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: 132,
    maxWidth: 160,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 11,
  },
  triggerCompact: {
    minWidth: 120,
    maxWidth: 140,
    height: 36,
    paddingHorizontal: 8,
  },
  triggerFullWidth: {
    width: '100%',
    maxWidth: '100%',
    height: 48,
    paddingHorizontal: 14,
  },
  triggerIconOnly: {
    minWidth: 44,
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  triggerDark: {
    backgroundColor: '#1C1C1E',
    borderColor: '#2C2C2E',
  },
  triggerText: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  textLight: {
    color: '#F8FAFC',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  menu: {
    position: 'absolute',
    right: 16,
    width: 190,
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },
  menuDark: {
    backgroundColor: '#18181B',
    borderColor: '#2C2C2E',
  },
  option: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 11,
    borderRadius: 9,
  },
  optionDark: {
    backgroundColor: '#18181B',
  },
  optionActive: {
    backgroundColor: '#3B82F6',
  },
  optionText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
