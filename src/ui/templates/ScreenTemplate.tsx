import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/ui/theme';

type ScreenTemplateProps = {
  children: ReactNode;
  /** For screens that can be taller than the phone, such as the Dot picker. */
  scrollable?: boolean;
};

export function ScreenTemplate({ children, scrollable = false }: ScreenTemplateProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {scrollable ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  content: {
    gap: spacing.sm,
  },
});
