import type { ReactNode } from 'react';
import { Text as NativeText, StyleSheet } from 'react-native';

import { colors, fontFamily, fontSize } from '@/ui/theme';

type TextProps = {
  variant?: 'heading' | 'body';
  children: ReactNode;
};

export function Text({ variant = 'body', children }: TextProps) {
  return (
    <NativeText
      accessibilityRole={variant === 'heading' ? 'header' : undefined}
      style={styles[variant]}>
      {children}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.ink,
    fontFamily: fontFamily.heading,
    fontSize: fontSize.heading,
  },
  body: {
    color: colors.ink,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
});
