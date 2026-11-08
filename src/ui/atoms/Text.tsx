import type { ReactNode } from 'react';
import { Text as NativeText, StyleSheet } from 'react-native';

import { colors, fontFamily, fontSize } from '@/ui/theme';

type TextProps = {
  variant?: 'heading' | 'title' | 'body';
  /** Reads the text out as soon as it appears. For messages that follow an action. */
  announce?: boolean;
  children: ReactNode;
};

export function Text({ variant = 'body', announce = false, children }: TextProps) {
  return (
    <NativeText
      accessibilityRole={variant !== 'body' ? 'header' : announce ? 'alert' : undefined}
      accessibilityLiveRegion={announce ? 'polite' : undefined}
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
  title: {
    color: colors.ink,
    fontFamily: fontFamily.heading,
    fontSize: fontSize.title,
  },
  body: {
    color: colors.ink,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
});
