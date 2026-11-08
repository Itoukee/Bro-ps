import { Text as NativeText, Pressable, StyleSheet } from 'react-native';

import { colors, fontFamily, fontSize, outline, spacing, touchTarget } from '@/ui/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  /** Use "riding" for controls pressed with gloves on. */
  size?: 'standard' | 'riding';
  busy?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'standard',
  busy = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.button, styles[variant], size === 'riding' && styles.riding, busy && styles.busy]}>
      <NativeText style={styles.label}>{label}</NativeText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touchTarget.standard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: outline.width,
    borderRadius: outline.radius,
    borderColor: colors.ink,
  },
  primary: {
    backgroundColor: colors.yellow,
  },
  secondary: {
    backgroundColor: colors.white,
  },
  riding: {
    minHeight: touchTarget.riding,
  },
  busy: {
    opacity: 0.6,
  },
  label: {
    color: colors.ink,
    fontFamily: fontFamily.heading,
    fontSize: fontSize.body,
  },
});
