import { Pressable, StyleSheet, View } from 'react-native';

import { colors, outline, spacing, touchTarget } from '@/ui/theme';

type ColorSwatchProps = {
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
};

export function ColorSwatch({ label, color, selected, onPress }: ColorSwatchProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.swatch, { backgroundColor: color }]}>
      {/* The selection never depends on seeing the color alone. */}
      {selected && <View style={styles.mark} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swatch: {
    minWidth: touchTarget.standard,
    minHeight: touchTarget.standard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: outline.width,
    borderRadius: touchTarget.standard / 2,
    borderColor: colors.ink,
  },
  mark: {
    width: spacing.md,
    height: spacing.md,
    borderRadius: spacing.md / 2,
    borderWidth: outline.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
});
