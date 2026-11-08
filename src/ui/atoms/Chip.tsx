import { Text as NativeText, Pressable, StyleSheet } from 'react-native';

import { colors, fontFamily, fontSize, outline, spacing, touchTarget } from '@/ui/theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}>
      <NativeText style={styles.label}>{label}</NativeText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget.riding,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: outline.width,
    borderRadius: outline.radius,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  selected: {
    backgroundColor: colors.yellow,
  },
  label: {
    color: colors.ink,
    fontFamily: fontFamily.heading,
    fontSize: fontSize.body,
  },
});
