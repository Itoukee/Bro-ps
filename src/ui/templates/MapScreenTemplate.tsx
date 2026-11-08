import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, outline, spacing } from '@/ui/theme';

type MapScreenTemplateProps = {
  header: ReactNode;
  map: ReactNode;
  sheet: ReactNode;
};

export function MapScreenTemplate({ header, map, sheet }: MapScreenTemplateProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>{header}</View>
      <View style={styles.map}>{map}</View>
      <View style={styles.sheet}>{sheet}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  map: {
    flex: 1,
    backgroundColor: colors.mint,
    borderTopWidth: outline.width,
    borderColor: colors.ink,
  },
  // Tucks the rounded top of the sheet over the map.
  sheet: {
    marginTop: -outline.radius,
  },
});
