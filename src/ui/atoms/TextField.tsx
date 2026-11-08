import type { ComponentProps } from 'react';
import { Text as NativeText, StyleSheet, TextInput, View } from 'react-native';

import { colors, fontFamily, fontSize, outline, spacing, touchTarget } from '@/ui/theme';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
} & Pick<
  ComponentProps<typeof TextInput>,
  'autoCapitalize' | 'autoComplete' | 'keyboardType' | 'maxLength'
>;

export function TextField({ label, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.field}>
      {/* The input carries the same label, so screen readers skip this one. */}
      <NativeText importantForAccessibility="no" style={styles.label}>
        {label}
      </NativeText>
      <TextInput
        accessibilityLabel={label}
        autoCorrect={false}
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.ink,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
  input: {
    minHeight: touchTarget.standard,
    paddingHorizontal: spacing.md,
    borderWidth: outline.width,
    borderRadius: outline.radius,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
});
